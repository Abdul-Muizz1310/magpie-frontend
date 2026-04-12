# Spec: Source Detail Page

## Goal

Detail page (`/sources/[name]`) showing a single source's metadata, run history timeline, and item diffs between runs.

## Route

`src/app/sources/[name]/page.tsx`

## Inputs

- `params.name` — source name from URL.
- `fetchSource(name)` — source metadata.
- `fetchRuns({ source: name })` — run history for this source.

## Sections

### 1. Source header
- Name (h1), description, status badge, config SHA, item count.
- Back link to `/`.

### 2. Run timeline
- Chronological list of runs (most recent first).
- Each run shows: started_at, status, items_new/updated/removed, duration (ended_at - started_at), error if any.
- Status icon: checkmark=ok, warning=empty, cross=error.

### 3. Run detail (expandable)
- When a run row is clicked, expand to show:
  - Full error message (if status=error).
  - Items breakdown: new / updated / removed counts.
  - Diff view placeholder (for S4 — diff data requires additional API support).

## Invariants

- Invalid source name (no match) → 404 page via `notFound()`.
- No runs yet → "No runs recorded" message.
- Runs sorted by `started_at` descending.

## Test cases

### Happy path
1. Renders source name, description, and status badge in the header.
2. Renders run timeline with correct data for each run.
3. Run rows show started_at as formatted date, status icon, and item counts.

### Edge cases
4. Source with zero runs → "No runs recorded" message.
5. Run with `ended_at: null` (still running) → shows "In progress" instead of duration.
6. Run with `error` field → displays error text in red.

### Failure cases
7. Invalid source name (404 from API) → Next.js `notFound()` triggered.
8. API unreachable → error banner.

## Acceptance criteria

- [ ] Source header renders all metadata
- [ ] Run timeline lists runs in reverse chronological order
- [ ] Status icons are correct per status value
- [ ] 404 handled via `notFound()`
- [ ] Empty runs state handled
