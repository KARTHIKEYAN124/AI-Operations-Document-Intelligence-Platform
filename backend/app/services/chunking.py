from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    index: int
    text: str
    start_char: int
    end_char: int


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> list[TextChunk]:
    clean = " ".join(text.split())
    if not clean:
        return []
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")

    chunks: list[TextChunk] = []
    start = 0
    index = 0
    while start < len(clean):
        end = min(start + chunk_size, len(clean))
        chunks.append(TextChunk(index=index, text=clean[start:end], start_char=start, end_char=end))
        if end == len(clean):
            break
        start = end - overlap
        index += 1
    return chunks
