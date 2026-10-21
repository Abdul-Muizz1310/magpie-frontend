# Spec 07: the platform token and the backend proxy

## Goal

Every call magpie makes to magpie-backend carries a fresh platform token signed with magpie's own
Ed25519 key. Server code (RSC pages, `data.ts`, Server Actions) calls the backend directly with a
token. Browser code calls the same-origin route `/api/backend/...`, which signs and forwards the
request. The private key and the signing code never reach a client bundle.

## Why

magpie-backend runs with `DEMO_MODE=false` and bastion's public key set (the DR-0009 fix), so every
route except `/health`, `/version`, `/metrics`, `/openapi.json` and the docs answers 401
`invalid platform token` without a bastion-signed JWT in `X-Platform-Token`. The frontend sent
none, so the source list and every other data call failed. The owner chose a per-frontend key and a
server-side proxy (workspace DR-0030): the backend trusts bastion's key and magpie-frontend's key,
and stays closed to direct internet calls.

## The token

- Key: `MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE`, server-only (never `NEXT_PUBLIC_*`), an Ed25519
  private key as PKCS#8 DER in standard base64 with no line breaks (the format of bastion's
  `BASTION_SIGNING_KEY_PRIVATE`). It is read through `envValue()` (spec 06), so a BOM and
  surrounding whitespace are stripped. A blank value is unset. A value that is not standard base64,
  or does not decode as an Ed25519 PKCS#8 private key, is malformed.
- JWT: compact JWS. Header `{"alg":"EdDSA","typ":"JWT","kid":"magpie-frontend-2026-10"}`. Claims
  `{"iss":"magpie-frontend","aud":"magpie","sub":"magpie-frontend","role":"frontend","service":"magpie","iat":<now>,"exp":<now+60>,"jti":<uuid>}`,
  `now` in whole seconds. Lifetime exactly 60 s, minted fresh for every upstream request.
- **2026-10-20 — platform contract v2** (workspace `docs/specs/platform-contract-v2.md` §4):
  `iss` is `"magpie-frontend"` and `aud` is `"magpie"` (one string, not a list). magpie-backend on
  contract v2 rejects a token without them; the backend on contract v1 rejects a token *with* `aud`
  (PyJWT refuses an `aud` it was not told to expect), so this ships after the backend's contract-v2
  merge, as the contract's rollout order says.
- `src/lib/platform-token.ts` (starts with `import "server-only"`) holds it: the pure parts
  (`base64url`, `tokenClaims(now, jti)`, `signingInput(claims)`), `parseSigningKey(raw)` and
  `signToken(key, claims)` (Ed25519 is deterministic), and `mintPlatformToken()`, which reads the
  env and the clock. A missing or malformed key throws `ConfigError` naming the variable, never its
  value. `node:crypto` only; no new dependency.

## One client, two transports

`src/lib/api.ts` stays the one typed client (Zod parsing, `ApiError`, timeouts), but it no longer
knows where the backend is. `createApi(transport)` binds every endpoint to a `Transport`, a function
`(path, init) => Promise<Response>`:

- `src/lib/api-server.ts` (`import "server-only"`): `serverApi`. Its transport mints a token, then
  fetches `${getBaseUrl()}${path}` with `X-Platform-Token` and `cache: "no-store"`. It mints before
  it fetches, so a missing or malformed key rejects with `ConfigError` and nothing is sent. Used
  by `data.ts` and `actions.ts`.
- `src/lib/api-browser.ts`: `browserApi`. Its transport fetches `/api/backend${path}`, same origin,
  with no token. Used by `useRunPoll` and `LiveRunView`. `BackendStatusDot` polls
  `/api/backend/health` the same way.

Why the minter cannot reach a client bundle: `api.ts` imports no transport, so the client graph
(`api.ts`, `api-browser.ts`) never names `platform-token.ts`. `platform-token.ts`, `api-server.ts`
and `backend-proxy.ts` start with `import "server-only"`, so a client module that imports any of
them fails `next build`, and CI runs the build. CI then greps `.next/static` for
`MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE` and `createPrivateKey`; either one fails the job. Tests
alias `server-only` to an empty module (`test/stubs/server-only.ts`), as Next does on the server.

