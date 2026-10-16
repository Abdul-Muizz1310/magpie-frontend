# Spec: Site Metadata

## Goal

What a browser tab, a search result, a home-screen install and a link preview see. One
validated config drives the `<head>` of every page, the icons, the web manifest, robots.txt,
the sitemap and a 1200×630 share card.

## Files

- `src/lib/site/config.ts` — the site, defined once.
- `src/lib/site/define.ts` — `defineSite`, the config's parser.
- `src/lib/site/metadata.ts` — root metadata, viewport, manifest, robots and sitemap.
- `src/lib/site/share-card.tsx` — the share card as a `next/og` tree, and its headline layout.
- `src/lib/site/assets.ts` — reads the vendored fonts and the icon for the share card.
- `src/app/{manifest,robots,sitemap}.ts`, `src/app/opengraph-image.tsx` — thin route files.
- `src/app/icon.svg`, `src/app/favicon.ico`, `src/app/apple-icon.png`, `public/icon-*.png`.

## 1. One config, parsed when it loads

`src/lib/site/config.ts` defines the brand name, the default title, the description, the
production origin, the accent, keywords, the share card's copy, and which routes are public
(listed in the sitemap) or private (disallowed in robots.txt). Everything below is derived
from it.

`defineSite` parses the config when the module loads and throws a `SiteConfigError` on:
- a `url` that is not a URL, is not `https:`, or is not a bare origin (a path or a trailing
  slash);
- a host on the never-use list (`knowledge/infrastructure/infra-never-use-hosts.md` in the
  workspace): strangers own those hosts, and a link preview must never point at one. The
  deleted `magpie-backend-izzu.onrender.com` is on it;
