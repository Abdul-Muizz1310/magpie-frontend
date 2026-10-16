# Spec 06: the env boundary

## Goal

Every environment value magpie reads passes through one boundary, `src/lib/env.ts`, which strips
what copy-paste and shell pipes add and rejects what still is not usable. A misconfigured value
fails loudly with its name, instead of surfacing as "Failed to parse URL from …" on the live home
page.

## Why

On 2026-10-16 the production `NEXT_PUBLIC_API_URL` was `U+FEFF` + the URL + `\r\n`: a value piped
into the Vercel CLI from Windows PowerShell. `new URL()` ignores the CR/LF but not the byte-order
mark, so every server fetch and the browser's health poll failed. `MAGPIE_ADMIN_SECRET` carried the
same bytes, so no typed secret could ever match it and admin login was impossible. Both were also
read raw in two places (`getBaseUrl()` and `BackendStatusDot`).

## Behaviour

- `envValue(raw)`: removes a leading/trailing `U+FEFF` and surrounding whitespace (space, tab,
  CR, LF). Inner characters are kept. An empty result means unset: `null`.
- `getBaseUrl()`: `envValue(NEXT_PUBLIC_API_URL)`, or `http://localhost:8000` when unset. The value
  must parse as an `http:` or `https:` URL, else it throws `ConfigError` naming
  `NEXT_PUBLIC_API_URL`. Trailing slashes are dropped so `${base}${path}` joins cleanly.
  `src/lib/api.ts` re-exports it; `BackendStatusDot` calls it instead of reading the variable.
- `getAdminSecret()` (`src/lib/auth.ts`): `envValue(MAGPIE_ADMIN_SECRET)`. A blank secret is still
  unset, so admin stays closed.

## Test cases (T-ENV)

1. `envValue`: unset, empty, whitespace-only and BOM-only are `null`; a BOM + CRLF wrapped value
   comes back clean; inner spaces are kept.
2. `getBaseUrl`: unset or blank falls back to localhost; the exact production shape
   (`U+FEFF` + URL + `\r\n`) comes back as the bare URL; a trailing slash is dropped; `not a url`,
   `ftp://…` and `https://` throw `ConfigError` naming the variable.
3. `getAdminSecret`: a BOM + CRLF wrapped secret is trimmed, so the typed secret matches; a
   whitespace-only secret is `null` (fail closed).
4. Composed: with the production-shaped value, `fetchHealth()` reaches the backend and
   `BackendStatusDot` reports ok.
