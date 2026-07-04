# Why magpie-frontend?

## The obvious version

The obvious version of a scraper dashboard is a static page that lists YAML configs and their last-run timestamps. Maybe a table with green/red status dots, maybe a link to the raw logs. You check it when something breaks, ignore it the rest of the time, and hope the absence of alerts means everything is fine.

## Why I built it differently

The magpie backend already collects data and heals broken scrapers, but without a viewer the only way to understand what's happening is to SSH in and run SQL queries. Observability shouldn't require a database client. This frontend turns run history into a timeline, diffs into side-by-side views, and self-healing PRs into clickable links — so anyone, not just the person who wrote the YAML config, can tell at a glance whether a source is healthy, when it last ran, and what changed. The terminal aesthetic is a deliberate choice: it signals "ops tool," not "marketing page." React Server Components deliver data on first paint with no loading spinners, and Zod validates every API response at the boundary so a malformed backend payload explodes immediately instead of silently rendering garbage.

## What I'd change if I did it again

The dashboard currently polls for run status on an interval (with exponential backoff and a wall-clock cap), which means there's always a small window where a run has finished but the UI still shows "in progress." I'd add a WebSocket or SSE channel so run status updates land the moment they happen, instead of on the next poll tick.

The dual-mode config editor — form builder plus raw-YAML textarea, both hitting the same Pydantic-validated endpoint — already shipped (see `src/components/editor/`), so editing an api-origin scraper no longer means opening a text file or a GitHub PR. The next gap there is authorization: mutations are currently gated by a single shared admin secret. If I did it again I'd wire real per-user auth (OAuth/SSO) with an audit log of who changed which source, so a team could safely share the dashboard rather than passing one password around.
