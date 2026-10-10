# Image Processing Service — Build Plan

Last updated: 2026-10-10 · Owner: Ishan · This file is the source of truth for the project. Working rules for Claude Code are in `CLAUDE.md`; history is in `CHANGELOG.md`.

## Overview

We're building a mini Cloudinary: the [roadmap.sh Image Processing Service](https://roadmap.sh/projects/image-processing-service) backend, plus our own React frontend so people can actually use it. Users sign up, upload images, apply edits (resize, crop, rotate, watermark, flip, mirror, compress, format change, grayscale/sepia), and browse their gallery.

**Goals**

- Cover every roadmap.sh requirement: JWT auth, upload, transform, retrieve, paginated list.
- Learn the production pieces: cloud storage, caching, rate limiting and scheduled cleanup.
- Ship a clean UI with a live transform editor, deployed and good enough for the resume and the portfolio.
- Build in phases, so there's something working at the end of each one.

## Tech stack

We're using JavaScript end to end: Express on the backend, React + Vite + Tailwind on the frontend, and Docker for the infrastructure services.

| Layer | Choice | Why |
| --- | --- | --- |
| API | Node 24 LTS + Express 5 | Simple and quick to write; Express 5 passes async errors to the error handler on its own |
| Database | MongoDB + Mongoose | Holds users, image metadata, and the transform cache (a `cacheKey` on each version) |
| Image processing | Sharp ≥ 0.34 | Covers every required transform; 0.34 added `.autoOrient()`. Runs directly inside the API |
| Auth | JWT (7-day) in localStorage + bcrypt | Frontend and API are on different origins, so cookies would need SameSite=None, credentialed CORS and CSRF handling |
| Validation | Zod | Validates request bodies, and env vars at boot |
| Uploads | Multer (memory storage) | Hands Sharp a buffer to inspect before anything is saved |
| File storage | Local disk → Cloudflare R2 | Mongo stores storage keys only; URLs are built from an env base |
| Rate limiting | express-rate-limit, in-memory store | One package, no extra server; fine because we run a single API instance |
| Transform cache | MongoDB unique index on `cacheKey` | A repeated transform returns the existing version; the index also blocks duplicates from parallel requests |
| Queue | None | Sharp is fast enough to run in the request |
| Frontend | React 19 + Vite + Tailwind 4 + React Router | Same base as CineScope |
| Dev infra | Docker Compose for Mongo only; Node runs on the host | Volume-mounted `node_modules` with a native dependency like Sharp is a common source of breakage |
| Dev runner | Root `package.json` + concurrently | `npm run dev` starts the server and the client together |
| Container image | `node:24-bookworm-slim` + fontconfig + fonts-dejavu-core | glibc for Sharp, plus fonts so watermark text renders in Docker |

## Architecture

Everything runs in one Express process, backed by MongoDB and file storage. The API checks the token, the rate limit and the input, then does the work. All image work goes through one pure function, `applyTransform(buffer, transformations)`, so it can be tested on its own without a server or a database.

```
              ┌────────────────────────────────────┐
              │ React client (Vite + Tailwind)     │
              │ on Vercel                          │
              └─────────────────┬──────────────────┘
                                │ HTTPS + Bearer JWT
┌───────────────────────────────▼───────────────────────────────┐
│ Express API (one process)                                     │
│ JWT auth → rate limit (in-memory) → Zod validate → controller │
│ applyTransform(buffer, t) with Sharp, run inside the request  │
│ hourly cleanup job deletes images past expiresAt (12 h)       │
└───────────────┬───────────────────────────────┬───────────────┘
                │                               │
   ┌────────────▼─────────────┐    ┌────────────▼─────────────┐
   │ MongoDB                  │    │ File storage             │
   │ users, image metadata    │    │ local disk → R2          │
   │ unique cacheKey index    │    │ originals, versions,     │
   │ (= transform cache)      │    │ thumbnails               │
   └──────────────────────────┘    └──────────────────────────┘
```

Rate-limit counters live in the API's memory, and the transform cache is a unique `cacheKey` field on each saved version in MongoDB.

## Folder structure

It's one repo, `image-processing-service/`, with the API in `server/` and the React app in `client/`.

