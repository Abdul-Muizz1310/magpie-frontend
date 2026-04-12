# Spec: API Client

## Goal

A typed fetch client (`src/lib/api.ts`) that wraps all magpie-backend viewer API endpoints. Every component fetches data through this module — no raw `fetch` calls elsewhere.

## Backend endpoints consumed

| Method | Path | Query params | Response |
|---|---|---|---|
| GET | `/sources` | — | `SourceResponse[]` |
| GET | `/sources/{name}` | — | `SourceResponse` |
| GET | `/runs` | `source?`, `limit?`, `offset?` | `RunResponse[]` |
| GET | `/heals` | `source?`, `limit?`, `offset?` | `HealResponse[]` |
| GET | `/health` | — | `HealthResponse` |

## Types (mirror backend Pydantic models)

```ts
type Source = {
  name: string;
  description: string;
  last_run_at: string | null;
  last_status: string | null;
  item_count: number;
  config_sha: string;
};

type Run = {
  id: number;
  source: string;
  started_at: string;
  ended_at: string | null;
  items_new: number;
  items_updated: number;
  items_removed: number;
  status: string;
  error: string | null;
};

type Heal = {
  id: number;
  source: string;
  run_id: number | null;
  old_config: Record<string, unknown>;
  new_config: Record<string, unknown>;
  pr_url: string | null;
  created_at: string;
};

type Health = {
  status: string;
  version: string;
  db: string;
};
```

## Invariants

- Base URL read from `NEXT_PUBLIC_API_URL` env var at build time.
- All functions are `async` and return typed results.
- On non-2xx response, throw a typed `ApiError` with `status` and `message`.
- No retry logic — let the caller handle errors.
- Zod schemas validate responses at the boundary (parse, don't validate).

## Test cases

### Happy path
1. `fetchSources()` returns parsed `Source[]` when backend returns 200.
2. `fetchSource("hackernews")` returns a single `Source` on 200.
3. `fetchRuns({ source: "hackernews", limit: 5 })` passes query params and returns `Run[]`.
4. `fetchHeals()` returns `Heal[]` on 200.
5. `fetchHealth()` returns `Health` on 200.

### Edge cases
6. `fetchRuns()` with no params omits query string.
7. `fetchSource("")` — empty name still calls the API (backend validates).

### Failure cases
8. Backend returns 404 → `ApiError` thrown with `status: 404`.
9. Backend returns 500 → `ApiError` thrown with `status: 500`.
10. Backend returns malformed JSON → Zod parse error thrown.
11. Network error (fetch rejects) → error propagates as-is.

## Acceptance criteria

- [ ] All 5 fetch functions exported and typed
- [ ] Zod validation on every response
- [ ] `ApiError` class with `status` and `message`
- [ ] Base URL configurable via env var
- [ ] No `any` types
