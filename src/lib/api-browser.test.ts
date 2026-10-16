import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { makeRun, makeRunItem, PROXY_PATH, UUID_A } from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";
import { ApiError } from "./api";
import { BACKEND_PROXY_PREFIX, browserApi, proxyUrl } from "./api-browser";

// Browser-side calls go to the same-origin proxy route, never to the backend, and carry no
// token: the proxy signs them (spec 07, T-PTP-7). jsdom gives the page an origin; any request
// to the backend's own URL would fail the test (MSW `onUnhandledRequest: "error"`).

describe("browserApi goes through /api/backend (T-PTP-7)", () => {
	it("prefixes backend paths with the proxy route", () => {
		expect(BACKEND_PROXY_PREFIX).toBe("/api/backend");
		expect(proxyUrl("/health")).toBe("/api/backend/health");
	});

	it("fetches on the page's origin, with no platform token", async () => {
		let seen: { url: string; token: string | null } | undefined;
		server.use(
			http.get(`${PROXY_PATH}/api/runs/:id`, ({ request }) => {
				seen = { url: request.url, token: request.headers.get("x-platform-token") };
				return HttpResponse.json(makeRun());
			}),
		);
		const run = await browserApi.fetchRun(UUID_A);
		expect(run.id).toBe(UUID_A);
		expect(seen?.url).toBe(`${window.location.origin}/api/backend/api/runs/${UUID_A}`);
		expect(seen?.token).toBeNull();
	});

	it("keeps the query string", async () => {
		let search = "";
		server.use(
			http.get(`${PROXY_PATH}/api/runs/:id/items`, ({ request }) => {
				search = new URL(request.url).search;
				return HttpResponse.json([makeRunItem()]);
			}),
		);
		await browserApi.fetchRunItems(UUID_A, { limit: 100 });
		expect(search).toBe("?limit=100");
	});

	it("turns the proxy's error body into an ApiError with its message", async () => {
		server.use(
			http.get(`${PROXY_PATH}/sources`, () =>
				HttpResponse.json({ error: "proxy not configured" }, { status: 503 }),
			),
		);
		const error = await browserApi.fetchSources().catch((e: unknown) => e);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(503);
		expect((error as ApiError).message).toBe("proxy not configured");
	});
});
