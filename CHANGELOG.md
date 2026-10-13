# Changelog

> **History only.** `PLAN.md` is the source of truth. Where anything here conflicts with it, `PLAN.md` wins. Newest entries first.

### 2026-10-13: UI references and icons

| # | Section | Change |
| --- | --- | --- |
| 1 | Frontend | The single Originkit line became a "UI references" table (Originkit, shwn.design, bencho.dev, motion.dev, Dribbble, designbookmark.com), adapted from the portfolio project's plan |
| 2 | Frontend | Icons: Phosphor (`@phosphor-icons/react`), regular weight for controls, duotone for big moments; installed when the restyle starts |

### 2026-10-10: Node 24

| # | Section | Change |
| --- | --- | --- |
| 1 | Tech stack, Folder structure | Node 22 → Node 24 LTS (already installed on the dev machine); container image `node:24-bookworm-slim` |
| 2 | Phase 6 | New item: clean up local Docker (containers, volume, images, Docker Desktop) once the project is done |

### 2026-10-10: Open items decided

| # | Section | Change |
| --- | --- | --- |
| 1 | Decisions | "Transform results" now says every *distinct* version; new Locked row "EXIF on originals: re-encode on upload"; both open items ticked |
| 2 | API contract | Image object: width/height come from the re-encoded upright original (no orientation swap) |
| 3 | Phase 2a | Orientation-swap item replaced by re-encoding still originals (auto-orient, quality 90, EXIF dropped; animated files as-is); the EXIF item became "advertise it"; Done-when checks the stored original has no EXIF |
| 4 | Phase 0, Folder structure | Dropped "move out of OneDrive": the project stays in `Projects/` with the other projects |

### 2026-10-10: Plan review applied

| # | Section | Change |
| --- | --- | --- |
| 1 | Whole plan | Removed every Redis, BullMQ, worker and SETNX mention, including the "Learn Redis" and "Async processing" stretch ideas. The Locked "Redis + queue: None" row stays |
| 2 | Files | `PLAN.md` and `CLAUDE.md` moved from `.agent/` to the repo root; the changelog moved out of `PLAN.md` into this file, and older entries were condensed |
| 3 | API contract | `GET /images/:id` returns `{ image, versions }`; new Account rules (lowercase usernames, 8–72-byte passwords); storage keys are random UUIDs |
| 4 | Transform body | `rotate` limited to 0/90/180/270; resize with both sides uses `fit: 'cover'`, with one side keeps the aspect ratio |
| 5 | Frontend | Download button fetches a blob (cross-origin `<a download>` is ignored) |
| 6 | Phase 0 | Move out of OneDrive + `git init`; `createApp()` so tests get fresh rate-limit counters; helmet `crossOriginResourcePolicy: cross-origin`; tests use a separate `image-processing-test` database |
| 7 | Phase 1 | Lowercase-username and 72-byte-password items and tests |
| 8 | Phase 2 | Split into 2a (upload + thumbnails) and 2b (gallery + expiry); pixel limit 25 MP; delete saved files if the DB insert fails; sort tie-break on `_id` |
| 9 | Phase 3 | Resize fit, rotate enum, versions in `GET /images/:id`, extra tests |
| 10 | Phase 4 | Renamed "Cloud storage and first deploy": no file migration, R2 CORS rule, a rough deploy with `trust proxy`, `sharp.concurrency(1)`, `sharp.cache(false)` and a locked-down `cors` origin |
| 11 | Phase 5 | Partial index for `cacheKey` instead of sparse (the `null` trap); the losing `E11000` request deletes its files; `trust proxy` moved to Phase 4 |
| 12 | Phase 6 | DELETE no longer mentions separate cache entries; CI uses a Mongo service container; the deploy item is now a redeploy |
| 13 | Learning plan, Deployment | Updated for 2a/2b and the Phase 4 deploy; Render RAM and wiped-disk notes |

### 2026-10-08: 12-hour auto-delete, learning plan, UI reference

| # | Section | Change |
| --- | --- | --- |
| 1 | API contract | Image object gains `expiresAt`; the paragraph explains hide-then-delete |
| 2 | Frontend | ImageCard shows an "Expires in" countdown; Originkit added as a UI reference |
| 3 | Phase 2 | `expiresAt` on upload (versions inherit it), expired images hidden from the API, `{ expiresAt: 1 }` index, countdown on cards |
| 4 | Phase 5 | Renamed "Caching, rate limiting and auto-delete"; added `trust proxy`, the hourly + startup cleanup job, and cleanup tests; Done-when extended |
| 5 | Phase 6 | R2 lifecycle rule (1 day) as a safety net; README mentions auto-delete |
| 6 | Decisions | New Locked row "Image retention: 12 hours" |
| 7 | Known tradeoffs | New entry for the 12-hour auto-delete |
| 8 | Learning plan | New section: what each phase teaches, deep dives on rate limiting and auto-delete, what to learn next |

### 2026-10-08: Queue and cache simplified

The rate limiter moved to express-rate-limit's in-memory store and the transform cache to a unique `cacheKey` in MongoDB. Transforms run inside the request; there is no queue. The plan went from eight phases to seven, and a free single-service deploy became realistic.

### 2026-10-07: First review applied

- Sharp ≥ 0.34 for `.autoOrient()`; fixed pipeline order (auto-orient → rotate → flip/mirror → crop → resize → filters → watermark → format); sepia via `.recomb()`; escaped watermark text with DejaVu fonts; animated images flattened to the first frame.
- Auth: 7-day JWT in localStorage (cross-origin reason recorded), auth rate limits, `toJSON` maps `_id` → `id`.
- Storage keys in Mongo, URLs built from `PUBLIC_ASSET_BASE`; thumbnails on upload; upright width/height from EXIF orientation; explicit `limitInputPixels`.
- Error shape `{ error: { code, message, details? } }` and the error code table; health `live`/`ready` routes; Zod-validated env; graceful shutdown.
- Transforms on originals only (`TRANSFORM_ON_VERSION`); DELETE takes direct versions; `z.coerce.number()` with strict booleans; crop check in the controller.
- Root `package.json` + concurrently; Compose runs Mongo only; Node runs on the host; `node:22-bookworm-slim` image with fonts.
- New sections: Known tradeoffs, Deployment (hosting table and pre-deploy check), stretch ideas for version chaining and animated transforms.
- Open item raised: EXIF on stored originals.
