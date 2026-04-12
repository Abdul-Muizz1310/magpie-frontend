# Why magpie-frontend?

The magpie backend collects data and heals broken scrapers, but without a viewer the only way to understand what's happening is to SSH in and run SQL queries. This frontend exists because observability shouldn't require a database client.

The dashboard turns run history into a timeline, diffs into side-by-side views, and self-healing PRs into clickable links. The goal is that anyone — not just the person who wrote the YAML config — can tell at a glance whether a source is healthy, when it last ran, and what changed.

A scraper that runs in the dark is a scraper you forget about until it breaks loudly enough to notice. This frontend makes every run visible and every heal traceable, so silent failures become impossible.
