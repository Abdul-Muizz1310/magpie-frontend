import { setupServer } from "msw/node";

// Empty base: each test declares the handlers it needs via `server.use()`.
//
// `server.listen()` runs at module load time — intentionally not from a
// vitest setupFile's `beforeAll`. In vitest 4 + msw 2, registering the fetch
// interceptor from a setupFile's hook doesn't take effect before the first
// request in a test; doing it at import time guarantees the interceptor is
// wired up before any fetch.
//
// Lifecycle hooks (resetHandlers, close) live in `test/setup.ts` so the
// ordering relative to `cleanup()` is deterministic.
export const server = setupServer();
server.listen({ onUnhandledRequest: "error" });
