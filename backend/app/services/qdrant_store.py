from uuid import NAMESPACE_URL, uuid5

from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams

from app.config import get_settings
from app.services.embeddings import VECTOR_DIMENSIONS


def upsert_chunks(document_id: str, chunks: list[tuple[int, str, list[float]]]) -> None:
    settings = get_settings()
    if not settings.qdrant_url:
        return

    client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    existing = {collection.name for collection in client.get_collections().collections}
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=VECTOR_DIMENSIONS, distance=Distance.COSINE),
        )

    points = [
        PointStruct(
            id=str(uuid5(NAMESPACE_URL, f"{document_id}:{index}")),
            vector=embedding,
            payload={"document_id": document_id, "chunk_index": index, "text": text[:1200]},
        )
        for index, text, embedding in chunks
    ]
    if points:
        client.upsert(collection_name=settings.qdrant_collection, points=points)
