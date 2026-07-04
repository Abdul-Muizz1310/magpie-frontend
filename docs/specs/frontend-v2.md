# magpie-frontend v2 — spec + test cases

Spec for the frontend rebuild that brings the UI in sync with the backend's expanded
surface (async job queue, custom-source CRUD, dual-mode healing, XPath, SSRF guard,
content-addressed dedup).

## Contract fixes (P0)

**Behavior**
- `Run.id`, `Heal.id`, `Heal.run_id` are UUIDs (strings), not integers.
- `Run` gains `duration_ms`, `item_count`, `job_id` (jobs router returns them; viewer
  router may omit them — treat as optional).
- `status` on runs is one of `"queued" | "running" | "ok" | "error"` (enum).
- `SourceSummary` (viewer) and `SourceDetail` (CRUD) are separate shapes; CRUD shape
  carries `id`, `origin`, `created_at`, `updated_at`, `config_yaml`.

**Test cases**
- Real UUID strings parse without Zod error.
- Integer `id` rejected.
- Unknown status value rejected.
- Optional fields missing → Zod still accepts.

## Async scrape + live run (P1)

**Behavior**
- User can trigger sync scrape (`POST /api/scrape/{source}/once`) — blocks, returns items.
- User can enqueue (`POST /api/scrape/{source}/enqueue`) — returns 202 + `run_id`.
- On enqueue, navigate to `/runs/{run_id}` which polls `GET /api/runs/{run_id}` with
  exponential backoff (1s → 2s → 5s, cap 10s) until `status` is `"ok"` or `"error"`.
- Poll aborts on unmount; retries transient 5xx up to 3 times.
- Sync scrape shows scraped items inline on the source detail page.

**Test cases**
- Trigger sync scrape → items render.
- Enqueue → redirected; poller transitions queued → running → ok; items fetched.
- Poller honors AbortController on unmount.
- Error status surfaced with red chrome + `run.error` copy.
- SSRF 422 from malformed source (shouldn't happen here, covered in CRUD).

## Custom source CRUD (P2)

**Behavior**
- `/sources/new` — create form. Two modes: YAML textarea and structured form builder.
- Toggle preserves state within one direction (YAML → form = parse + hydrate;
  form → YAML = serialize). If parse fails, show error and block switch.
- Form builder renders the full `SourceConfig` schema: name, description, url, render,
  schedule (cron), rate_limit.rps, item.container, item.container_type, item.fields[]
  (add/remove), item.dedupe_key (constrained to known field names), pagination,
  wait_for + actions[] (shown only when render=true), health (min_items, max_staleness).
- `POST /api/sources` with either `{yaml: string}` or `{config: object}`.
- `/sources/[name]/edit` — gated on origin=api; file-origin shows read-only banner.
- `PATCH /api/sources/{name}` for updates.
- `DELETE /api/sources/{name}` with confirmation; redirects to `/`.
- Error handling: 409 → "already exists" / "immutable"; 422 → Pydantic error list
  parsed and shown inline per field; SSRF URL → dedicated explanation.
- Mutations are **admin-only**: each Server Action calls `requireAdmin` (shared-secret
  session, fail-closed) before touching the backend.
- After any mutation, invalidate the affected routes with `revalidatePath("/")`,
  `revalidatePath("/heals")`, and `revalidatePath("/sources/{name}")`.
  (Route-path invalidation, not tag-based — see the "shipped model" note under P3.)

**Test cases**
- Form builder submits valid config → 201.
- YAML mode submits raw YAML → 201.
- Toggle YAML → form with invalid YAML shows error.
- Toggle form → YAML round-trips field values.
- Add/remove fields updates dedupe_key options.
- render=false hides wait_for/actions inputs.
- render=true + no actions valid (actions default empty).
- 422 with Pydantic list renders field-level errors (loc path → form field).
- 409 duplicate name → banner.
- 422 SSRF message → banner with plain-English explanation.
- File-origin source → edit button absent; visiting `/edit` shows read-only banner.
- Delete confirms, calls API, redirects home.

## Next.js hygiene (P3)

**Behavior**
- Enable `cacheComponents: true` in `next.config.ts`.
- Remove all `export const dynamic = "force-dynamic"`.
- `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` added.
- `generateMetadata` on `/sources/[name]`, `/sources/[name]/edit`, `/sources/[name]/items`,
  and `/runs/[id]`.
- Parallel fetches: `Promise.all` in `/sources/[name]`, `/sources/[name]/items`, and `/demo`.

> **Shipped caching model (revised).** The original plan called for `'use cache'` +
> `cacheTag`/`cacheLife` with tag-based `revalidateTag` invalidation. That is **not** what
> shipped, and the app does not pretend otherwise. A scraper dashboard must reflect the
> live run/heal state, so every accessor in `src/lib/data.ts` calls `connection()` to force
> per-request dynamic rendering (with `cacheComponents: true` these dynamic reads are
> explicit), and mutations invalidate via `revalidatePath`, not `revalidateTag`. Adopt the
> tag-based cache only if a future page can tolerate minutes-stale data.

**Test cases**
- Error boundary catches synthetic throw *and never renders the raw error text* (see
  `src/app/boundaries.test.tsx`).
- `notFound()` on unknown source renders custom page (`src/app/routes.test.tsx`).
- `generateMetadata` returns source-specific title (`src/app/routes.test.tsx`).
- Pagination offset math (`?page=N`) drives the correct `limit`/`offset` on each route.

## Pagination + heal polish (P4)

**Behavior**
- `/heals` and source-detail run list accept `?page=N` (1-indexed); render page links
  using `URLSearchParams` on a client `<Pagination>` component.
- Heals render a **structured diff**: old `field: selector` vs new `field: selector`
  rows with colored chrome, not raw JSON blobs.
- Confidence (if present) rendered as badge.

**Test cases**
- `?page=2` passes offset correctly.
- Structured diff renders both sides with color roles.
- Missing confidence gracefully omits badge.

## Live backend status dot

**Behavior**
- Nav shows a client-side-polled emerald dot (healthy) / red (degraded) dot based on
  `/health`. Polls every 30s.

**Test cases**
- 200 response → emerald dot.
- 503 response → red dot with "db down" tooltip.
- Network error → dot fades to faint.

## Cross-cutting

- All mutations are **Server Actions** (`"use server"`), not route handlers.
- Interactive UI (polling, form state, toggles) lives in client components marked
  `"use client"`.
- All API boundary data is parsed through Zod before use; Zod failures surface as
  friendly errors, not stack traces.
- No `any`; exhaustive status switches.
- Keep terminal aesthetic (emerald accent, mac traffic lights, monospace chrome).
