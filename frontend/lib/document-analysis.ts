export type SignalTone = "ai" | "human" | "neutral";

export type AnalysisSignal = {
  name: string;
  value: number;
  rating: "Low" | "Typical" | "High" | "Unavailable";
  explanation: string;
  tone: SignalTone;
};

export type KeyValue = {
  label: string;
  value: string;
};

export type TextChunk = {
  id: string;
  section: string;
  text: string;
  score?: number;
};

export type AnalyzedDocument = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: "Analysis ready" | "Needs review";
  uploadedAt: string;
  documentType: string;
  aiLikelihood: number;
  uncertainty: number;
  confidence: "Low" | "Moderate" | "High";
  wordCount: number;
  characterCount: number;
  keyInformation: KeyValue[];
  signals: AnalysisSignal[];
  extractedText: string;
  chunks: TextChunk[];
  limitations: string[];
};

export type AnalyzeResponse =
  | {
      ok: true;
      document: AnalyzedDocument;
    }
  | {
      ok: false;
      error: string;
    };

const WORD_RE = /[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g;

export function analyzePlainText(input: {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  text: string;
  limitations?: string[];
}): AnalyzedDocument {
  const extractedText = normalizeText(input.text);
  const words = extractedText.match(WORD_RE) ?? [];
  const baseDocument = {
    id: input.id,
    filename: input.filename,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    uploadedAt: new Date().toISOString(),
    documentType: classifyDocument(input.filename, extractedText),
    wordCount: words.length,
    characterCount: extractedText.length,
    keyInformation: extractKeyInformation(input.filename, extractedText, words.length),
    extractedText,
    chunks: chunkText(extractedText),
    limitations: input.limitations ?? []
  };

  if (words.length === 0) {
    return {
      ...baseDocument,
      status: "Needs review",
      aiLikelihood: 0,
      uncertainty: 0,
      confidence: "Low",
      signals: noExtractedTextSignals()
    };
  }

  const sentences = extractedText
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const sentenceLengths = sentences.map((sentence) => (sentence.match(WORD_RE) ?? []).length).filter(Boolean);
  const averageLength = average(sentenceLengths);
  const variation = standardDeviation(sentenceLengths);
  const lexicalDiversity = new Set(words.map((word) => word.toLowerCase())).size / Math.max(words.length, 1);
  const repetitionRate = repeatedWordRate(words);
  const paragraphConsistency = paragraphStructureConsistency(extractedText);
  const transitionRate = transitionPatternRate(extractedText);
  const predictability = clamp(1 - variation / Math.max(averageLength * 1.6, 14), 0, 1);

  const aiLikelihood = clamp(
    predictability * 0.28 +
      repetitionRate * 0.23 +
      (1 - lexicalDiversity) * 0.2 +
      paragraphConsistency * 0.17 +
      transitionRate * 0.12,
    0.03,
    0.97
  );
  const uncertainty = clamp(0.08 + (words.length < 300 ? 0.16 : 0) + (sentences.length < 8 ? 0.08 : 0), 0.08, 0.32);

  return {
    ...baseDocument,
    status: extractedText.length > 0 ? "Analysis ready" : "Needs review",
    aiLikelihood: Math.round(aiLikelihood * 100),
    uncertainty: Math.round(uncertainty * 100),
    confidence: confidenceFromUncertainty(uncertainty, words.length),
    signals: [
      {
        name: "Sentence variation",
        value: Math.round((1 - predictability) * 100),
        rating: predictability > 0.72 ? "Low" : "Typical",
        tone: predictability > 0.72 ? "ai" : "human",
        explanation: predictability > 0.72 ? "Sentence lengths are unusually consistent." : "Sentence lengths vary within an expected range."
      },
      {
        name: "Lexical diversity",
        value: Math.round(lexicalDiversity * 100),
        rating: lexicalDiversity < 0.42 ? "Low" : "Typical",
        tone: lexicalDiversity < 0.42 ? "ai" : "human",
        explanation: lexicalDiversity < 0.42 ? "Vocabulary variety is limited for the sample length." : "Vocabulary variety does not strongly indicate generated writing."
      },
      {
        name: "Repetition",
        value: Math.round(repetitionRate * 100),
        rating: repetitionRate > 0.18 ? "High" : "Typical",
        tone: repetitionRate > 0.18 ? "ai" : "neutral",
        explanation: repetitionRate > 0.18 ? "Several terms or transitions repeat more often than expected." : "Repetition is not a dominant signal."
      },
      {
        name: "Paragraph consistency",
        value: Math.round(paragraphConsistency * 100),
        rating: paragraphConsistency > 0.68 ? "High" : "Typical",
        tone: paragraphConsistency > 0.68 ? "ai" : "neutral",
        explanation: paragraphConsistency > 0.68 ? "Paragraphs follow a very regular structure." : "Paragraph structure has normal variation."
      },
      {
        name: "Predictability",
        value: Math.round(predictability * 100),
        rating: predictability > 0.72 ? "High" : "Typical",
        tone: predictability > 0.72 ? "ai" : "human",
        explanation: predictability > 0.72 ? "The prose is more predictable than typical human baselines." : "The text has a balanced predictability profile."
      }
    ]
  };
}

export function searchDocuments(documents: AnalyzedDocument[], query: string): TextChunk[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  return documents
    .flatMap((document) =>
      document.chunks.map((chunk) => ({
        ...chunk,
        id: `${document.id}:${chunk.id}`,
        section: `${document.filename} - ${chunk.section}`,
        score: scoreText(chunk.text, terms)
      }))
    )
    .filter((chunk) => (chunk.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);
}

export function answerQuestion(document: AnalyzedDocument | undefined, question: string) {
  if (!document || question.trim().length === 0) {
    return null;
  }

  if (document.wordCount === 0 || document.chunks.length === 0) {
    return {
      answer: "This document does not have extracted text yet. Re-upload it from the Upload page so extraction/OCR can create searchable text before Q&A runs.",
      confidence: "Low",
      citation: undefined
    };
  }

  if (isSummaryQuestion(question)) {
    return {
      answer: summarizeDocument(document),
      confidence: document.wordCount >= 80 ? "Moderate" : "Low",
      citation: document.chunks[0]
    };
  }

  const terms = tokenize(question);
  if (terms.length === 0) {
    return {
      answer: summarizeDocument(document),
      confidence: document.wordCount >= 80 ? "Moderate" : "Low",
      citation: document.chunks[0]
    };
  }

  const best = document.chunks
    .map((chunk) => ({ ...chunk, score: scoreText(chunk.text, terms) }))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];

  if (!best || (best.score ?? 0) === 0) {
    const fallback = mostInformativeChunk(document);
    return {
      answer: `I could not find a strong exact match, but the most relevant available context says: ${clipText(fallback.text, 420)}`,
      confidence: "Low",
      citation: fallback
    };
  }

  const sentence = buildAnswerFromChunk(best.text, terms);

  return {
    answer: sentence,
    confidence: (best.score ?? 0) >= 0.35 ? "Moderate" : "Low",
    citation: best
  };
}

function normalizeText(text: string) {
  return text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function classifyDocument(filename: string, text: string) {
  const lower = `${filename} ${text}`.toLowerCase();
  if (/(invoice|amount due|subtotal|tax|payment terms)/.test(lower)) return "Invoice / financial document";
  if (/(policy|procedure|compliance|acceptable use|privacy)/.test(lower)) return "Policy / procedure document";
  if (/\b(agreement|contract|termination|party|whereas|obligation)\b/.test(lower)) return "Contract / legal document";
  if (/(resume|curriculum vitae|experience|education|skills)/.test(lower)) return "Resume / profile document";
  if (/(press release|announcement|media contact)/.test(lower)) return "Press release";
  if (/(research|methodology|findings|abstract|references)/.test(lower)) return "Research / report document";
  return "General document";
}

function extractKeyInformation(filename: string, text: string, wordCount: number): KeyValue[] {
  const date = text.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i)?.[0];
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const money = text.match(/(?:\$|USD\s*)\d[\d,]*(?:\.\d{2})?/i)?.[0];
  const title = firstMeaningfulLine(text) || filename;

  return [
    { label: "Title", value: title },
    { label: "Filename", value: filename },
    { label: "Detected date", value: date ?? "Not found" },
    { label: "Contact email", value: email ?? "Not found" },
    { label: "Amount", value: money ?? "Not found" },
    { label: "Word count", value: wordCount.toLocaleString() }
  ];
}

function firstMeaningfulLine(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length >= 8 && line.length <= 120);
}

