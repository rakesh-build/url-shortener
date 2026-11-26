# URL Shortener

A small, self-contained URL shortener built with **Next.js 16 (App Router)**, **React 19**, **TypeScript** and **Tailwind CSS 4**. Links are stored in a local JSON file, so there is no database to set up.

## Features

- **Shorten links** from the home page, with an optional custom alias (3–32 chars: letters, numbers, `-`, `_`).
- **Collision-safe codes**: 7-character base62 codes from `crypto.randomBytes`, re-rolled on collision (and grown in length if the space gets crowded). Reserved paths like `stats` and `api` can't be used.
- **Expiry dates**: optional expiry date/time (with 1 hour / 1 day / 7 days / 30 days presets). After it passes, `/<code>` stops redirecting and shows a clean "Link expired" page with HTTP `410 Gone`; expired visits aren't counted as clicks. Expiry must be a valid future date within 10 years.
- **URL validation**: only `http://` and `https://` URLs are accepted (max 2048 chars).
- **301 redirects** at `/<code>`. Each hit increments the click count and logs the timestamp, referrer and user agent. Unknown codes return `404`.
- **Analytics** at `/stats`: total links, total clicks, active/expired counts, and per-link click counts with an Active/Expired badge, expiry date and the 5 most recent clicks.
- **JSON file store** at `data/links.json`, written atomically (temp file + rename) behind an in-process lock so concurrent clicks are never lost.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

### Environment (optional)

| Variable   | Purpose                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `DISPLAY_TIMEZONE` | Time zone for dates on `/stats` and the expired page. Defaults to `Asia/Kolkata`. |
| `BASE_URL` | Origin used for generated short links, e.g. `https://s.buildwithrakesh.com`. Defaults to the request origin. |

## API

### `POST /api/links`

```bash
curl -X POST http://localhost:3000/api/links \
  -H 'content-type: application/json' \
  -d '{"url":"https://buildwithrakesh.com","alias":"rakesh","expiresAt":"2026-12-31T18:30:00Z"}'
```

`201` response:

```json
{ "code": "rakesh", "url": "https://buildwithrakesh.com/", "shortUrl": "http://localhost:3000/rakesh", "createdAt": "...", "expiresAt": "2026-12-31T18:30:00.000Z" }
```

`alias` and `expiresAt` (ISO date) are optional. Errors: `400` (invalid URL, bad or reserved alias, invalid/past expiry) and `409` (alias taken), with `{ "error": "..." }`.

### `GET /<code>`

`301` redirect to the original URL (sent with `cache-control: no-store` so browsers don't cache it and skip the click count), an HTML "Link expired" page with `410` once the link has expired, or an HTML `404` page for unknown codes.

## Data format

```json
{
  "abc1234": {
    "url": "https://example.com/",
    "createdAt": "2026-11-26T00:00:00.000Z",
    "clicks": 1,
    "clickLog": [{ "at": "...", "referrer": "https://x.com/", "userAgent": "..." }],
    "expiresAt": null
  }
}
```

`expiresAt` is optional; older entries without it never expire. The click log keeps the latest 100 entries per link. `data/*.json` is git-ignored.

## Project structure

```
src/
  app/
    page.tsx              # home: shorten form
    [code]/route.ts       # 301 redirect + click logging
    api/links/route.ts    # create short links
    stats/page.tsx        # analytics
  components/
    ShortenForm.tsx       # client form
    Nav.tsx
  lib/
    store.ts              # JSON store, code generation, validation, expiry
    statusPage.ts         # HTML pages for expired (410) and unknown (404) links
data/links.json           # created on first link
```

## Notes and next steps

- The JSON store suits a single server process (e.g. one PM2 instance on a VPS). For several instances or serverless hosting, swap `src/lib/store.ts` for SQLite/Postgres/Redis; the API stays the same.
- Ideas: QR codes, delete/edit links, per-day click charts, and auth for `/stats`.