```
image-processing-service/    # lives in Projects/ next to the other projects
├── PLAN.md                   # this plan (source of truth)
├── CLAUDE.md                 # how we work together
├── CHANGELOG.md              # dated history of plan changes
├── package.json              # root: concurrently → `npm run dev` starts server + client
├── docker-compose.yml        # mongo ONLY (Node runs on the host in dev)
├── README.md                 # setup, API table, known tradeoffs (localStorage / XSS)
├── server/
│   ├── .env.example
│   ├── Dockerfile            # node:24-bookworm-slim + fontconfig + fonts-dejavu-core
│   ├── uploads/              # local storage (phases 2-3); files named by random UUID
│   ├── vitest.config.js      # test env: separate test database, dummy JWT_SECRET
│   ├── test/                 # Vitest + Supertest, from Phase 1
│   └── src/
│       ├── index.js          # validate env, connect, listen, graceful shutdown
│       ├── app.js            # createApp(): express app, middleware, rate limiters, routes
│       ├── config/           # env.js (Zod-validated), db.js
│       ├── models/           # User.js, Image.js (toJSON: _id → id, no __v, URLs built here)
│       ├── middleware/       # auth, upload, validate, rateLimit (express-rate-limit), errorHandler
│       ├── routes/           # health, auth, image
│       ├── controllers/      # auth, image
│       ├── services/
│       │   ├── storage/      # index.js, localStorage.js, s3Storage.js (phase 4)
│       │   ├── transform.js  # applyTransform(buffer, t) → { buffer, meta } — pure
│       │   ├── thumbnail.js  # ~400px WebP on upload
│       │   └── cache.js      # no-op in phase 3, Mongo cacheKey lookup in phase 5
│       └── utils/            # ApiError.js (with error codes), schemas.js, escapeXml.js
└── client/
    ├── vite.config.js        # proxies /api and /uploads to :4000
    └── src/
        ├── main.jsx, App.jsx
        ├── lib/api.js        # fetch wrapper + JWT, throws errors carrying `code`
        ├── context/AuthContext.jsx
        ├── components/       # Navbar, ProtectedRoute, UploadDropzone, ImageCard, Pagination, TransformPanel
        └── pages/            # Login, Register, Gallery, ImageDetail, NotFound
```

## API contract

All routes live under `/api`, and every `/images` route needs `Authorization: Bearer <token>`. Errors always look like `{ "error": { "code", "message", "details?" } }`. The frontend branches on `code`, never on the message text.

| Method | Path | Body / query | Success response | Phase |
| --- | --- | --- | --- | --- |
| GET | `/api/health/live` | — | `200` when the process is up | 0 |
| GET | `/api/health/ready` | — | `200` when Mongo answers a ping; `503` otherwise | 0 |
| POST | `/api/register` | `{ username, password }` | `201 { user, token }`; rate-limited per IP | 1 |
| POST | `/api/login` | `{ username, password }` | `200 { user, token }`; rate-limited per IP | 1 |
| GET | `/api/me` | — | `200 { user }` (restores the session on reload) | 1 |
| POST | `/api/images` | multipart, field `image` (max 10 MB; jpeg/png/webp/gif/avif) | `201 { image }`, thumbnail made during upload | 2a |
| GET | `/api/images` | `?page=1&limit=10` (limit ≤ 50) | `200 { data: [image], pagination: { page, limit, total, totalPages } }`, newest first | 2b |
| GET | `/api/images/:id` | — | `200 { image, versions }`; `versions` lists an original's versions, newest first (always `[]` for a version, and until Phase 3); `404 NOT_FOUND` if it isn't yours | 2a |
| POST | `/api/images/:id/transform` | JSON `{ transformations }` (below) | `201 { image }` new version; `200 { image }` when the same transform already exists (phase 5); `400 TRANSFORM_ON_VERSION` if `:id` isn't an original | 3 |
| DELETE | `/api/images/:id` | — | `204`; an original takes its direct versions with it | 6 |

**Error codes**

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400 | Body or query fails Zod |
| `INVALID_TRANSFORM` | 400 | Empty or contradictory transformations |
| `INVALID_CROP` | 400 | Crop rectangle falls outside the image (measured after rotation) |
| `TRANSFORM_ON_VERSION` | 400 | `:id` is already a transformed version |
| `UNSUPPORTED_FILE` | 400 | Not an allowed image type, or the bytes aren't a valid image |
| `FILE_TOO_LARGE` | 413 | Over 10 MB, or over the pixel limit |
| `UNAUTHORIZED` | 401 | Missing, invalid or expired token; wrong password |
| `NOT_FOUND` | 404 | No such image for this user (or it has expired) |
| `USERNAME_TAKEN` | 409 | Register with an existing username |
| `RATE_LIMITED` | 429 | Too many requests; `Retry-After` header set |
| `INTERNAL` | 500 | Anything unexpected |