function chunkText(text: string, size = 900, overlap = 140): TextChunk[] {
  if (!text) return [];
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      section: `Section ${chunks.length + 1}`,
      text: text.slice(start, end).trim()
    });
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

function noExtractedTextSignals(): AnalysisSignal[] {
  const unavailable = "Unavailable";
  return [
    {
      name: "Sentence variation",
      value: 0,
      rating: "Unavailable",
      tone: "neutral",
      explanation: `${unavailable}: no extracted text was available for sentence analysis.`
    },
    {
      name: "Lexical diversity",
      value: 0,
      rating: "Unavailable",
      tone: "neutral",
      explanation: `${unavailable}: no extracted words were available for vocabulary analysis.`
    },
    {
      name: "Repetition",
      value: 0,
      rating: "Unavailable",
      tone: "neutral",
      explanation: `${unavailable}: repetition cannot be measured without extracted text.`
    },
    {
      name: "Paragraph consistency",
      value: 0,
      rating: "Unavailable",
      tone: "neutral",
      explanation: `${unavailable}: paragraph structure cannot be measured without extracted text.`
    },
    {
      name: "Predictability",
      value: 0,
      rating: "Unavailable",
      tone: "neutral",
      explanation: `${unavailable}: predictability cannot be estimated without extracted text.`
    }
  ];
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      (value.toLowerCase().match(WORD_RE) ?? [])
        .map(normalizeToken)
        .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    )
  );
}

