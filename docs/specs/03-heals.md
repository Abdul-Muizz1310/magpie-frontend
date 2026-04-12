# Spec: Heals Page

## Goal

Page (`/heals`) showing self-healing history across all sources. Each heal entry shows the source, old/new config diff, PR link, and timestamp.

## Route

`src/app/heals/page.tsx`

## Inputs

- `fetchHeals()` from the API client.

## UI elements per heal entry

| Element | Source field | Display |
|---|---|---|
| Source name | `source` | Link to `/sources/{source}` |
| PR link | `pr_url` | External link to GitHub PR (opens in new tab) |
| Created at | `created_at` | Formatted date + relative time |
| Config diff | `old_config` vs `new_config` | Side-by-side diff using react-diff-viewer-continued |
| Run link | `run_id` | "Triggered by run #N" |

## Invariants

- Heals sorted by `created_at` descending (API returns them this way).
- If `pr_url` is null, show "PR pending" instead of a link.
- Empty state: "No heals recorded — all scrapers are healthy."
- Config diff renders old_config and new_config as pretty-printed JSON.

## Test cases

### Happy path
1. Renders a list of heal entries with all fields.
2. PR link opens in new tab with `target="_blank"` and `rel="noopener noreferrer"`.
3. Config diff shows old vs new as formatted JSON.
4. Source name links to `/sources/{source}`.

### Edge cases
5. Zero heals → empty state message.
6. Heal with `pr_url: null` → "PR pending" text.
7. Heal with `run_id: null` → omit "Triggered by run" line.
8. Config objects are deeply nested → JSON is pretty-printed with indentation.

### Failure cases
9. API error → error banner.

## Acceptance criteria

- [ ] Heal entries render with all fields
- [ ] PR links are external with security attributes
- [ ] Config diff uses react-diff-viewer-continued
- [ ] Empty state handled
- [ ] Source names link to detail page