**Account rules.** `username` is trimmed and stored in lowercase, so `Ishan` and `ishan` are the same account (3–30 characters: letters, numbers, `_`). `password` is 8–72 *bytes*, checked with `Buffer.byteLength`: bcrypt silently ignores everything after byte 72, so a longer password would give a false sense of security.

**Image object.** Mongo stores `storageKey` and `thumbnailKey` only. Keys are random UUIDs (for example `originals/3f2c….jpg`), never built from `originalName`. The files are public (no login needed to open a URL), so the URLs must be impossible to guess. `url` and `thumbnailUrl` are built in `toJSON` from `PUBLIC_ASSET_BASE`, so moving to R2 or a new domain never rewrites rows. Still originals are re-encoded on upload (auto-oriented, EXIF stripped), so the stored pixels are upright and `width` and `height` are simply the stored size. `expiresAt` is upload time + 12 hours; after that the image is hidden, then deleted by the hourly cleanup.

```json
{ "id": "...", "originalName": "IMG_0420.jpg",
  "url": "<PUBLIC_ASSET_BASE>/<storageKey>",
  "thumbnailUrl": "<PUBLIC_ASSET_BASE>/<thumbnailKey>",
  "mimeType": "image/jpeg", "format": "jpeg", "size": 2483310,
  "width": 3024, "height": 4032, "animated": false,
  "parent": null, "transformations": null,
  "createdAt": "2026-10-08T09:00:00Z", "expiresAt": "2026-10-08T21:00:00Z" }
```

**Transform body.** Every key is optional, but at least one is required. Numeric fields use `z.coerce.number()`; booleans stay strict (`z.boolean()`), because `z.coerce.boolean("false")` is `true`. The pipeline always runs in this fixed order, and the TransformPanel shows it:

1. Auto-orient from EXIF with `.autoOrient()`, always first
2. Rotate (`0`, `90`, `180` or `270` only, so there are never empty corners to fill), then flip / mirror
3. Crop: coordinates are in the rotated frame and must fit inside it, otherwise `400 INVALID_CROP`
4. Resize with `withoutEnlargement: true`. With both `width` and `height`, the output is exactly that size (`fit: 'cover'`: scale, then centre-crop the overflow). With only one, the other side scales to keep the aspect ratio. An image smaller than the target is never enlarged
5. Filters: grayscale; sepia via `.recomb()` with the standard sepia matrix (`tint()` is not sepia)
6. Watermark: text escaped, rendered with DejaVu fonts
7. Format / compress

Animated GIF and AVIF uploads are transformed from their first frame only, so the result is a still image.

```json
{ "transformations": {
    "rotate": 90,
    "flip": true, "mirror": false,
    "crop": { "width": 400, "height": 300, "x": 0, "y": 0 },
    "resize": { "width": 800, "height": 600 },
    "filters": { "grayscale": false, "sepia": true },
    "watermark": { "text": "@ishan" },
    "format": "webp",
    "compress": { "quality": 75 }
} }
```

## Frontend

The app has five pages. Gallery and Image Detail sit behind a login guard. The 7-day JWT lives in localStorage and is checked with `/api/me` on load.

| Route | Page | What it does | Uses |
| --- | --- | --- | --- |
| `/login` | Login | Username + password form; redirects back to the page you came from; shows a countdown on `RATE_LIMITED` | `POST /login` |
| `/register` | Register | Same form plus confirm password; logs you in when done | `POST /register` |
| `/` | Gallery | Drag-and-drop upload, a grid of \~400px thumbnails, pagination | `POST /images`, `GET /images` |
| `/images/:id` | Image Detail | Full-size preview, metadata, transform panel (originals only), before/after view, versions list, download button | `GET /images/:id` (image + versions), `POST /images/:id/transform` |
| `*` | Not Found | 404 with a link home | — |

**Key components**

