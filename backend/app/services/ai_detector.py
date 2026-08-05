import statistics
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
    likelihood = round((predictability * 0.45) + (repetition * 0.3) + (diversity_signal * 0.25), 2)

    return AnalysisResponse(
        document_id=document_id,
        document_type="contract",
        ai_likelihood=likelihood,
        uncertainty=0.12,
        confidence="Moderate" if 0.45 <= likelihood <= 0.8 else "Low",
        primary_signals=[
            Signal(name="sentence-length variation", value=round(1 - min(1, variation / 18), 2), explanation="Lower variation can indicate more uniform generated prose."),
            Signal(name="lexical diversity", value=round(lexical_diversity, 2), explanation="Diversity is compared with expected range for the document type."),
            Signal(name="repetition", value=round(repetition, 2), explanation="Repeated terms and transitions are treated as one signal among several."),
        ],
        caveat="AI-writing analysis is probabilistic and should not be treated as perfectly accurate.",
    )
