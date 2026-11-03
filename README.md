# Darkroom

A photo editor that runs in your browser and does the real work on a server. Upload a photo; rotate, crop, resize, filter, watermark and convert it with a live preview; apply once; download the result.

**Live: [darkroom-ishan.vercel.app](https://darkroom-ishan.vercel.app)** · [![CI](https://github.com/zeroTwoishan/image-processing-service/actions/workflows/ci.yml/badge.svg)](https://github.com/zeroTwoishan/image-processing-service/actions/workflows/ci.yml)

![The landing page and its live product shot, the gallery, the editor applying a rotation, grayscale and a watermark, then a version wiped against its original](docs/demo.webp)

> The API runs on Render's free plan and sleeps after 15 idle minutes, so the first request can take about a minute.

This is the [Image Processing Service](https://roadmap.sh/projects/image-processing-service) project from roadmap.sh: a small Cloudinary, with an Express + MongoDB API and a React frontend.

## What it does

- **Edits stay non-destructive.** The original is never changed: each Apply saves a new *version*, and the before/after view compares it with the original.
- **Live preview, one Apply.** Every edit previews instantly in the browser (CSS transforms and filters, a drag-to-crop box), and the server makes the real file only when you press Apply.
- **Rotate, flip, crop, resize, grayscale, sepia, text watermark,** and conversion to JPEG, PNG, WebP or AVIF with a quality setting.
- **Privacy:** location and camera data (EXIF/GPS) are removed on upload, and every photo and its versions are deleted 12 hours after upload.
- **Try it without an account:** logged-out visitors get the same editor at `/`, with a sample photo. Their photo is edited and sent straight back; nothing is stored.
- **Accounts:** sign up, a gallery with pages, rename in place, download, delete.
- **Works on phones:** the photo stays on screen while the tools switch underneath it.

| Landing page | Gallery |
| --- | --- |
| ![The landing page: "Edit photos in your browser" above a big upload zone](docs/landing.png) | ![The gallery of photos and versions in justified rows, each with its expiry timer](docs/gallery.png) |

| Editor (desktop) | Before / after | Editor (phone) |
| --- | --- | --- |
| ![The editor with a crop box, sepia filter and watermark previewed live](docs/editor.png) | ![A grayscale version wiped against its original](docs/compare.png) | ![The phone editor with the photo on top and tool tabs at the bottom](docs/phone-editor.png) |

## How it works

```mermaid
flowchart LR
  user(["Browser"])
  subgraph vercel["Vercel"]
    web["React 19 + Vite<br/>live preview with CSS"]
  end
  subgraph render["Render (Docker)"]
    direction TB
    mw["helmet · CORS · rate limit<br/>JWT auth · Zod validation"]
    sharp["Sharp pipeline<br/>orient → rotate → flip → crop<br/>→ resize → filters → watermark → encode"]
    job["Cleanup job, every hour<br/>files first, then rows"]
    mw --> sharp
  end
  atlas[("MongoDB Atlas<br/>users · photo rows · cache keys")]
  bucket[("Supabase Storage<br/>image files, UUID names")]

  user --> web
  web -- "HTTPS + Bearer JWT" --> mw
  sharp --> atlas
  sharp --> bucket
  job --> bucket
  job --> atlas
  user -. "img src (public URL)" .-> bucket
```

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser
  participant A as Express API
  participant M as MongoDB
  participant S as Sharp
  participant F as Storage
  B->>A: POST /api/images/:id/transform { transformations }
  A->>A: JWT · rate limit (10/min per user) · Zod
  A->>M: find version by sha256(photo + edits)
  alt already made
    M-->>A: existing version
    A-->>B: 200 { image }
  else new edit
    A->>F: read the original
    A->>S: applyTransform(buffer, edits)
    S-->>A: new bytes + thumbnail
    A->>F: save both (random UUID keys)
    A->>M: insert the version row (unique cache key)
    A-->>B: 201 { image }
  end
```

One request, start to finish: **Apply** sends `POST /api/images/:id/transform` with the edits as JSON. The API checks the token, the per-user rate limit and the edits (Zod), then fingerprints *photo + edits* with sha256. If that version already exists it comes straight back. Otherwise Sharp builds it in a fixed pipeline (orient → rotate → flip → crop → resize → filters → watermark → encode), and the file, a thumbnail and a database row are saved.

Decisions worth a second look:

| Decision | Why |
| --- | --- |
| Mongo stores **storage keys**, never URLs | URLs are built from one setting when data is sent out, so the app moved storage providers four times with zero database changes. |
| One **storage interface** (`save` / `get` / `remove` / `list`) | Local disk in development, Supabase in production; a shared test runs against both. |
| **Unique partial index** on the cache key | Two identical requests at the same moment can't both save: the loser gets a duplicate-key error, deletes its files and returns the winner's version. |
| A **pure** `applyTransform(buffer, edits)` | No Express or database inside, so it's tested with bytes alone. |
| Cleanup deletes **files first, then rows** | A crash halfway leaves rows that still point at their files, so the next run finishes the job. A second sweep removes old files no row points to. |
| **Rate limits** per IP for login, per user for transforms | A shared college network shouldn't lock everyone out because one person is busy. |
| Public files with **random UUID names** | Images load in plain `<img>` tags; nobody can guess a URL, and the bucket can't be listed. |
| Validated **settings at startup** | A missing setting stops the deploy with a clear message instead of failing a user's upload later. |

## API

All routes live under `/api`; every `/images` route needs `Authorization: Bearer <token>` (`/guest` doesn't). Errors always look like `{ "error": { "code", "message", "details?" } }`.

| Method | Path | Does |
| --- | --- | --- |
| `POST` | `/register`, `/login` | Create an account / log in → `{ user, token }`. 5 attempts a minute per IP |
| `GET` | `/me` | The logged-in user |
| `POST` | `/images` | Upload (multipart field `image`, ≤ 10 MB, ≤ 25 MP; JPEG, PNG, WebP, GIF, AVIF) |
| `GET` | `/images?page=1&limit=10` | Your photos, newest first, with `pagination` |
| `GET` | `/images/:id` | One photo plus its versions |
| `POST` | `/images/:id/transform` | `{ transformations }` → `201` new version, or `200` if it already exists. 10 a minute per user |
| `PATCH` | `/images/:id` | Rename (`{ name }`; the server adds the real extension) |
| `DELETE` | `/images/:id` | Delete a photo and its versions, or one version |
| `POST` | `/guest/transform` | No login: multipart `image` + `transformations` (JSON text) → the edited image's bytes; nothing stored. 5 a minute per IP |
| `GET` | `/health/live`, `/health/ready` | Process up / database reachable |

```json
{ "transformations": {
    "rotate": 90, "flip": true, "mirror": false,
    "crop": { "x": 0, "y": 0, "width": 400, "height": 300 },
    "resize": { "width": 800, "height": 600 },
    "filters": { "grayscale": false, "sepia": true },
    "watermark": { "text": "@ishan" },
    "format": "webp", "compress": { "quality": 75 }
} }
```

Error codes: `VALIDATION_FAILED`, `INVALID_TRANSFORM`, `INVALID_CROP`, `TRANSFORM_ON_VERSION` (400), `UNSUPPORTED_FILE` (400), `FILE_TOO_LARGE` (413), `UNAUTHORIZED` (401), `NOT_FOUND` (404), `USERNAME_TAKEN` (409), `RATE_LIMITED` (429, with `Retry-After`), `INTERNAL` (500).

## Run it locally

You need Node 24 and Docker Desktop (for MongoDB).

```bash
git clone https://github.com/zeroTwoishan/image-processing-service.git
cd image-processing-service
npm install && npm install --prefix server && npm install --prefix client
cp server/.env.example server/.env      # then set JWT_SECRET (the file says how)
docker compose up -d                     # MongoDB on localhost:27017
npm run dev                              # API on :4000, app on http://localhost:5173
```

Files go to `server/uploads/` by default. To use an S3-compatible bucket instead, set `STORAGE_DRIVER=s3` and the `S3_*` values described in `server/.env.example`.

**Tests:**

| Layer | Command | What it covers |
| --- | --- | --- |
| API | `npm test` in `server/` | Vitest + Supertest against a separate test database; 130+ tests |
| Client logic | `npm test` in `client/` | node:test for the transform maths and the sign-up nudge |
| End to end | `npm run test:e2e` at the root | Playwright drives a real browser through the real stack: a guest editing the sample photo and downloading it, and a user's whole journey (sign up → upload → edit → version → download → the same edit returning the cached version → delete → log out → log back in). Plus the phone layout and a refused file |

The end-to-end run starts its own API and Vite on spare ports (4100 and 5174) with their own database and upload folder, so it never touches your dev data. Once: `npx playwright install chromium`. Then, with Docker running, `npm run test:e2e` (or `npm run test:e2e:ui` to watch it click through). GitHub Actions runs all three on every push; when an end-to-end test fails, the run keeps a report with a screenshot and a step-by-step trace.

## Known tradeoffs

- **The login token lives in localStorage,** so an XSS bug could read it. Accepted because the site and the API are on different domains, where cookies would need `SameSite=None`, credentialed CORS and CSRF protection.
- **Photos are deleted after 12 hours.** Download what you want to keep. In return, storage can't fill up and nobody's photos sit on a server.
- **A deleted photo can stay reachable through the CDN for up to an hour.** Supabase's free plan doesn't purge the CDN when a file is deleted, so files are cached for 1 hour at most.
- **Animated GIF/AVIF:** an edit uses the first frame and returns a still image.
- **No versions of versions:** edits always start from the original ("Edit from original" carries a version's edits over).
- **Rate-limit counters live in memory:** they reset on restart and assume one server. A shared store such as Redis would be the next step at scale.
- **Edits run inside the request:** the 10 MB / 25 MP limits keep each one to about a second, so a job queue wasn't needed.

## Built with

Express 5 · MongoDB + Mongoose · Sharp · Zod · JWT + bcrypt · express-rate-limit · React 19 · Vite · Tailwind CSS 4 · Motion · React Router · Vitest + Supertest · Playwright · Docker · GitHub Actions · Render · Vercel · MongoDB Atlas · Supabase Storage