- `AuthContext`: holds `user`, `login`, `register` and `logout`, and restores the session on load.
- `ProtectedRoute`: shows a spinner while the token is checked and sends you to `/login` if you aren't signed in.
- `UploadDropzone`: drag-and-drop or click to pick a file. Checks type and size on the client, shows progress, and refreshes the grid.
- `ImageCard`: shows `thumbnailUrl` (never the full image), name, dimensions, size, an "Expires in 5h 32m" countdown, and a "version" badge when `parent` is set.
- `Pagination`: Prev/Next plus a page count, synced to `?page=` in the URL.
- `TransformPanel`: controls grouped in pipeline order (Rotate/Flip → Crop → Resize → Filters → Watermark → Output), with the order shown as numbered steps. For GIF/AVIF it notes that "animated images are flattened to the first frame". On a version it is replaced by a link to transform the original. It sends only the fields you changed.
- Download button: browsers ignore `<a download>` for files on another origin (R2 in production), so it fetches the file as a blob, then saves it through an object URL. This needs a CORS rule on the R2 bucket (Phase 4).
- Error handling: `api.js` throws errors that carry `code`. The UI branches on `RATE_LIMITED`, `INVALID_CROP`, `TRANSFORM_ON_VERSION` and the other codes, never on message text.

**User flow:** register → land on Gallery → upload → open an original → adjust the transforms → Apply → the new version appears under the original and you can download it.

**UI reference:** [Originkit](https://www.originkit.dev/), a free library of animated React components you copy as code. Use it for ideas or pieces such as the upload area, gallery grid and a before/after slider. Before copying one, check its license and what it depends on (some are built for Framer), then restyle it with Tailwind so the app looks consistent.

## Build phases

There are seven phases (Phase 2 is split into 2a and 2b), built in order. Each one builds the backend and the frontend for a feature together, ships with its tests, and ends with something you can demo.

### Phase 0: Setup

- [x] `git init`; repo with `server/`, `client/`, `.gitignore` and `.env.example`, plus a root `package.json` using concurrently so `npm run dev` starts both
- [ ] Commit `PLAN.md`, `CLAUDE.md` and `CHANGELOG.md` at the repo root
- [x] `config/env.js` validates every env var with Zod at boot; a missing `JWT_SECRET` or `MONGO_URI` stops the process with a clear message
- [x] `app.js` exports `createApp()`, which builds a fresh Express app every time it's called (rate limiters are created inside it too, so each test file starts with clean counters)
- [x] Express app with helmet (`crossOriginResourcePolicy: { policy: 'cross-origin' }`, so images from `/uploads` still load on another origin), cors, JSON parsing, a 404 handler, and an error handler that always returns `{ error: { code, message } }`
- [x] `GET /api/health/live` (process is up) and `GET /api/health/ready` (pings Mongo)
- [x] Graceful shutdown on SIGTERM/SIGINT: stop accepting connections, let in-flight requests finish, close the Mongo connection
- [x] `docker-compose.yml` with Mongo only; Node runs on the host
- [x] Vite + React + Tailwind client with a dev proxy for `/api` and `/uploads`
- [x] Vitest + Supertest set up, with a first test for `/health/live`. Tests use a separate `image-processing-test` database on the same Docker Mongo, set in `vitest.config.js` along with a dummy `JWT_SECRET`, and clear their collections before each test. No extra package needed

**Done when:** `docker compose up -d` and then `npm run dev` at the root start both apps; `/health/ready` returns 200, and 503 when Mongo is stopped; removing `JWT_SECRET` makes boot fail immediately.

### Phase 1: Auth

- [ ] User model with a bcrypt hash; the password never appears in JSON; `toJSON` maps `_id` → `id` and drops `__v`; `username` is stored trimmed and lowercase with a unique index (see Account rules)
- [ ] `POST /register`, `POST /login`, `GET /me`, JWT middleware (7-day tokens), Zod validation
- [ ] Rate limits on `/login` and `/register` (for example 5 per minute per IP; express-rate-limit with its in-memory store)
- [ ] Error codes `VALIDATION_FAILED`, `UNAUTHORIZED`, `USERNAME_TAKEN`, `RATE_LIMITED`
- [ ] Frontend: `api.js`, `AuthContext`, Login and Register pages, `ProtectedRoute`, Navbar
- [ ] Zod: password 8–72 bytes (`Buffer.byteLength`), username 3–30 of letters, numbers, `_`
- [ ] Tests: register, duplicate username (`Ishan` after `ishan` gives 409), a 73-byte password gives 400, login success and failure, `/me` with and without a token, the rate limit

**Done when:** you can register in the UI, refresh and stay logged in, and see a clear error for a wrong password, and the auth API tests pass.

### Phase 2a: Upload and thumbnails

- [ ] Multer (10 MB, jpeg/png/webp/gif/avif) plus a Sharp check that the bytes are a real image
- [ ] Set `limitInputPixels` explicitly on every `sharp()` call (25 MP, about 100 MB of raw pixels); a 10 MB PNG can decompress to gigabytes, and the production server has little RAM
- [ ] Re-encode still originals before saving: `.autoOrient()`, then the same format at quality 90 (PNG stays lossless). Sharp drops EXIF (GPS, camera details) on output, and the pixels come out upright, so `width`/`height` come straight from the encode's `info` (a portrait phone photo reports 3024×4032). Animated GIF/AVIF are stored as-is, since re-encoding would flatten them (GIF can't hold EXIF anyway)
- [ ] Storage interface (`save`, `get`, `remove`) with a local-disk version. Keys are random UUIDs (`crypto.randomUUID()`). Mongo stores `storageKey` only; URLs are built at serialization from `PUBLIC_ASSET_BASE`
- [ ] No orphan files: if the Mongo insert fails after the files were saved, delete those files before returning the error
- [ ] Thumbnail on upload: auto-orient, first frame only, \~400px-wide WebP with EXIF stripped, saved as `thumbnailKey`. This is the first use of the Sharp pipeline
- [ ] Accept GIF and AVIF; record `animated` (more than one frame) on the image
- [ ] Advertise EXIF stripping as a privacy feature ("we remove your photo's location") in the UI and README
- [ ] Every image gets `expiresAt` = upload time + `IMAGE_TTL_HOURS` (12), stored in UTC; versions copy their original's `expiresAt`, so the whole family expires together
- [ ] Image model, indexes `{ owner: 1, createdAt: -1, _id: -1 }`, `{ owner: 1, parent: 1 }` and `{ expiresAt: 1 }`
- [ ] `POST /images`, `GET /images/:id` (owner only; `versions` is `[]` until Phase 3)
- [ ] Frontend: UploadDropzone, a simple Image Detail page that shows the upload

