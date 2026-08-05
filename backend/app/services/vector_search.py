from app.schemas.search import SearchResult


def semantic_search(query: str, document_ids: list[str] | None = None) -> list[SearchResult]:
    return [
        SearchResult(
            document_id="demo-document",
            document_name="Contract_2024_05_14.pdf",
            page_or_section="Page 7 • Termination",
            excerpt="The termination clause requires written notice and lists cure periods by breach type.",
            score=0.89,
        ),
        SearchResult(
            document_id="demo-document-2",
            document_name="Marketing_Brief_Q2.docx",
            page_or_section="Section 3 • Budget",
            excerpt="The campaign budget is split between paid search, lifecycle email, and partner webinars.",
            score=0.82,
        ),
    ]
