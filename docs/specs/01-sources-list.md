# Spec: Sources List Page

## Goal

Home page (`/`) displaying all configured scraper sources as cards. Each card shows the source name, description, last run status, item count, and links to the detail page.

## Route

`src/app/page.tsx` — Server Component that fetches sources on the server.

## Inputs

- `fetchSources()` from the API client.

## Outputs

- Grid of source cards.
- Each card links to `/sources/[name]`.

## UI elements per card

| Element | Source field | Display |
|---|---|---|
| Name | `name` | Heading, clickable link |
| Description | `description` | Subtitle text |
| Status badge | `last_status` | Colored badge: green=ok, yellow=empty, blue=healed, red=error, gray=null |
| Item count | `item_count` | "N items" |
| Last run | `last_run_at` | Relative time ("2h ago") or "Never" |

## Invariants

- Empty state: if no sources returned, show a message "No sources configured."
- Loading: since this is a Server Component, no client loading state needed — the page streams.
- Error: if the API is unreachable, show an error banner with the message.

## Test cases

### Happy path
1. Renders a card for each source returned by the API.
2. Each card displays name, description, status badge, item count, and relative time.
3. Card links to `/sources/{name}`.

### Edge cases
4. Zero sources → "No sources configured" message shown.
5. Source with `last_run_at: null` → shows "Never".
6. Source with `last_status: null` → gray badge.

### Failure cases
7. API error → error banner displayed with message.

## Acceptance criteria

- [ ] Sources grid renders with all fields
- [ ] Status badges color-coded correctly
- [ ] Empty state message works
- [ ] Error state renders gracefully
- [ ] Links navigate to `/sources/[name]`
