# BerryMX Neon Metro UI

Modern neon MetroUI inspired landing page with tile grid navigation.

## Features
- Neon purple + dark pink theme
- Tile grid for projects, software, news, about, contact
- Frontend pulls data from `/api` with `/data` JSON fallback
- Admin API protected with SSH signature verification

## Structure
- `index.html`
- `styles.css`
- `app.js`
- `data/`
  - `projects.json`
  - `software.json`
  - `news.json`
- `server/`
  - `index.js`
  - `allowed_signers`

## Quick Start (static)
Open `index.html` directly or run:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## API Server
Run the local server:

```bash
node server/index.js
```

Then open `http://localhost:3000`.

Public endpoints:
- `GET /api/projects`
- `GET /api/software`
- `GET /api/news`

Admin endpoints:
- `POST /api/projects`
- `POST /api/software`
- `POST /api/news`

## SSH Admin Auth
Admin requests are verified by `ssh-keygen -Y verify`. Add your public key to
`server/allowed_signers`.

Example allowed signers line:

```
berrymx-admin ssh-ed25519 AAAA... berrymx-admin@local
```

Signing flow:
1. Prepare the request body, hash it, and build the signed message:

```bash
BODY='{"title":"Nova Grid","status":"Live","year":"2024","stack":["Node","React"]}'
BODY_SHA=$(printf "%s" "$BODY" | sha256sum | awk '{print $1}')
TS=$(date +%s)
printf "%s\n" "POST\n/api/projects\n$TS\n$BODY_SHA" > /tmp/berrymx-message
ssh-keygen -Y sign -f ~/.ssh/id_ed25519 -n berrymx-api /tmp/berrymx-message
SIG_B64=$(base64 -w 0 /tmp/berrymx-message.sig)
```

2. Send the signed request:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "X-SSH-Key-Id: berrymx-admin" \
  -H "X-SSH-Timestamp: $TS" \
  -H "X-SSH-Signature: $SIG_B64" \
  -d "$BODY"
```

## Config
- `PORT` (default: `3000`)
- `SSH_NAMESPACE` (default: `berrymx-api`)