**Done when:** you upload a portrait phone photo and it stands upright with the right dimensions; the stored original has no EXIF (`sharp(stored).metadata()` has no `exif`); a text file renamed to `.jpg` gets `400 UNSUPPORTED_FILE`; an 11 MB file gets `413 FILE_TOO_LARGE`; another user gets a 404 for your image ID; tests cover all five.

### Phase 2b: Gallery and expiry

- [ ] `GET /images` (paginated), sorted by `{ createdAt: -1, _id: -1 }` so two images with the same timestamp never swap places between pages
- [ ] `GET /images` and `GET /images/:id` hide anything past `expiresAt`, even before the cleanup job (Phase 5) has deleted it
- [ ] Frontend: a thumbnail-only gallery grid, ImageCard with an "Expires in 5h 32m" countdown, Pagination

**Done when:** you upload 12+ images; the grid loads only thumbnails with an expiry countdown and pages correctly; an image with `expiresAt` in the past is hidden; tests cover pagination and hiding.

### Phase 3: Transformations

- [ ] `services/transform.js`: `applyTransform(buffer, transformations)` → `{ buffer, meta }` as a pure function, with no Express or Mongo imports
- [ ] Fixed pipeline order: `.autoOrient()` → rotate → flip/mirror → crop → resize (`withoutEnlargement: true`) → grayscale/sepia → watermark → format/compress
- [ ] Sepia with `.recomb()` and the standard sepia matrix, not `tint()`
- [ ] Watermark: escape `& < > " '` to XML entities before the text goes into the SVG, or keep it out of the SVG and composite a pre-rendered text buffer. Fonts come from fonts-dejavu-core in the Docker image
- [ ] Animated GIF/AVIF: transform the first frame only (no `{ animated: true }`); the output is a still image
- [ ] Resize: both sides given → exactly that size with `fit: 'cover'`; one side → aspect ratio kept; never enlarged (see Transform body)
- [ ] Zod: `z.coerce.number()` for every numeric field, strict booleans, `rotate` limited to `0 | 90 | 180 | 270`. The crop check (`x + width ≤` rotated width, `y + height ≤` rotated height) returns `400 INVALID_CROP` instead of Sharp's opaque error
- [ ] Reject a transform when the image's `parent` isn't null: `400 TRANSFORM_ON_VERSION`
- [ ] Save the result as a new Image with `parent`, `transformations` and its own thumbnail (same no-orphan-files rule as upload)
- [ ] `GET /images/:id` now fills `versions` for an original (uses the `{ owner, parent }` index)
- [ ] `services/cache.js` as a no-op (`get` always misses, `set` does nothing), already called from the controller
- [ ] Frontend: TransformPanel in pipeline order with the order shown, the flatten note for animated images, before/after view, versions list under the original, download button (blob fetch, see Frontend)
- [ ] Tests: `applyTransform` per operation; rotate 90 + resize 800×600 on a 3000×2000 input gives 800×600; resize 800×600 on a 400×300 input stays 400×300; `rotate: 45` gives 400; a crop out of bounds gives 400; a watermark of `<&>` renders; a transform on a version gives 400; `GET /images/:id` lists the new version

