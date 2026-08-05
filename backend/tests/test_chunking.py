from app.services.chunking import chunk_text


def test_chunk_text_overlaps() -> None:
    text = " ".join(str(index) for index in range(300))
    chunks = chunk_text(text, chunk_size=120, overlap=20)

    assert len(chunks) > 1
    assert chunks[0].end_char > chunks[1].start_char


def test_chunk_text_empty() -> None:
    assert chunk_text("   ") == []
