# CLAUDE.md: Image Processing Service

A mini Cloudinary: the roadmap.sh Image Processing Service backend (Express + MongoDB + Sharp) plus a React frontend.

**`PLAN.md` is the source of truth.** Read it at the start of every session. It has the phases, API contract, error codes, locked decisions, known tradeoffs and the learning plan. If this file and PLAN.md ever disagree on *what* to build, PLAN.md wins. This file says *how* we work.

---

## Who you're working with

- **Ishan**, a first-year engineering student building this to **learn**, not just to ship. Learning beats speed.
- Already knows: JavaScript, React + Vite (has shipped a React app), some Python/Django, C++ for DSA.
- New to: Express backends, MongoDB schema design and indexes, auth internals (bcrypt, JWT), rate limiting, scheduled jobs, Docker, automated testing, deployment.
- Use simple, plain English. Ishan may write in casual English or Hinglish; reply in clear English.
- Machine: **Windows**. Keep commands cross-platform and prefer npm scripts over shell-specific one-liners. When a command differs between PowerShell and Git Bash, say which one you mean.

---

## Working rules

1. **One phase at a time, in order.** Work through PLAN.md's "Build phases" in order. Don't start the next phase until the current phase's **Done when** passes *and* Ishan says to continue.
2. **Plan before code.** At the start of each phase, give a short plan covering the files you'll create or change, the order, and the concepts involved. Wait for Ishan's OK.
3. **Locked decisions are fixed.** Don't change the stack, libraries or architecture in PLAN.md's "Status and decisions" table. In particular, don't add Redis, BullMQ, workers, TypeScript, PostgreSQL or a different auth scheme. If you believe a change is needed, stop, explain why, and ask.
4. **Open items need answers first.** Check PLAN.md's "Open items" before the phase they block, and ask Ishan to decide.
5. **Small steps.** Build one feature at a time. After each one, run the tests and show how to try it by hand (a `curl` command or clicking through the UI).
6. **Tests alongside every feature** (Vitest + Supertest, from Phase 1). Never tick a checkbox while tests fail.
7. **Keep PLAN.md current.** Tick checkboxes (`- [x]`) as items are finished. If the implementation forces a change to the plan, ask first, then update PLAN.md and add a dated entry to `CHANGELOG.md`.
8. **No surprise dependencies.** Don't install packages the plan doesn't name without asking. When you add any package, say in one line what it does and why we need it.
9. **Git.** Suggest a commit with a clear message at the end of each meaningful step. Never commit `.env`, `uploads/` or `node_modules/`. Never force-push.
10. **Secrets.** Never hard-code secrets or print `.env` contents. Every new env var goes into both `config/env.js` (Zod schema) and `.env.example`.

---

## Teaching mode (important)

Ishan wants to understand everything we build.

- **Before code that introduces a new concept:** explain what it is, why we need it here, how it works (with a tiny example), and one or two common mistakes. Keep it short, a few paragraphs, unless it's a deep dive.
- **After writing code:** walk through what each new file does and how a request flows through it. Comment the non-obvious lines, not every line.
- **Offer the keyboard.** For each feature, ask: *"Do you want to write this yourself with my hints, or should I write it and walk you through it?"*
- **When something breaks:** don't silently fix it. Read the error together, form a guess about the cause, test the guess, then fix it. Debugging is part of the learning.
- **End of each phase:** give a short "What you learned" summary and 3–5 quick questions to check understanding, written like interview questions.

### Deep dives

Follow the outlines in PLAN.md → "Learning plan". For both topics, the order is fixed:

1. Explain how it works conceptually, before any code.
2. Ishan writes the code, with your hints.
3. Break it on purpose and watch it hold.

**Deep dive 1: rate limiting** (auth limits in Phase 1, transform limit in Phase 5)
- Cover counting, window algorithms (fixed window, sliding window, token bucket), keys (per IP vs per user), the `429` / `Retry-After` / `RateLimit-*` headers, the `trust proxy` trap, and the limits of an in-memory store.
- Break it: hammer `/login` with a loop and watch the 429s, then read the headers.
- Finish by having Ishan explain "design a rate limiter" as if in an interview.