function scoreText(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  const words = new Set((lower.match(WORD_RE) ?? []).map(normalizeToken));
  const exactHits = terms.filter((term) => words.has(term)).length;
  const phraseHits = terms.filter((term) => lower.includes(term)).length;
  return terms.length === 0 ? 0 : (exactHits * 1.2 + phraseHits * 0.4) / (terms.length * 1.6);
}

function repeatedWordRate(words: string[]) {
  const counts = new Map<string, number>();
  for (const word of words.map((item) => item.toLowerCase()).filter((item) => item.length > 3)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const repeated = Array.from(counts.values()).filter((count) => count >= 4).reduce((sum, count) => sum + count, 0);
  return repeated / Math.max(words.length, 1);
}

function transitionPatternRate(text: string) {
  const transitions = ["furthermore", "moreover", "in conclusion", "additionally", "it is important", "overall", "therefore"];
  const lower = text.toLowerCase();
  return clamp(transitions.reduce((sum, phrase) => sum + countOccurrences(lower, phrase), 0) / Math.max(text.length / 1200, 1), 0, 1);
}

function paragraphStructureConsistency(text: string) {
  const paragraphs = text.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  const lengths = paragraphs.map((paragraph) => (paragraph.match(WORD_RE) ?? []).length).filter(Boolean);
  if (lengths.length < 3) return 0.35;
  const avg = average(lengths);
  const sd = standardDeviation(lengths);
  return clamp(1 - sd / Math.max(avg, 1), 0, 1);
}

function countOccurrences(text: string, phrase: string) {
  return text.split(phrase).length - 1;
}

function average(values: number[]) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) return 0;
  const avg = average(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length);
}

function confidenceFromUncertainty(uncertainty: number, wordCount: number): "Low" | "Moderate" | "High" {
  if (wordCount < 120 || uncertainty > 0.24) return "Low";
  if (uncertainty > 0.14) return "Moderate";
  return "High";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "can",
  "could",
  "does",
  "for",
  "from",
  "give",
  "has",
  "have",
  "how",
  "into",
  "its",
  "please",
  "show",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "would",
  "you"
]);

function normalizeToken(token: string) {
  return token.replace(/'s$/, "").replace(/(?:ing|ed|es|s)$/i, "");
}

function isSummaryQuestion(question: string) {
  return /\b(summarize|summary|overview|brief|main points?|key points?|gist)\b/i.test(question);
}

function summarizeDocument(document: AnalyzedDocument) {
  const title = document.keyInformation.find((item) => item.label === "Title")?.value;
  const firstChunk = mostInformativeChunk(document);
  const sentences = splitSentences(firstChunk.text).slice(0, 3);
  const summaryText = sentences.length > 0 ? sentences.join(" ") : clipText(firstChunk.text, 520);
  const prefix = title && title !== document.filename ? `${title}: ` : "";
  return `${prefix}${summaryText}`;
}

function mostInformativeChunk(document: AnalyzedDocument) {
  return [...document.chunks].sort((a, b) => informativeScore(b.text) - informativeScore(a.text))[0] ?? document.chunks[0];
}

function informativeScore(text: string) {
  const words = text.match(WORD_RE) ?? [];
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.length ?? 0;
  const numbers = text.match(/\b\d{2,}\b/g)?.length ?? 0;
  return words.length + emails * 20 + numbers * 4;
}

function buildAnswerFromChunk(text: string, terms: string[]) {
  const matching = splitSentences(text).filter((sentence) => scoreText(sentence, terms) > 0);
  const answer = matching.length > 0 ? matching.slice(0, 3).join(" ") : text;
  return clipText(answer, 620);
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|(?:\s-\s)|(?:\s\|\s)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 20);
}

function clipText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}