**Done when:** every roadmap transform works from the UI, creates a version that shows up in the versions list and can be downloaded, and a 90° rotate combined with an 800×600 resize of a large photo returns an 800×600 image.

### Phase 4: Cloud storage and first deploy

- [ ] Cloudflare R2 bucket; `s3Storage.js` with `@aws-sdk/client-s3`
- [ ] `STORAGE_DRIVER=local|s3` picks the implementation; `PUBLIC_ASSET_BASE` points at the bucket's public URL
- [ ] Public bucket URL, or presigned GET URLs
- [ ] R2 CORS rule allowing `GET` from the client's origin, so the download button's blob fetch works
- [ ] No file migration: old local images expire within 12 hours anyway. Until then their URLs point at R2 and show as broken in dev, so just drop the dev database when you switch
- [ ] Run the hosting check in the Deployment section, then do a rough first deploy: API on Render (Dockerfile) with Atlas + R2, client on Vercel. It doesn't need to look good; the point is to hit the deploy-only problems now, not in Phase 6
- [ ] `app.set('trust proxy', 1)` in production, or every user shares the proxy's IP and one person's failed logins lock everyone out (the deep dive in Phase 5 explains why)
- [ ] In production, `sharp.concurrency(1)` and `sharp.cache(false)` at boot, so Sharp fits in a small instance's RAM
- [ ] `cors` allows only the Vercel URL (from an env var)

**Done when:** switching `STORAGE_DRIVER` and `PUBLIC_ASSET_BASE` sends new uploads to R2 with no other code changes, existing rows are never rewritten, and on the live URL you can register, upload a 10 MB phone photo, transform it and download the result without the server crashing.

### Phase 5: Caching, rate limiting and auto-delete

- [ ] Cache key = sha256 of `TRANSFORM_VERSION` + `imageId` + the sorted transformation JSON. Bump `TRANSFORM_VERSION` whenever the pipeline changes, so old results are never reused by mistake
- [ ] Each saved version stores its `cacheKey`, with a unique *partial* index: `partialFilterExpression: { cacheKey: { $type: 'string' } }`. Don't give `cacheKey` a default of `null`: a sparse index would still index `null`, and the second original upload would fail with `E11000`
- [ ] `cache.js` becomes a Mongo lookup: before running Sharp, find a version with the same `cacheKey` and return it (`200`)
- [ ] Two identical requests at once: the second insert fails on the unique index (error `E11000`). Catch it, delete the files the losing request just saved, and return the version the first request saved
- [ ] Transform rate limit with express-rate-limit (for example 10 per minute per user, so it runs after the auth middleware) that returns `429 RATE_LIMITED` with `Retry-After` (deep dive 1)
- [ ] Cleanup job (`services/cleanup.js`), run once at startup and then every hour: find images past `expiresAt`, delete their files (original, thumbnail, versions) from storage first, then delete the rows. Work in batches; running it twice must be harmless (deep dive 2)
- [ ] Frontend: a friendly "slow down" message with a countdown, triggered by `RATE_LIMITED`
- [ ] Tests: repeat transform returns the same image ID; parallel identical requests create one version and leave no extra files; two originals upload fine (no `null` clash); the 11th request gets 429; cleanup removes expired files and rows and leaves fresh ones alone

**Done when:** repeating a transform returns the existing version instantly, two identical requests fired together create one version, the 11th transform in a minute gets a 429, and an image past its expiry is gone from both storage and MongoDB within an hour.

### Phase 6: Polish and deploy

