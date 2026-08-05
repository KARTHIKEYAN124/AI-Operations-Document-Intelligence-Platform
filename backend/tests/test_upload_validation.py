from io import BytesIO

import pytest
from starlette.datastructures import UploadFile

from app.services.document_parser import validate_upload


@pytest.mark.anyio
async def test_validate_upload_rejects_empty_file() -> None:
    file = UploadFile(filename="empty.txt", file=BytesIO(b""), headers={"content-type": "text/plain"})
    result = await validate_upload(file)

    assert result.accepted is False
    assert result.reason == "Document is empty"
