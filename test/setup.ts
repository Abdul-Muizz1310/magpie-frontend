import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach } from "vitest";
import { API_URL } from "./msw/fixtures";
import { server } from "./msw/server";
import { SETUP_KEYS } from "./platform-keys";
import "./mocks/next-navigation";
import { resetRouterSpies } from "./mocks/next-navigation";

// Stabilize backend base URL for all tests regardless of env.
process.env.NEXT_PUBLIC_API_URL = API_URL;
// A throwaway signing key so server-side code under test can mint platform tokens (spec 07).
process.env.MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE = SETUP_KEYS.privateKeyB64;

afterEach(async () => {
	// Order matters: unmount components (which aborts in-flight requests via
	// useEffect cleanup + AbortController) BEFORE resetting handlers. An extra
	// microtask + macrotask tick lets any pending fetch settle so its response
	// is delivered by the handler that was registered for it.
	resetRouterSpies();
	cleanup();
	await Promise.resolve();
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	server.resetHandlers();
});

// Swallow teardown-race MSW errors so an aborted fetch that races with
// handler cleanup does not turn a passing test run into a failure.
process.on("unhandledRejection", (err) => {
	if (
		err instanceof Error &&
		err.message.includes("Cannot bypass a request when using the \"error\" strategy")
	) {
		return;
	}
	throw err;
});

afterAll(() => server.close());