`/health` goes through the proxy too, although the backend exempts it. The dot then measures the
path the page's own data takes: a missing key or a broken proxy shows as degraded instead of a
green dot over a dead page, and the browser no longer needs the backend's URL at all. A 502 from
the proxy (backend unreachable) shows as down, as a network failure did before.

## The proxy route

`src/app/api/backend/[...path]/route.ts` is thin: it exports `GET`, `POST`, `PUT`, `PATCH`,
`DELETE` and `maxDuration = 300`. It exports no `dynamic` and no `runtime`: Cache Components
rejects both at build time, and Node (which the signer's `node:crypto` needs) is already the only
runtime it allows. The handler reads the request and has a dynamic segment,
so Next never prerenders it, non-GET methods are never cached, and the upstream fetch is
`no-store`. The logic is in `src/lib/backend-proxy.ts`:

1. Non-GET methods need an admin session (`requireAdmin`, the Server Actions' gate): 503 when no
   admin secret is configured, 401 without a valid session, 429 over budget, as `{"error": …}`.
   magpie's browser code only reads; every mutation is an admin-gated Server Action. Without this
   gate the proxy would sign anyone's `POST /api/scrape/…` and bypass the admin login.
2. Base URL: `getBaseUrl()`. A `ConfigError` is 503 `{"error":"proxy not configured"}`.
3. Path guard, 400 `{"error":"invalid backend path"}`: no segments, an empty segment, `.` or
   `..`, a backslash, or a `/` inside a segment (an encoded `%2F`). Next decodes each segment, so
   the guard sees `%2e%2e` as `..`. Each segment is re-encoded with `encodeURIComponent` (one
   that cannot be encoded, a lone surrogate, is 400) and joined onto the base; the result must
   keep the base's origin and stay under its path, else 400.
   The query string is kept. Next re-serializes it before the handler sees it, which can turn
   `%20` into `+`; both decode to the same values (`%2B`, `+` and `%26` arrive intact).
4. Token: `mintPlatformToken()`. A `ConfigError` is 503 `{"error":"proxy not configured"}` and
   logs the variable's name and the reason, never the value. No upstream call is made.
5. Upstream request: method kept; headers allowlisted (`content-type`, `accept`, `last-event-id`,
   `x-request-id`; never `cookie` or `authorization`), plus `X-Platform-Token` and
   `X-Forwarded-For` set to **exactly one client address** (`clientAddress()`): the leftmost
   entry of the incoming `x-forwarded-for` (Vercel's edge writes the visitor's address there), else
   `x-real-ip`; a value that is not an IPv4/IPv6 address is skipped, and with no usable address the
   header is omitted. Never the incoming chain: magpie-backend keys a frontend token's rate-limit
   bucket on `magpie-frontend:{leftmost X-Forwarded-For}` (platform contract v2 §2, amended
   2026-10-20), so a forwarded chain would let a caller pick its own bucket. The body as an
   ArrayBuffer for non-GET methods (omitted when empty); `cache: "no-store"`, `redirect: "manual"`,
   `signal: request.signal`.
6. A fetch that throws is 502 `{"error":"backend unreachable"}`.
7. Response: `new Response(upstream.body, …)`, streamed, never buffered (SSE works), with the
   upstream status and an allowlist of headers: `content-type`, `cache-control`, `retry-after`,
   `x-request-id`, `last-event-id`. `set-cookie`, `location` (a redirect is not followed and not
   handed to the browser) and everything else are dropped. 204, 205 and 304 carry no body.

`ApiError` now also reads an `{"error": "…"}` body, so the browser shows "proxy not configured" or
"backend unreachable" instead of "Request failed".

## Test cases (T-PTP)

Tests make their own throwaway keypairs (`test/platform-keys.ts`); `test/setup.ts` installs one so
server-side code can sign. No real key is ever read.

1. `base64url`: no padding, `-` and `_` for `+` and `/`, decodes back to the input.
2. `tokenClaims(now, jti)`: exactly `iss = "magpie-frontend"`, `aud = "magpie"` (a string), `sub`, `role`,
   `service`, `iat = now`, `exp = now + 60`, `jti`.
3. `signToken`: three segments; the header is the fixed one; the signature verifies with the
   matching public key and fails with another keypair's; the same inputs give the same token.
4. `parseSigningKey`: unset, blank and BOM-only are missing; a BOM + CRLF wrapped key parses; not
   base64, base64 with line breaks, PEM text, random bytes, an RSA PKCS#8 key and an Ed25519 SPKI
   public key are malformed.
5. `mintPlatformToken`: claims from the injected clock; a new `jti` on every call; missing or
   malformed key throws `ConfigError` naming the variable, and the message never holds the value.
6. Server side: `serverApi` calls `${API_URL}` directly with an `X-Platform-Token` that verifies
   with the test public key and carries the claims above with a 60 s lifetime; each call gets a
   new token; with the key missing or malformed it rejects with `ConfigError` and the backend
   sees no request.
7. Browser side: `browserApi` calls `/api/backend/…` on the page's origin, query kept, with no
   token header; a proxy error body `{"error":"proxy not configured"}` becomes
   `ApiError(503, "proxy not configured")`.
8. Proxy, happy path: a GET reaches `${API_URL}/sources?…` with the query kept, and the status and
   JSON come back; the forwarded token verifies, with the claims above.
9. Proxy, headers: the four request headers pass; `cookie`, `authorization` and anything else do
   not; `X-Forwarded-For` is one address — the incoming chain's leftmost entry (IPv4 or IPv6,
   trimmed), else a valid `x-real-ip`, else absent; a non-IP leftmost entry falls through to
   `x-real-ip`; the forwarded value never contains a comma; the five response headers pass;
   `set-cookie`, `location` and the rest do not.
10. Proxy, statuses: 401, 404 and 429 (with `retry-after`) pass through; a 204 has no body; a 3xx
    is not followed.
11. Proxy, bodies: POST, PUT, PATCH and DELETE from an admin forward method and body byte for byte.
12. Proxy, admin gate: a non-GET without a session is 401, with no admin secret 503, and the
    backend sees no request; GET needs no session.
13. Proxy, path guard: `..`, `.`, an empty segment, a backslash, an encoded slash, a lone
    surrogate and no segments are 400 with no upstream call; a segment with a space is re-encoded; a URL off the backend's
    origin or outside its base path is rejected.
14. Proxy, config: missing key, malformed key and an unusable `NEXT_PUBLIC_API_URL` are 503
    `{"error":"proxy not configured"}` with no upstream call; the log names the variable, never
    the value; a BOM + CRLF wrapped `NEXT_PUBLIC_API_URL` still reaches the backend (T-ENV-4).
15. Proxy, upstream down: 502 `{"error":"backend unreachable"}`.
16. Proxy, streaming: a `text/event-stream` response's first event is readable before the
    upstream sends the second; the fetch gets `cache: "no-store"`, `redirect: "manual"` and the
    request's own signal.
17. Route module: exports the five methods and `maxDuration = 300`; no `dynamic`, no `runtime`.
18. Composed: `useRunPoll`, `LiveRunView` and `BackendStatusDot` reach their data through
    `/api/backend`; the dot shows down on a 502 and degraded on a 503.

## Verification outside the unit suite

- `pnpm build`: `/api/backend/[...path]` is dynamic (`ƒ`); the metadata routes stay prerendered.
- `.next/static` contains neither `MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE` nor `createPrivateKey`
  (a CI step).
- `pnpm start` against a local mock backend that checks the token: the home page renders sources,
  and a browser-style `GET /api/backend/sources` returns them.
