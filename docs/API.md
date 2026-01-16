# API Guide

Base URL: `http://localhost:3000`

## Public endpoints
- `GET /api/projects`
- `GET /api/projects/:id`
- `GET /api/software`
- `GET /api/software/:id`
- `GET /api/news`
- `GET /api/news/:id`
- `GET /api/about`
- `GET /api/seo`
- `GET /api/pages`
- `GET /api/messages` (admin-only, requires SSH)
- `POST /api/messages` (public submit from contact form)

## Admin endpoints (SSH-signed)
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `POST /api/software`
- `PUT /api/software/:id`
- `DELETE /api/software/:id`
- `POST /api/news`
- `PUT /api/news/:id`
- `DELETE /api/news/:id`
- `PUT /api/about`
- `PUT /api/seo`
- `PUT /api/pages`

## SSH Auth headers
Every admin request must include:
- `X-SSH-Key-Id`
- `X-SSH-Timestamp`
- `X-SSH-Signature` (base64)

Signed message format:
```
METHOD
/api/resource[/id]
TIMESTAMP
BODY_SHA256
```

For empty bodies (DELETE), use the SHA-256 of an empty string.
