# Spec 08: the post-deploy smoke tier and the toolchain guard

## Goal

Two CI gates the other frontends already have.

1. **Smoke tier.** After a push to `main`, a `smoke` job probes the deployed backend's `/health`, so a
   deploy that never came up is visible on the commit that caused it. Pull requests and forks never
   run it, and it is inert until the `SMOKE_BASE_URL` repository variable is set.
2. **Toolchain guard.** `typescript` stays below 7: TypeScript 7 is the Go rewrite, ships no
   `lib/typescript.js`, and `next build` resolves exactly that file, so a `^7` bump fails the build
   as "you do not have the required package(s) installed" (workspace lesson
   `lesson-dependabot-splits-what-must-move-together`; Dependabot PR #13 failed this way).

## Smoke tier

- `SMOKE_BASE_URL` is a **bare origin** (`https://magpie-backend-t4bb.onrender.com`): http or https,
  a host, no path, no query. A trailing slash is stripped. Unset or blank means the tier is off.
  Anything else is a configuration error and fails loudly, so a typo can never look like a skip.
- `test/smoke.test.ts` holds the gate (`smokeBaseUrl`, always tested) and one live test that is
  skipped unless the variable is set. Skipped, it makes **zero** HTTP requests.
- Live: `GET {origin}/health` must answer 200 with `status: "ok"` and `service: "magpie"`. Render's
  free tier cold-boots for over 70 s, so each attempt waits up to 120 s; a transport error or a
  502/503/504 is retried (3 attempts, 5 s apart after a 5xx). Exhausting the attempts fails the test
  with the URL and the last status or error.
- MSW (`test/msw/server.ts`) errors on unhandled requests, so the live test lets exactly that one
  URL pass through.
- CI: a `smoke` job, `needs: build`, `if: github.event_name == 'push'`, runs
  `pnpm vitest run test/smoke.test.ts` with `SMOKE_BASE_URL: ${{ vars.SMOKE_BASE_URL }}`. The `test`
  job never receives the variable, so its counts do not depend on it.

## Toolchain guard

- `.github/dependabot.yml` ignores `typescript` versions `>=7`.
- `test/toolchain.test.ts` asserts the declared `typescript` range's major is below 7, and that
  `@types/node`'s major does not run ahead of the Node major `ci.yml` installs.

## Test cases

Pass:
- [x] `smokeBaseUrl(undefined | "" | "  ")` is `null` (tier off).
- [x] `smokeBaseUrl("https://x.test/")` is `"https://x.test"`; `http://localhost:8000` is kept.
- [x] With `SMOKE_BASE_URL` unset the live test is skipped and no request is made.
- [x] `typescript` is `^5`, `@types/node` is `^20` with CI on Node 24: the guard passes.

Failure:
- [x] `smokeBaseUrl` throws `SmokeTargetError` for no scheme, `ftp://`, `https://` with no host,
      a path (`https://x.test/health`), a query, and free text; the message names the variable.
- [x] A `typescript` range with major 7 fails the guard by name (checked against the parser).
- [x] Dependabot config ignores `typescript >=7`.
