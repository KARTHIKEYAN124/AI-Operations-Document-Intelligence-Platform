# API Endpoint List

## Auth

- `POST /api/auth/register` - create user account
- `POST /api/auth/login` - issue JWT access token
- `GET /api/auth/me` - return current user

## Documents

- `POST /api/documents/upload` - validate and enqueue document processing
- `GET /api/documents` - list user documents
- `GET /api/documents/{document_id}` - get document metadata and status
- `DELETE /api/documents/{document_id}` - delete document and vectors

## Analysis

- `GET /api/analysis/{document_id}` - get analysis report
- `POST /api/analysis/{document_id}/rerun` - rerun analysis pipeline

## Search

- `POST /api/search` - semantic search across accessible documents
- `POST /api/search/ask` - answer a question with retrieved citations

## Admin

- `GET /api/admin/users` - list users
- `PATCH /api/admin/users/{user_id}` - update role or active state
- `GET /api/admin/documents` - list all documents
- `GET /api/admin/audit-logs` - list audit events