- [ ] `DELETE /images/:id`: deleting an original removes it plus its direct versions, with their files and thumbnails (the cache *is* the version rows, so nothing else to clean). Deleting a version removes only that version. There's one level only, since v1 has no chains
- [ ] R2 lifecycle rule that deletes objects older than 1 day, as a safety net in case the cleanup job ever misses
- [ ] Fill any gaps in test coverage, and run the tests in CI with GitHub Actions (a `mongo` service container gives the tests their database)
- [ ] Loading and empty states, toasts, a mobile layout
- [ ] README with screenshots, an API table and Known tradeoffs, including the localStorage/XSS risk and the 12-hour auto-delete
- [ ] Redeploy the finished app to the host chosen in Phase 4
- [ ] Clean up local Docker once the project is done: `docker compose down -v` (removes the Mongo container and its data volume), `docker system prune -a` (removes downloaded images), then uninstall Docker Desktop if nothing else needs it

**Done when:** deleting an original leaves no orphaned files, and there's a live URL you can put on your resume and portfolio.

## Learning plan

Every phase teaches something, and two topics get a full deep dive. For those, Claude explains how the thing works before any code is written, you write the code, and then we break it on purpose to see it hold.

| Phase | What you'll learn |
| --- | --- |
| 0 | How a request flows through Express middleware; env vars and fail-fast config; health checks; what SIGTERM is and why graceful shutdown matters; Docker basics (images, containers, ports) |
| 1 | Password hashing with bcrypt (salts, why passwords are never stored); how a JWT is built (header.payload.signature) and verified; status codes 400 / 401 / 409 / 429; API testing with Supertest |
| 2a | multipart/form-data and Multer; Buffers; image formats, EXIF and orientation; MongoDB schema design and indexes; why public file URLs must be unguessable |
| 2b | Pagination with skip/limit and stable sort order; storing time in UTC |
| 3 | Image pipelines with Sharp; pure functions and why they're easy to test; validation with Zod; escaping and injection |
| 4 | Object storage (the S3 API, buckets, keys, public vs presigned URLs); the adapter pattern behind the storage interface; a first real deploy: reverse proxies, CORS, memory limits on small servers |
| 5 | **Deep dive 1: rate limiting. Deep dive 2: auto-delete.** Also hashing for cache keys, unique and partial indexes, race conditions |
| 6 | CI with GitHub Actions, writing a README people actually read |

### Deep dive 1: rate limiting (auth limits in Phase 1, transform limit in Phase 5)

- What a rate limiter counts, and where the count lives (in this API's memory)
- The main algorithms (fixed window, sliding window, token bucket) and which one express-rate-limit uses
- Choosing the key: per IP vs per user, and what each one protects against
- The response: `429`, `Retry-After` and the `RateLimit-*` headers, and how the frontend countdown reads them
- The proxy trap: why `req.ip` is wrong behind Render without `trust proxy`
- Limits of an in-memory store (restarts, several servers), and why big systems move the counters to a shared store
- Interview angle: "design a rate limiter" is a classic system-design question, so we'll practise explaining ours

### Deep dive 2: 12-hour auto-delete (Phase 2a/2b + Phase 5)

- Storing expiry as a UTC timestamp instead of counting hours
- Scheduled jobs: `setInterval` vs node-cron vs OS cron, and why we also run once at startup
- Why order matters (files first, then rows), and what happens if the job crashes halfway
- Idempotency: making a job safe to run twice
- MongoDB TTL indexes, and why they aren't enough on their own
- Batching big deletes; what happens if an image expires while a transform on it is running
- R2 lifecycle rules as a safety net

### What to learn next (beyond this project)

1. **HTTP and the web:** methods, status codes, headers, cookies, CORS. The MDN HTTP guide is the best free source.
2. **Async JavaScript and the event loop:** promises, async/await, and why Sharp doesn't freeze Node (it runs on libuv's thread pool).
3. **Git properly:** branches, pull requests, small meaningful commits, resolving conflicts.
4. **SQL next to MongoDB:** PostgreSQL basics, joins, and when a relational database is the better fit.
5. **Web security basics:** the OWASP Top 10 (XSS, injection, broken auth). You'll meet three of them in this project.
6. **Testing habits:** unit vs integration tests, mocking, and writing a failing test before fixing a bug.
7. **Docker and the Linux command line:** enough to run, inspect and debug containers.
8. **System design:** caching, queues, load balancing.
9. **TypeScript,** once JavaScript feels comfortable; this codebase is a good one to convert.

## Status and decisions

Nothing is built yet, and every decision is now locked. We'll write the code together in your IDE, one phase at a time.

