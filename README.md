# BerryMX Neon Metro UI

Multi-page neon Metro UI site with tile grid navigation and SSH-signed admin API.

## Features
- Neon purple + dark pink theme
- Tile grid for projects, software, news, about, contact
- Frontend pulls data from `/api` with `/data` JSON fallback
- Admin API protected with SSH signature verification
- Admin web UI for SEO, pages, projects, and software
- Site-wide and per-page SEO metadata via `/api/seo` (image/video supported)
- Page copy editable via `/api/pages`
- Contact form posts stored via `/api/messages`

## Structure
- `index.html`
- `projects.html`
- `software.html`
- `news.html`
- `about.html`
- `contact.html`
- `admin.html`
- `admin.js`
- `styles.css`
- `app.js`
- `package.json`
- `data/`
  - `projects.json`
  - `software.json`
  - `news.json`
  - `about.json`
  - `seo.json`
  - `pages.json`
- `server/`
  - `index.js`
  - `allowed_signers`
- `docs/`
  - `README.md`
  - `ADMIN.md`
  - `API.md`
  - `CONTENT.md`
  - `DEPLOYMENT.md`
  - `PAYMENT-POS.md`
  - `LEGAL-MESAFELI-SATIS.md`
  - `LEGAL-IPTAL-IADE.md`

## Admin Storage
Default admin storage root: `/var/berrymx`
- Data: `/var/berrymx/data`
- SSH signers: `/var/berrymx/keys/allowed_signers`

If `/var/berrymx` is not writable and no explicit admin path is set, the server
falls back to `/var/tmp/berrymx`.

You can override locations with:
- `BERRYMX_ADMIN_ROOT`
- `BERRYMX_DATA_DIR`
- `BERRYMX_KEYS_DIR`
- `BERRYMX_ALLOWED_SIGNERS`

## /var Setup
To provision `/var/berrymx` with data, env config, and SSH keys:

```bash
sudo ./scripts/setup-var.sh
```

Note: the script copies JSON files only if they do not exist.
If you want a fresh empty projects list, remove `/var/berrymx/data/projects.json`
and rerun the script.

## Quick Start (static)
Open `index.html` directly or run:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## NPM Scripts
```bash
npm run static   # static file server
npm run dev      # node api + static assets
```

## API Server
Run the local server:

```bash
node server/index.js
```

Then open `http://localhost:3000`.

Public endpoints:
- `GET /api/projects`
- `GET /api/projects/:id`
- `GET /api/software`
- `GET /api/software/:id`
- `GET /api/news`
- `GET /api/news/:id`
- `GET /api/about`
- `GET /api/seo`
- `GET /api/pages`
- `GET /api/messages`

Admin endpoints:
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

Public submit:
- `POST /api/messages`

## Admin Panel (Web UI)
Open `admin.html` from the local server (for Web Crypto support, use `http://localhost`):

1. Click `Yukle` to pull the current payload.
2. Edit the JSON.
3. Click `Timestamp` and sign the message shown in the box.
4. Paste the base64 signature into the form and submit.

For edit forms:
- Fill `ID` with the item id from the list.
- The signed path must include the id (example: `/api/projects/<id>`).

## SSH Admin Auth
Admin requests are verified by `ssh-keygen -Y verify`. Add your public key to
`/var/berrymx/keys/allowed_signers`.
You can copy the template from `server/allowed_signers`.

Example allowed signers line:

```
berrymx-admin ssh-ed25519 AAAA... berrymx-admin@local
```

Signing flow:
1. Prepare the request body, hash it, and build the signed message:

```bash
BODY='{"title":"Neon Vitrin","status":"Live","year":"2025","stack":["Node","React"]}'
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

Note: For `PUT` and `DELETE`, the signed path must include the id.
For `DELETE` with no body, sign the hash of an empty string.

For `PUT /api/about`, sign the exact `/api/about` path.
For `PUT /api/seo`, sign the exact `/api/seo` path.
For `PUT /api/pages`, sign the exact `/api/pages` path.

## Content Guide
Projects (`/api/projects`):
- `title` (required), `summary`, `year`, `status`, `stack` (array or comma-separated)

Software / Portfoy (`/api/software`):
- `name` (required), `type`, `status`, `downloadUrl`

Duyurular (`/api/news`):
- `title` (required), `date`, `slug`, `summary`
- SEO fields: `metaTitle`, `metaDescription`, `ogImage`, `ogVideo`, `ogVideoType`, `canonical`

Mesajlar (`/api/messages`):
- `name`, `email`, `message`, `phone` (optional)

## SEO Payload
`/api/seo` accepts global fields and per-page overrides:

```json
{
  "title": "BerryMX | Neon Metro UI",
  "description": "Neon metro UI inspired studio.",
  "ogImage": "/images/berrymx.png",
  "ogVideo": "/media/intro.mp4",
  "ogVideoType": "video/mp4",
  "pages": {
    "projects": {
      "title": "BerryMX | Projeler",
      "description": "Projects showcase and case studies."
    }
  }
}
```

To preview news-level SEO, open `news.html?slug=your-slug`.

## Pages Payload
`/api/pages` lets you update page copy used by the `data-content` bindings.

## Config
- `PORT` (default: `3000`)
- `SSH_NAMESPACE` (default: `berrymx-api`)
- `BERRYMX_ADMIN_ROOT` (default: `/var/berrymx`)
- `BERRYMX_DATA_DIR` (default: `/var/berrymx/data`)
- `BERRYMX_KEYS_DIR` (default: `/var/berrymx/keys`)
- `BERRYMX_ALLOWED_SIGNERS` (default: `/var/berrymx/keys/allowed_signers`)
