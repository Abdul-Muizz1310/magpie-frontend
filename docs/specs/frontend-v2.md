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
- After any mutation, `revalidateTag("sources")` + `revalidateTag("source:{name}")`.

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
- Data accessors use `'use cache'` + `cacheTag('sources')` / `cacheTag('runs', 'runs:{source}')`
  / `cacheTag('heals', 'heals:{source}')`.
- `cacheLife("minutes")` for dashboards; mutations call `revalidateTag`.
- `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` added.
- `generateMetadata` on `/sources/[name]` and `/sources/[name]/edit`.
- Parallel fetches: `Promise.all` in `/sources/[name]`.

**Test cases**
- Error boundary catches synthetic throw.
- `notFound()` on unknown source renders custom page.
- `generateMetadata` returns source-specific title.

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