| Decision | Choice | Status |
| --- | --- | --- |
| Language | JavaScript (ES modules) on both client and server | Locked |
| Database | MongoDB + Mongoose | Locked |
| Transform results | Save every *distinct* version (by settings) as a new image linked to the original; an identical repeat returns the existing one (decided 2026-10-10) | Locked |
| EXIF on originals | Re-encode still originals on upload: auto-oriented, EXIF stripped, quality 90. Animated files stored as-is (decided 2026-10-10) | Locked |
| Tests | Vitest + Supertest API tests from Phase 1, written alongside each feature | Locked |
| Token storage | localStorage, 7-day JWT; XSS tradeoff noted in the README; refresh tokens + httpOnly cookies stay a stretch goal | Locked |
| Redis + queue | None. Rate limits are in-memory (express-rate-limit), the cache is a MongoDB `cacheKey`, and transforms run inside the request | Locked |
| Repo | One repo with `server/` + `client/` and a root `package.json` (concurrently) | Locked |
| Version chaining | Transforms only on originals; a version as `:id` gives `400 TRANSFORM_ON_VERSION`. Recursive delete is a stretch idea | Locked |
| Image retention | Images and their versions auto-delete 12 hours after upload (`IMAGE_TTL_HOURS=12`): hidden at expiry, removed by an hourly cleanup job, with an R2 lifecycle rule as a backup. User accounts are permanent (added 2026-10-08) | Locked |

**Open items**

- [x] **EXIF on stored originals:** re-encode on upload (2026-10-10). See the Locked row above.
- [x] **"Save every version"** means every *distinct* version (2026-10-10). See the Locked row above.

**Next step:** start Phase 0 together in the IDE.

## Known tradeoffs

- **localStorage token.** Any XSS bug on the frontend can read it. Accepted for v1: the frontend (Vercel) and the API are on different origins, and cookies would need `SameSite=None; Secure`, credentialed CORS and CSRF handling for no portfolio gain.
- **Images auto-delete after 12 hours.** Users must download what they want to keep. In return, storage can't fill up, the free tiers stay safe, and nobody's photos sit on the server.
- **Animated images are flattened.** GIF and AVIF upload fine, but a transform works on the first frame and returns a still. The UI says so.
- **No version chaining.** You can only transform an original. To change a version, transform the original again with combined settings.
- **In-memory rate limits.** Counters reset when the server restarts and aren't shared between instances. Fine while we run one API instance.
- **Transforms run inside the request.** A very large image can make the request wait a few seconds; the 10 MB and 25 MP limits keep that bounded.

## Deployment and stretch ideas

The backend is one web service plus MongoDB Atlas and Cloudflare R2, so a free deploy is realistic. The frontend goes on Vercel. The first deploy happens in Phase 4; Phase 6 redeploys the finished app.

| Host | What's free | Catch for this project |
| --- | --- | --- |
| Render | Web services, static sites | Free web services spin down after 15 minutes with no traffic and take about a minute to wake. Small instance (about 512 MB RAM), so the Sharp limits in Phase 4 matter. The disk is wiped on every deploy, so local storage can't be used there: R2 only |
| Railway | Free plan with $1 of credit a month, or a one-time $5 trial; Hobby is $5/month including $5 of usage | No sleep, but in practice Hobby, not free |
| MongoDB Atlas, Cloudflare R2 | Free tiers | Check current limits when signing up |

**Hosting check (Phase 4, before the first deploy):** choose Render free (accepting a slow first request after idle) or Railway Hobby (always on), and confirm the instance's current RAM. Since rate limits are in-memory, run exactly one instance. While a Render free server is asleep the hourly cleanup doesn't run; that's fine, because the job also runs at startup and expired images are hidden on read anyway.

Prices and limits are from [Render's free tier docs](https://render.com/docs/free) and [Railway's plans page](https://docs.railway.com/pricing/plans.md), checked on 2026-10-07.

**Stretch ideas, after Phase 6**

- Version chaining: transform a version, with a recursive delete and cache cleanup for every descendant.
- Animated transforms across all frames (`{ animated: true }`).
- Live preview: debounce the controls and render a low-res preview before you hit Apply.
- On-the-fly URL transforms like `GET /i/:id?w=300&format=webp`, cached the way Cloudinary does it.
- Presets ("Instagram square", "Thumbnail") saved per user.
- Swagger/OpenAPI docs generated from the Zod schemas.
- Refresh tokens plus httpOnly cookies instead of localStorage.
- Usage dashboard showing storage used, transforms this week, and remaining rate limit.
