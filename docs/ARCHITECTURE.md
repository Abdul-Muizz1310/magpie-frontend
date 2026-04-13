# Architecture

## System context

```mermaid
flowchart LR
    User["Browser"] --> Vercel["Vercel Edge Network"]
    Vercel --> NextApp["Next.js App Router<br/>(Server Components)"]
    NextApp --> API["magpie-backend<br/>FastAPI on Render"]
    API --> Neon[("Neon Postgres")]
    API --> R2["Cloudflare R2<br/>(HTML snapshots)"]
```

## App structure

```mermaid
flowchart TD
    Layout["RootLayout<br/>(fonts, metadata, bg styles)"]
    Layout --> Home["/ -- Sources List"]
    Layout --> Detail["/sources/[name] -- Source Detail"]
    Layout --> Heals["/heals -- Heal History"]
    Layout --> Demo["/demo -- Demo Page"]

    Home --> ApiClient["src/lib/api.ts<br/>(Zod-validated client)"]
    Detail --> ApiClient
    Heals --> ApiClient
    Demo --> ApiClient

    ApiClient --> Backend["magpie-backend API<br/>GET /sources, /runs,<br/>/heals, /health"]
```

## Page lifecycle

Each route is a Server Component that fetches data at request time (or build time for static/ISR pages), validates with Zod, and renders. No client-side loading spinners needed.

```mermaid
sequenceDiagram
    participant Browser
    participant Vercel as Vercel Edge
    participant RSC as Server Component<br/>(page.tsx)
    participant Api as api.ts
    participant Zod as Zod Schema
    participant Backend as magpie-backend

    Browser->>Vercel: GET /sources/hackernews
    Vercel->>RSC: Render page
    RSC->>Api: fetchSource("hackernews")<br/>+ fetchRuns({ source })
    Api->>Backend: GET /sources/hackernews<br/>GET /runs?source=hackernews
    Backend-->>Api: JSON responses
    Api->>Zod: Parse + validate
    alt valid
        Zod-->>RSC: Typed data
        RSC-->>Vercel: Rendered HTML
        Vercel-->>Browser: Response
    else invalid
        Zod-->>RSC: Throw at boundary
        RSC-->>Vercel: Error alert banner
        Vercel-->>Browser: Error page
    end
```

## Terminal component hierarchy

The UI uses a retro terminal aesthetic. `PageFrame` provides the outer chrome, `TerminalWindow` wraps each content section, and `AppNav` + `StatusBar` provide navigation and status.

```mermaid
flowchart TD
    PF["PageFrame<br/>(grid layout + scanlines)"]
    PF --> Nav["AppNav<br/>(route links: /, /heals, /demo)"]
    PF --> Content["Page content area<br/>(children)"]
    PF --> SB["StatusBar<br/>(backend health indicator)"]
    Content --> TW1["TerminalWindow<br/>(title bar + scrollable body)"]
    Content --> TW2["TerminalWindow<br/>(additional sections)"]
    TW1 --> Data1["Source list / run timeline /<br/>heal diffs / demo steps"]
    TW2 --> Data2["Detail panels /<br/>config views"]
```

## Key decisions

| Decision | Rationale |
|---|---|
| Server Components for data fetching | Pages fetch from the backend API at request time (or build time for static). No client-side loading spinners needed. |
| Zod validation at API boundary | Parse responses before they reach components. Fail fast on unexpected shapes. |
| No state management library | Server Components don't need client state. Each page is a fresh fetch. |
| Biome over ESLint+Prettier | Single tool, faster, fewer config files. |
| Vitest over Jest | Native ESM support, faster, better DX with Vite ecosystem. |
| `next/link` mock in tests | Next.js `Link` behaves differently in jsdom. Mocking to a plain `<a>` keeps tests deterministic. |
| Terminal aesthetic (PageFrame + TerminalWindow) | Distinctive visual identity; avoids generic dashboard look. Consistent chrome across all routes. |
| ISR for static pages | `/`, `/demo`, `/heals` are pre-rendered at build time with ISR fallback for freshness without SSR cost. |

## Directory layout

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata, bg styles)
│   ├── page.tsx                # Sources list (/)
│   ├── sources/[name]/
│   │   └── page.tsx            # Source detail with run timeline
│   ├── heals/
│   │   └── page.tsx            # Heal history with config diffs
│   └── demo/
│       └── page.tsx            # Interactive demo walkthrough
├── components/
│   └── terminal/
│       ├── PageFrame.tsx       # Outer layout chrome (nav + status + content)
│       ├── TerminalWindow.tsx  # Retro window with title bar + body
│       ├── AppNav.tsx          # Route navigation links
│       └── StatusBar.tsx       # Backend health check indicator
├── lib/
│   ├── api.ts                  # Typed API client (Zod-validated)
│   └── test-utils.tsx          # Shared test helpers
└── test-setup.ts               # Vitest global setup (cleanup, jest-dom)
```

## Data flow

1. User hits a route (e.g., `/sources/hackernews`).
2. Next.js Server Component calls `fetchSource("hackernews")` + `fetchRuns({ source: "hackernews" })`.
3. `api.ts` makes GET requests to `NEXT_PUBLIC_API_URL` backend.
4. Response is validated with Zod. Invalid data throws at the boundary.
5. Component renders the validated data. Errors show an alert banner.
6. Static pages (`/`, `/demo`, `/heals`) are pre-rendered at build time with ISR fallback.
