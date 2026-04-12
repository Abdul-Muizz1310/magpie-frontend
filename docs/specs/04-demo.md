# Spec: Demo Page

## Goal

Page (`/demo`) providing a guided walkthrough of the magpie self-healing flow. This is the "10-second demo" from the project spec, rendered as an interactive step-by-step guide.

## Route

`src/app/demo/page.tsx`

## Sections

### 1. Overview
- Brief explanation of what magpie does (YAML scrapers, self-healing via LLM + PR).
- Link to the backend repo and a real self-heal PR (once one exists).

### 2. How it works (step cards)
Numbered step cards walking through the flow:

1. **Define a scraper** — show a YAML config snippet (hackernews.yaml).
2. **Scraper runs on schedule** — GitHub Actions cron triggers the scraper.
3. **Site changes, selectors break** — the scraper returns 0 items.
4. **Healer fires** — LLM analyzes raw HTML, proposes a new selector.
5. **PR opens automatically** — GitHub PR with old/new selector diff + reasoning.
6. **Human reviews and merges** — the scraper heals itself.

### 3. Live status
- Fetch `/health` from the backend and display connection status.
- Show source count from `/sources`.

## Invariants

- This page is mostly static content with small dynamic sections.
- YAML snippet is hardcoded (not fetched from API).
- If backend is unreachable, the live status section shows "Backend offline" gracefully.

## Test cases

### Happy path
1. All 6 step cards render with correct titles and descriptions.
2. YAML snippet renders in a code block.
3. Live status section shows "Connected" when backend returns 200.
4. Source count displayed correctly.

### Edge cases
5. Backend offline → live status shows "Backend offline" without crashing.

### Failure cases
6. No failure cases beyond backend connectivity (page is mostly static).

## Acceptance criteria

- [ ] 6 step cards rendered with icons and descriptions
- [ ] YAML code snippet displayed
- [ ] Live backend status indicator
- [ ] Graceful degradation when backend is offline
- [ ] Links to backend repo and self-heal PR
