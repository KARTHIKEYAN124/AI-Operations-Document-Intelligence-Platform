def embed_texts(texts: list[str]) -> list[list[float]]:
    return [[float((hash(token) % 100) / 100) for token in text.split()[:16]] for text in texts]