- a name longer than 12 characters (the manifest's `short_name`), a title longer than 70, or a
  description outside 50 to 160 characters (search results cut longer ones);
- an accent that is not `#rrggbb`;
- a highlight that does not occur in the headline;
- a route that does not start with `/`, or a sitemap route under a disallowed prefix.

A bad config fails the build. It never ships into every link preview.

## 2. The head

The root layout exports `metadata` and `viewport` built from the config:
- `metadataBase` is `https://magpie-frontend-three.vercel.app`, so every image URL is absolute;
- the title has a default (`magpie — YAML scrapers that self-heal`) and the template
  `%s — magpie`;
- description, application name, author, keywords, and `formatDetection` off (iOS must not
  turn numbers on a page, such as item counts, into phone links);
- Open Graph: `type: website`, the site name and the locale. It has **no** title, description
  or url: Next fills `og:title` and `og:description` from each page's own, and a root `og:url`
  would claim that every page is the home page;
- `twitter:card` is `summary_large_image`. Next fills the Twitter title, description and
  image from Open Graph, so there is no separate `twitter-image`;
- no canonical at the root, for the same reason as `og:url`. The home page sets its own (`/`);
- viewport: `theme-color` `#0a0a0a` and `color-scheme: dark`.

## 3. Page titles

Every page sets a short lowercase title; the template adds ` — magpie`, so no page writes the
suffix itself. Titles come from each page's nav label or `h1`:

| Route | Title | Notes |
|---|---|---|
| `/` | (the default title) | `alternates.canonical: "/"` |
| `/heals` | `heals` | |
| `/demo` | `demo` | |
| `/login` | `sign in` | `robots: { index: false }` |
| `/sources/new` | `new source` | |
| `/sources/[name]` | `{name}` | |
| `/sources/[name]/items` | `{name} items` | |
| `/sources/[name]/edit` | `edit {name}` | |
| `/runs/[id]` | `run {id[0..8]}` | |

Dynamic titles are built from the route params alone, never from a fetch. Reading `params`
defers `generateMetadata` to request time under Cache Components, so a browser receives those
pages' title and Open Graph tags streamed after the static shell, while link-preview and
search bots (Next's `htmlLimitedBots`) get them in `<head>`. No page sets
`openGraph`, `twitter` or a canonical other than the home page's: a page-level `openGraph`
replaces the root one and drops the share image.

`/sources/new` and `/sources/[name]/edit` sit behind the auth proxy (`src/proxy.ts`). Its
matcher covers only those two paths, so the metadata routes are never redirected to `/login`.

## 4. Icons

The icon is the nav's brand tile: the lucide `Bird` glyph in `--accent-emerald` (`#34d399`) on
the surface colour, with a faint accent glow. `src/app/icon.svg` is the source. The rasters are
rendered from it:
- `src/app/favicon.ico`: 16, 32 and 48 px (the 16 px frame enlarges the glyph). It replaces
  the stock Next favicon;
- `src/app/apple-icon.png`: 180 px, full-bleed, because iOS rounds the corners itself;
- `public/icon-192.png` and `public/icon-512.png` for the manifest, plus
  `public/icon-maskable-512.png`, with the glyph inside the maskable safe zone.

## 5. Manifest, robots, sitemap

- `manifest.webmanifest`: name, short name, description, `start_url` and `scope` `/`,
  `display: standalone`, dark background and theme colours, the three PNG icons.
- `robots.txt`: allow `/`, disallow only machine endpoints (magpie has none: mutations are
  Server Actions), point at the sitemap. Link-preview bots such as Twitterbot obey robots.txt,
  so disallowing a page would also break its link preview.
- A page that must stay out of search sets `robots: { index: false }` instead: `/login`,
  because there is nothing to find there. It still gets a preview when shared.
- `sitemap.xml`: absolute URLs of `/`, `/heals` and `/demo`.

## 6. The share card

`opengraph-image` is a 1200×630 PNG rendered at build time with `next/og`: the brand tile, the
name, the `//` comment line, the headline with the highlight in the accent and underlined, and
the live host. It is set in Geist Mono, vendored as subset TTFs under `src/lib/site/fonts/`
with its OFL licence, because `next/og` cannot read the fonts `next/font` loads.

The headline is set at the largest size, from 96 px down to 48 px in steps of 8, at which it
wraps to at most two lines across the card's 1056 px. Every Geist Mono glyph is 0.6 em wide,
so the wrap is computed exactly, not measured. magpie's headline, `collect everything, heal
automatically.`, needs three lines at 96 px (18 columns) and fits two at 88 px (20 columns).

## Invariants

- `cacheComponents: true` stays on, and every metadata route is still prerendered at build
  time (`○` in the build output): `/opengraph-image`, `/icon.svg`, `/apple-icon.png`,
  `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`.
- With Cache Components, a route handler is prerendered only if its response body is ready
  without uncached I/O, and `ImageResponse` reads fonts and renders its PNG lazily, as I/O. So
  `opengraph-image.tsx` draws the card in a `"use cache"` helper with `cacheLife("max")` and
  returns the cached PNG bytes. The card changes only with a deploy.
- The root layout keeps its fonts and body classes; only its `metadata` changes and a
  `viewport` is added.
- The create-next-app leftovers in `public/` are gone.

## Test cases

- **T-FE-01** `defineSite` accepts the real config and derives its origin.
- **T-FE-02** `defineSite` rejects each case in §1, naming the reason.
- **T-FE-03** the root metadata: `metadataBase`, the title template, description, author,
  Open Graph with no title, description or url, the Twitter card, no `alternates`.
- **T-FE-04** the viewport colours.
- **T-FE-05** the manifest's fields, and every icon it lists exists in `public/` at its
  declared size.
- **T-FE-06** robots.txt allows the site and names the sitemap on the origin; the sitemap
  lists `/`, `/heals` and `/demo` as absolute URLs, once each.
- **T-FE-07** the icon files: `icon.svg` uses the accent, `favicon.ico` holds 16, 32 and 48,
  `apple-icon.png` is 180×180.
- **T-FE-08** the headline layout: highlight segments, the greedy wrap, the size chosen at each
  boundary (magpie's headline at 88), and the share card's alt text.
- **T-FE-09** the page titles in §3, without the ` — magpie` suffix; `/login` is `noindex`
  and the home page is not; the home page's canonical is `/`; no page sets `openGraph` or
  `twitter`.
- **T-FE-10** the `opengraph-image` route answers with a 1200×630 PNG, declares its alt
  text, size and content type, and draws the card under `cacheLife("max")`.

magpie has no E2E tier: the built app's head and every metadata route's content type are
checked against `pnpm build && pnpm start` with curl.

## Acceptance criteria

- [ ] One config drives the head, manifest, robots, sitemap and share card
- [ ] A bad config fails the build
- [ ] Every page title renders as `<title> — magpie`, with no doubled suffix
- [ ] `/login` is noindex and still previewable; robots.txt disallows nothing
- [ ] Icons are the nav's Bird tile in emerald
- [ ] Every metadata route is prerendered with `cacheComponents: true`
