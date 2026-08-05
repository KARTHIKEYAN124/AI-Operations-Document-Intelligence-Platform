"use client";

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  HelpCircle,
  Loader2,
  MessageSquareText,
  Search,
  ShieldCheck,
  UploadCloud
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  answerQuestion,
  searchDocuments,
  type AnalyzedDocument,
  type AnalyzeResponse,
  type TextChunk
} from "@/lib/document-analysis";
import { Badge, Card, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

type QueueItem = {
  id: string;
  filename: string;
  sizeBytes: number;
  status: "Uploading" | "Processing" | "Analysis ready" | "Needs review" | "Failed";
  progress: number;
  error?: string;
  document?: AnalyzedDocument;
};

const emptyTrend = [
  { label: "Words", value: 0 },
  { label: "Signals", value: 0 },
  { label: "Chunks", value: 0 }
];

export function Dashboard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof answerQuestion>>(null);
  const [isDragging, setIsDragging] = useState(false);

  const documents = useMemo(() => queue.flatMap((item) => (item.document ? [item.document] : [])), [queue]);
  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? documents[0],
    [documents, selectedId]
  );
  const searchResults = useMemo(() => searchDocuments(documents, searchQuery), [documents, searchQuery]);
  const readyCount = queue.filter((item) => item.status === "Analysis ready").length;
  const processingCount = queue.filter((item) => item.status === "Uploading" || item.status === "Processing").length;

  async function analyzeFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    for (const file of incoming) {
      const itemId = crypto.randomUUID();
      setQueue((current) => [
        {
          id: itemId,
          filename: file.name,
          sizeBytes: file.size,
          status: "Uploading",
          progress: 20
        },
        ...current
      ]);

      try {
        setQueue((current) => current.map((item) => (item.id === itemId ? { ...item, status: "Processing", progress: 58 } : item)));
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/analyze", { method: "POST", body: formData });
        const payload = (await response.json()) as AnalyzeResponse;

        if (!payload.ok) {
          throw new Error(payload.error);
        }

        setQueue((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: payload.document.status,
                  progress: 100,
                  document: payload.document
                }
              : item
          )
        );
        setSelectedId(payload.document.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Analysis failed.";
        setQueue((current) => current.map((item) => (item.id === itemId ? { ...item, status: "Failed", progress: 100, error: message } : item)));
      }
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void analyzeFiles(event.target.files);
      event.target.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      void analyzeFiles(event.dataTransfer.files);
    }
  }

  function submitQuestion() {
    setAnswer(answerQuestion(selectedDocument, question));
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f7fa]">
      <section className="sticky top-20 z-10 border-b border-line bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1720px] flex-wrap items-center gap-5 text-sm">
          <span className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            Live workspace
          </span>
          <span className="text-muted">{queue.length} uploaded</span>
          <span className="text-emerald-700">{readyCount} analysis ready</span>
          <span className="text-teal">{processingCount} processing</span>
          <span className="ml-auto flex items-center gap-2 text-xs text-muted">
            <ShieldCheck size={16} className="text-teal" />
            Files are analyzed in this app session. AI-writing detection is probabilistic.
          </span>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1720px] gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)_430px]">
        <UploadPanel
          inputRef={inputRef}
          queue={queue}
          selectedDocument={selectedDocument}
          isDragging={isDragging}
          onBrowse={() => inputRef.current?.click()}
          onFileChange={onInputChange}
          onDrop={onDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onSelect={(document) => setSelectedId(document.id)}
        />
        <AnalysisPanel document={selectedDocument} />
        <InsightPanel
          document={selectedDocument}
          question={question}
          setQuestion={setQuestion}
          answer={answer}
          submitQuestion={submitQuestion}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
        />
      </div>
    </div>
  );
}

