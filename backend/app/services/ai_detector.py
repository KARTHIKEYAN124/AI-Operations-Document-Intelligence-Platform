import statistics
import re
from collections import Counter

from app.schemas.analysis import AnalysisResponse, Signal


def estimate_ai_likelihood(document_id: str, text: str) -> AnalysisResponse:
    sentences = [part.strip() for part in text.replace("?", ".").replace("!", ".").split(".") if part.strip()]
    words = [word.strip(".,:;()[]{}\"'").lower() for word in text.split() if word.strip()]

    sentence_lengths = [len(sentence.split()) for sentence in sentences] or [0]
    variation = statistics.pstdev(sentence_lengths) if len(sentence_lengths) > 1 else 0
    lexical_diversity = len(set(words)) / max(1, len(words))
    repeated_terms = sum(count for count in Counter(words).values() if count > 2) / max(1, len(words))

    predictability = max(0.0, min(1.0, 1 - (variation / 18)))
    repetition = max(0.0, min(1.0, repeated_terms * 2.5))
    diversity_signal = max(0.0, min(1.0, 1 - lexical_diversity))
    paragraph_lengths = [len(paragraph.split()) for paragraph in re.split(r"\n\s*\n", text) if paragraph.strip()]
    paragraph_variation = statistics.pstdev(paragraph_lengths) if len(paragraph_lengths) > 1 else 0
    paragraph_consistency = max(0.0, min(1.0, 1 - (paragraph_variation / 80)))
    likelihood = round((predictability * 0.35) + (repetition * 0.2) + (diversity_signal * 0.25) + (paragraph_consistency * 0.2), 2)
    uncertainty = 0.34 if len(words) < 120 else 0.2 if len(words) < 500 else 0.12

    return AnalysisResponse(
        document_id=document_id,
        document_type=classify_document("", text),
        ai_likelihood=likelihood,
        uncertainty=uncertainty,
        confidence="Moderate" if len(words) >= 120 and 0.35 <= likelihood <= 0.85 else "Low",
        primary_signals=[
            Signal(name="sentence-length variation", value=round(1 - min(1, variation / 18), 2), explanation="Lower variation can indicate more uniform generated prose."),
            Signal(name="lexical diversity", value=round(lexical_diversity, 2), explanation="Diversity is compared with expected range for the document type."),
            Signal(name="repetition", value=round(repetition, 2), explanation="Repeated terms and transitions are treated as one signal among several."),
            Signal(name="paragraph consistency", value=round(paragraph_consistency, 2), explanation="Highly consistent paragraph shape can increase the estimate."),
            Signal(name="predictability", value=round(predictability, 2), explanation="Predictable sentence structure is one probabilistic writing-style signal."),
        ],
        caveat="AI-writing analysis is probabilistic and should not be treated as perfectly accurate.",
    )


def classify_document(filename: str, text: str) -> str:
    haystack = f"{filename}\n{text[:3000]}".lower()
    if any(term in haystack for term in ["resume", "curriculum vitae", "experience", "skills", "education"]):
        return "Resume / profile document"
    if any(term in haystack for term in ["invoice", "amount due", "subtotal", "tax", "payment terms"]):
        return "Invoice / financial document"
    if any(term in haystack for term in ["agreement", "contract", "party", "termination", "governing law"]):
        return "Contract / legal document"
    if any(term in haystack for term in ["abstract", "references", "methodology", "conclusion"]):
        return "Research / report document"
    return "General business document"


def extract_key_information(filename: str, text: str) -> dict[str, str | int]:
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text)
    amount = re.search(r"(?:\$|USD\s*)\s?\d[\d,]*(?:\.\d{2})?", text, flags=re.IGNORECASE)
    date = re.search(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b", text)
    first_line = next((line.strip() for line in text.splitlines() if line.strip()), filename)
    return {
        "title": first_line[:120],
        "filename": filename,
        "detected_date": date.group(0) if date else "Not found",
        "contact_email": email.group(0) if email else "Not found",
        "amount": amount.group(0) if amount else "Not found",
        "word_count": len(text.split()),
    }
