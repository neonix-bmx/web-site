# Content Schemas

All JSON files are stored under `/var/berrymx/data` (or `data/` in repo).

## Projects (`projects.json`)
Fields:
- `title` (required)
- `summary`
- `year`
- `status`
- `stack` (array or comma-separated string)

Example:
```json
{
  "title": "Neon Vitrin",
  "summary": "Neon grid vitrin deneyimi.",
  "year": "2025",
  "status": "Live",
  "stack": ["Node", "React", "Postgres"]
}
```

## Software / Portfoy (`software.json`)
Fields:
- `name` (required)
- `type`
- `status`
- `downloadUrl`

Example:
```json
{
  "name": "Pulse API",
  "type": "Platform",
  "status": "Stable",
  "downloadUrl": "/downloads/pulse-api.zip"
}
```

## News / Duyurular (`news.json`)
Fields:
- `title` (required)
- `date`
- `slug`
- `summary`
- SEO: `metaTitle`, `metaDescription`, `ogImage`, `ogVideo`, `ogVideoType`, `canonical`

## About (`about.json`)
Singleton fields:
- `hero` (title, lead, chips)
- `tiles.focus` (kicker, badge, title, body)
- `tiles.stats` (kicker, badge, title, stats[])

## Pages (`pages.json`)
Singleton structured content for each page via `data-content` bindings.

## SEO (`seo.json`)
Global fields (title, description, ogImage, etc) + per-page overrides:
```json
{
  "title": "BerryMX | Neon Metro UI",
  "description": "Neon grid studio",
  "pages": {
    "projects": {
      "title": "BerryMX | Projeler",
      "description": "Projeler vitrini"
    }
  }
}
```

## Messages (`messages.json`)
Stored contact form messages:
```json
{
  "name": "Ad Soyad",
  "email": "mail@example.com",
  "message": "Proje notu",
  "phone": "0534 658 34 48"
}
```
