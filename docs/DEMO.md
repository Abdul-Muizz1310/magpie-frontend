# Demo Script

## Prerequisites

- Browser with internet access
- magpie-backend running at `https://magpie-backend-izzu.onrender.com`

## Live demo (production)

1. **Open the dashboard**: Navigate to `https://magpie-frontend-three.vercel.app`
2. **Browse sources**: See all configured scrapers with their status badges (ok/empty/error/healed)
3. **Inspect a source**: Click any source card to view:
   - Source metadata (name, description, config SHA)
   - Run timeline with status indicators
   - Per-run item counts (new/updated/removed)
   - Error messages for failed runs
4. **Check heals**: Navigate to `/heals` to see self-healing history:
   - Which source was healed
   - Old vs new config diff (JSON side-by-side)
   - Link to the GitHub PR
   - Timestamp and triggering run
5. **View the demo page**: Navigate to `/demo` for:
   - Step-by-step explanation of the self-healing flow
   - Example YAML config (hackernews.yaml)
   - Live backend connectivity indicator

## Local development demo

```bash
cd magpie-frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000` and follow the same steps as above.

## Key talking points

- "Every scraper is defined in 20 lines of YAML — no code per source."
- "When a selector breaks, the healer proposes a fix as a GitHub PR."
- "This dashboard makes every run visible. Silent failures are impossible."
- "The config diff in the heals view shows exactly what the LLM changed."
