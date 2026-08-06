import hashlib
import math
import re

VECTOR_DIMENSIONS = 96


def embed_texts(texts: list[str]) -> list[list[float]]:
    return [embed_text(text) for text in texts]


def embed_text(text: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSIONS
    tokens = re.findall(r"[a-zA-Z0-9][a-zA-Z0-9'-]{1,}", text.lower())
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:2], "big") % VECTOR_DIMENSIONS
        sign = 1 if digest[2] % 2 == 0 else -1
        vector[bucket] += sign
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / magnitude, 6) for value in vector]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 0.0
    limit = min(len(left), len(right))
    return sum(left[index] * right[index] for index in range(limit))