**Deep dive 2: 12-hour auto-delete** (Phase 2a/2b + Phase 5)
- Cover UTC timestamps, scheduled jobs (`setInterval` vs node-cron), files-then-rows ordering, idempotency, why MongoDB TTL indexes aren't enough, batching, and the R2 lifecycle safety net.
- Break it: set a very short TTL in development, run the job twice, and kill it halfway.

---

## Tech conventions

- **Runtime:** Node 24 LTS with ES modules (`"type": "module"`). Express 5 forwards async errors on its own, so don't add `asyncHandler` wrappers.
- **Errors:** throw an `ApiError(status, code, message, details?)`. The error handler always responds with `{ error: { code, message, details? } }`. Use the codes in PLAN.md's error table, and add new codes there first.
- **Validation:** Zod for request bodies, queries and env vars. Use `z.coerce.number()` for numbers; keep booleans strict with `z.boolean()`, because coercing `"false"` gives `true`.
- **Mongoose:** `toJSON` maps `_id` → `id`, drops `__v`, and never includes the password. Store `storageKey` and `thumbnailKey` only, and build `url`/`thumbnailUrl` from `PUBLIC_ASSET_BASE`.
- **Storage:** keys are random UUIDs. If a DB insert fails after files were saved, delete those files before returning the error.
- **Tests:** a separate `image-processing-test` database on the Docker Mongo; `createApp()` builds a fresh app (with fresh rate-limit counters) for each test file.
- **Sharp (≥ 0.34):**
  - Set `limitInputPixels` (25 MP) on every `sharp()` call. In production, `sharp.concurrency(1)` and `sharp.cache(false)`.
  - `rotate` is 0/90/180/270 only. Resize with both sides uses `fit: 'cover'`.
  - Still originals are re-encoded on upload (`.autoOrient()`, quality 90, EXIF dropped); animated files are stored as-is.
  - `applyTransform(buffer, transformations)` stays a pure function: no Express or Mongo imports.
  - The pipeline order is fixed: `.autoOrient()` → rotate → flip/mirror → crop → resize (`withoutEnlargement: true`) → grayscale/sepia (`.recomb()`) → watermark (escaped text) → format/compress.
- **Time:** UTC everywhere. `expiresAt` = upload time + `IMAGE_TTL_HOURS`.
- **Rate limits:** `express-rate-limit` with its in-memory store; `app.set('trust proxy', 1)` in production (from the Phase 4 deploy).
- **Transforms:** originals only (a version as `:id` gives `400 TRANSFORM_ON_VERSION`). An identical repeat transform returns the existing version through `cacheKey`.
- **Frontend:**
  - React 19 + Vite + Tailwind 4 + React Router.
  - `lib/api.js` throws errors that carry `code`; the UI branches on `code`, never on message text.
  - Gallery cards show thumbnails only.
  - Originkit (see PLAN.md) is a UI reference only: check a component's license and dependencies before copying it, then restyle it with Tailwind.

---

## Commands

Run from the repo root unless noted. Docker Desktop must be running for the Mongo commands.

| Task | Command |
| --- | --- |
| Start MongoDB | `docker compose up -d` |
| Run server + client | `npm run dev` (repo root) |
| Server tests | `npm test` (in `server/`) |
| Stop MongoDB | `docker compose down` |

---

## Current status

- Phases 0 and 1 are done (Done-when passed). Phase 1 pages have plain placeholder styling; a Claude Design restyle (Darkroom direction, tokens in PLAN.md UI references) is in progress. Phase 2a has not started.
- The project stays in `Projects/` (inside OneDrive) with Ishan's other projects. If `npm install` fails with `EPERM`/`EBUSY`, pause OneDrive sync and retry.
- No open items left in PLAN.md.
