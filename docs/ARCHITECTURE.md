# Architecture

```mermaid
graph TD
    Browser[Browser] --> NextApp[Next.js App Router]
    NextApp --> SourcesList[/ — Sources List]
    NextApp --> SourceDetail[/sources/name — Source Detail]
    NextApp --> Heals[/heals — Heal History]
    NextApp --> Demo[/demo — Demo Page]
    SourcesList --> API[magpie-backend API]
    SourceDetail --> API
    Heals --> API
    API --> Neon[(Neon DB)]
```

## Data flow

1. Next.js pages fetch data from the magpie-backend viewer API (`/sources`, `/runs`, `/heals`).
2. All API calls go through a typed client (`src/lib/api.ts`).
3. Components render the data with shadcn/ui primitives and Tailwind styling.
4. Diff views use `react-diff-viewer-continued` for side-by-side comparison.
