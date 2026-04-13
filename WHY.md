# Why magpie-frontend?

## The obvious version

The obvious version of a scraper dashboard is a static page that lists YAML configs and their last-run timestamps. Maybe a table with green/red status dots, maybe a link to the raw logs. You check it when something breaks, ignore it the rest of the time, and hope the absence of alerts means everything is fine.

## Why I built it differently

The magpie backend already collects data and heals broken scrapers, but without a viewer the only way to understand what's happening is to SSH in and run SQL queries. Observability shouldn't require a database client. This frontend turns run history into a timeline, diffs into side-by-side views, and self-healing PRs into clickable links — so anyone, not just the person who wrote the YAML config, can tell at a glance whether a source is healthy, when it last ran, and what changed. The terminal aesthetic is a deliberate choice: it signals "ops tool," not "marketing page." React Server Components deliver data on first paint with no loading spinners, and Zod validates every API response at the boundary so a malformed backend payload explodes immediately instead of silently rendering garbage.

## What I'd change if I did it again

The dashboard currently polls for run status on an interval, which means there's always a window where a run has finished but the UI still shows "in progress." I'd add a WebSocket channel so run status updates land the moment they happen. I'd also build a config editor with inline YAML validation — right now, editing a scraper config means opening a text file or a GitHub PR, which is friction that discourages non-engineers from tuning sources. A validated editor in the dashboard would close that loop entirely.
