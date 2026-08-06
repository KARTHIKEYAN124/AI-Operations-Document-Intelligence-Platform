from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient

from app.database.session import init_db
from app.main import app


def test_authenticated_document_workflow() -> None:
    init_db()
    client = TestClient(app)
    email = f"user-{uuid4()}@example.com"

    register = client.post("/api/auth/register", json={"email": email, "password": "Password123!", "confirm_password": "Password123!"})
    assert register.status_code == 201

    login = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    file_content = b"This invoice is for document intelligence services. Amount due is $1,200.00. Payment terms are net 30 days."
    upload = client.post(
        "/api/documents/upload",
        headers=headers,
        files={"file": ("invoice.txt", BytesIO(file_content), "text/plain")},
    )
    assert upload.status_code == 202
    document_id = upload.json()["document_id"]

    analysis = client.get(f"/api/analysis/{document_id}", headers=headers)
    assert analysis.status_code == 200
    assert analysis.json()["document_type"] == "Invoice / financial document"

    search = client.post("/api/search", headers=headers, json={"query": "payment terms"})
    assert search.status_code == 200
    assert search.json()

    answer = client.post("/api/search/ask", headers=headers, json={"question": "What are the payment terms?"})
    assert answer.status_code == 200
    assert answer.json()["citations"]

    delete = client.delete(f"/api/documents/{document_id}", headers=headers)
    assert delete.status_code == 204