function UploadPanel({
  inputRef,
  queue,
  selectedDocument,
  isDragging,
  onBrowse,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onSelect
}: Readonly<{
  inputRef: React.RefObject<HTMLInputElement | null>;
  queue: QueueItem[];
  selectedDocument: AnalyzedDocument | undefined;
  isDragging: boolean;
  onBrowse: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onSelect: (document: AnalyzedDocument) => void;
}>) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line p-5">
        <h1 className="text-xl font-bold">Upload documents</h1>
        <p className="mt-1 text-sm text-muted">Drop files to analyze document type, text, key fields, and AI-writing probability.</p>
      </div>

      <div className="p-5">
        <label
          className={cn(
            "focus-ring grid min-h-[260px] cursor-pointer place-items-center rounded-lg border border-dashed p-6 text-center transition",
            isDragging ? "border-teal bg-teal/10" : "border-teal/60 bg-white hover:bg-teal/5"
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input ref={inputRef} className="hidden" type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} />
          <span>
            <UploadCloud className="mx-auto text-teal" size={54} strokeWidth={1.8} />
            <span className="mt-5 block text-lg font-semibold">Drop files to analyze</span>
            <span className="mt-2 block text-sm text-muted">PDF, DOCX, TXT, Markdown, PNG, JPG, TIFF</span>
            <button type="button" className="focus-ring mt-5 rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm" onClick={onBrowse}>
              Browse files
            </button>
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-sm font-bold">File queue</h2>
          <span className="text-xs text-muted">{queue.length || "No"} files</span>
        </div>
        <div className="mt-3 space-y-3">
          {queue.length === 0 ? (
            <EmptyQueue />
          ) : (
            queue.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "focus-ring w-full rounded-lg border bg-white p-3 text-left transition hover:border-teal/60",
                  selectedDocument?.id === item.document?.id ? "border-teal shadow-panel" : "border-line"
                )}
                onClick={() => item.document && onSelect(item.document)}
              >
                <div className="flex items-start gap-3">
                  <FileText className={item.status === "Failed" ? "text-red-500" : "text-teal"} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.filename}</p>
                    <p className="mt-1 text-xs text-muted">{formatBytes(item.sizeBytes)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <ProgressBar value={item.progress} tone={item.status === "Failed" ? "amber" : item.status === "Analysis ready" ? "green" : "teal"} />
                      <span className="w-20 text-right text-xs font-medium">{item.status}</span>
                    </div>
                    {item.error ? <p className="mt-2 text-xs text-red-600">{item.error}</p> : null}
                  </div>
                  {item.status === "Processing" || item.status === "Uploading" ? (
                    <Loader2 className="animate-spin text-teal" size={18} />
                  ) : item.status === "Analysis ready" ? (
                    <CheckCircle2 className="text-emerald-600" size={18} />
                  ) : (
                    <AlertTriangle className="text-red-500" size={18} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}

function AnalysisPanel({ document }: Readonly<{ document: AnalyzedDocument | undefined }>) {
  if (!document) {
    return (
      <Card className="min-h-[720px] p-8">
        <div className="mx-auto grid h-full max-w-2xl content-center text-center">
          <FileText className="mx-auto text-teal" size={56} strokeWidth={1.6} />
          <h2 className="mt-5 text-2xl font-bold">Upload a document to start</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            The workspace will extract text, classify the file, identify key information, and estimate AI-writing likelihood with uncertainty.
          </p>
          <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
            {[
              ["Validate", "MIME type, size, empty content, and supported extensions."],
              ["Extract", "Text from TXT, Markdown, DOCX, and selectable PDFs."],
              ["Analyze", "Document type, key fields, writing-style signals, and chunks."]
            ].map(([title, body]) => (
              <div key={title} className="rounded-lg border border-line bg-slate-50 p-4">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-2 text-xs leading-5 text-muted">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-sm font-bold text-amber-800">AI detection note</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              The AI-writing score is a likelihood estimate with uncertainty and explanations. It should not be used as a definitive decision by itself.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const trend = [
    { label: "Words", value: document.wordCount },
    { label: "Signals", value: document.signals.length * 25 },
    { label: "Chunks", value: document.chunks.length * 80 }
  ];

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div className="flex items-start gap-4">
          <div className="grid size-12 place-items-center rounded bg-red-50 text-red-600">
            <FileText size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{document.filename}</h2>
            <p className="mt-1 text-sm text-muted">
              {formatBytes(document.sizeBytes)} - {document.wordCount.toLocaleString()} words - Uploaded {formatTime(document.uploadedAt)}
            </p>
          </div>
        </div>
        <button
          className="focus-ring flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => downloadText(document)}
        >
          <Download size={16} />
          Download text
        </button>
      </div>

      <div className="grid gap-5 p-5 2xl:grid-cols-[1fr_240px]">
        <div>
          <h3 className="text-sm font-bold">Document type</h3>
          <Badge tone="blue">{document.documentType}</Badge>

          <h3 className="mt-6 text-sm font-bold">Key information</h3>
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            {document.keyInformation.map((item) => (
              <div key={item.label} className="grid grid-cols-[160px_1fr] border-b border-line last:border-b-0">
                <div className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">{item.label}</div>
                <div className="px-4 py-3 text-sm">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-line p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Document shape</p>
          <div className="mt-4 h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend.length ? trend : emptyTrend} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <XAxis dataKey="label" hide />
                <YAxis hide />
                <Tooltip />
                <Area dataKey="value" stroke="#087f83" fill="#087f83" fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <Metric label="Characters" value={document.characterCount.toLocaleString()} />
            <Metric label="Chunks" value={document.chunks.length.toString()} />
          </div>
        </div>
      </div>

      <div className="border-t border-line p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">Extracted text</h3>
          <span className="text-xs text-muted">{document.extractedText ? "Parsed from upload" : "No extractable text"}</span>
        </div>
        <div className="max-h-[360px] overflow-auto rounded-lg border border-line bg-white p-4 text-sm leading-6 text-slate-700">
          {document.extractedText ? (
            <pre className="whitespace-pre-wrap font-sans">{document.extractedText}</pre>
          ) : (
            <div className="flex items-start gap-3 text-amber-700">
              <AlertTriangle size={18} />
              <p>{document.limitations[0] ?? "No text could be extracted from this file."}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function InsightPanel({
  document,
  question,
  setQuestion,
  answer,
  submitQuestion,
  searchQuery,
  setSearchQuery,
  searchResults
}: Readonly<{
  document: AnalyzedDocument | undefined;
  question: string;
  setQuestion: (value: string) => void;
  answer: ReturnType<typeof answerQuestion>;
  submitQuestion: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: TextChunk[];
}>) {
  const likelihood = document?.aiLikelihood ?? 0;
  const uncertainty = document?.uncertainty ?? 0;

  return (
    <div className="grid content-start gap-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold">AI-likelihood estimate</h2>
          <HelpCircle size={15} className="text-muted" />
        </div>
        <div className="mt-5 grid place-items-center">
          <div
            className="grid size-48 place-items-center rounded-full"
            style={{
              background: `conic-gradient(#d89000 ${likelihood * 3.6}deg, #e3e8ef 0deg)`
            }}
          >
            <div className="grid size-36 place-items-center rounded-full bg-white text-center">
              <span>
                <span className="block text-5xl font-bold text-amber">{likelihood}%</span>
                <span className="mt-1 block text-xs font-semibold text-slate-600">{document ? likelihoodLabel(likelihood) : "Awaiting upload"}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-lg bg-amber/10 px-3 py-2 text-sm">
          <span className="text-slate-700">Uncertainty</span>
          <span className="font-bold text-amber">+/-{uncertainty}%</span>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          This is a probability estimate from writing-style signals. It is not proof that text was or was not generated by AI.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-bold">Primary signals</h2>
        <div className="mt-4 space-y-4">
          {(document?.signals ?? []).map((signal) => (
            <div key={signal.name}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{signal.name}</span>
                <Badge tone={signal.tone === "ai" ? "amber" : signal.tone === "human" ? "green" : "neutral"}>{signal.rating}</Badge>
              </div>
              <div className="mt-2">
                <ProgressBar value={signal.value} tone={signal.tone === "ai" ? "amber" : signal.tone === "human" ? "green" : "teal"} />
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">{signal.explanation}</p>
            </div>
          ))}
          {!document ? <p className="text-sm text-muted">Upload a document to see signal explanations.</p> : null}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-base font-bold">Ask this document</h2>
        <div className="mt-4 flex gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-md border border-line px-3 text-sm outline-none focus:border-teal"
            value={question}
            placeholder="Ask about the selected file..."
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitQuestion();
            }}
          />
          <button className="focus-ring h-11 rounded-md bg-teal px-4 text-sm font-semibold text-white" onClick={submitQuestion} disabled={!document}>
            Ask
          </button>
        </div>
        {answer ? (
          <div className="mt-4 rounded-lg border border-line bg-slate-50 p-3">
            <p className="text-sm leading-6">{answer.answer}</p>
            <p className="mt-2 text-xs text-muted">Confidence: {answer.confidence} - Citation: {answer.citation?.section ?? "No citation"}</p>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Search uploaded documents</h2>
          <Filter size={17} className="text-muted" />
        </div>
        <label className="mt-4 flex h-11 items-center gap-2 rounded-md border border-line px-3">
          <Search size={17} className="text-muted" />
          <input
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
            value={searchQuery}
            placeholder="Keyword, topic, or filename..."
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <div className="mt-4 space-y-2">
          {searchResults.map((result) => (
            <article key={result.id} className="rounded-lg border border-line p-3">
              <p className="text-xs font-bold text-teal">{result.section}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{result.text}</p>
              <p className="mt-2 text-xs text-muted">Retrieval score {(result.score ?? 0).toFixed(2)}</p>
            </article>
          ))}
          {searchQuery && searchResults.length === 0 ? <p className="text-sm text-muted">No matching uploaded text yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-4 text-sm text-muted">
      Upload a file to create a processing record. Results stay in this browser session.
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function likelihoodLabel(value: number) {
  if (value >= 70) return "Higher AI association";
  if (value >= 45) return "Uncertain / mixed";
  return "Lower AI association";
}

function downloadText(document: AnalyzedDocument) {
  const blob = new Blob([document.extractedText], { type: "text/plain" });
  const href = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = href;
  anchor.download = `${document.filename}.txt`;
  anchor.click();
  URL.revokeObjectURL(href);
}
