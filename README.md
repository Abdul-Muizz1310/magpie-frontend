# magpie-frontend

> Next.js viewer for [magpie](https://github.com/Abdul-Muizz1310/magpie-backend) — YAML-defined scrapers that self-heal.

<p>
  <a href="https://github.com/Abdul-Muizz1310/magpie-frontend/actions/workflows/ci.yml"><img src="https://github.com/Abdul-Muizz1310/magpie-frontend/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://magpie-frontend-three.vercel.app">Live App</a>
</p>

## What is this?

A dashboard for the magpie scraping framework. Browse configured sources, inspect run history, view item diffs between runs, and track self-healing PRs — all from a single UI.

## Pages

| Route | Purpose |
|---|---|
| `/` | Sources list — all configured scrapers with latest status |
| `/sources/[name]` | Source detail — runs, items, and diffs for a single source |
| `/heals` | Heal history — self-heal PRs with links to GitHub |
| `/demo` | Interactive demo walkthrough |

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 |
| Validation | Zod v4 |
| Lint + format | Biome |
| Tests | Vitest + Testing Library |
| Deploy | Vercel |

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | magpie-backend viewer API URL |

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # Biome check
pnpm typecheck    # TypeScript check
pnpm test         # Run tests
```

## License

[MIT](LICENSE)
