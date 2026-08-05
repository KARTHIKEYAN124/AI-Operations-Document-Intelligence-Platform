from app.services.ai_detector import estimate_ai_likelihood


def test_estimate_ai_likelihood_returns_probability() -> None:
    result = estimate_ai_likelihood("doc-1", "This is a sentence. This is another sentence.")

    assert 0 <= result.ai_likelihood <= 1
    assert result.caveat
