import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ApiError, fetchHeals, fetchHealth, fetchRuns, fetchSource, fetchSources } from "./api";

const API_URL = "http://localhost:9999";

const mockSource = {
	name: "hackernews",
	description: "Scrape Hacker News front page",
	last_run_at: "2026-04-10T12:00:00Z",
	last_status: "ok",
	item_count: 30,
	config_sha: "abc123",
};

const mockRun = {
	id: 1,
	source: "hackernews",
	started_at: "2026-04-10T12:00:00Z",
	ended_at: "2026-04-10T12:01:00Z",
	items_new: 5,
	items_updated: 2,
	items_removed: 1,
	status: "ok",
	error: null,
};

const mockHeal = {
	id: 1,
	source: "hackernews",
	run_id: 1,
	old_config: { selector: "span.old" },
	new_config: { selector: "span.new" },
	pr_url: "https://github.com/Abdul-Muizz1310/magpie-backend/pull/1",
	created_at: "2026-04-10T13:00:00Z",
};

const mockHealth = {
	status: "ok",
	version: "abc123",
	db: "ok",
};

const server = setupServer();

beforeAll(() => {
	process.env.NEXT_PUBLIC_API_URL = API_URL;
	server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchSources", () => {
	it("returns parsed Source[] on 200", async () => {
		server.use(http.get(`${API_URL}/sources`, () => HttpResponse.json([mockSource])));

		const result = await fetchSources();
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("hackernews");
		expect(result[0].item_count).toBe(30);
	});
});

describe("fetchSource", () => {
	it("returns a single Source on 200", async () => {
		server.use(http.get(`${API_URL}/sources/hackernews`, () => HttpResponse.json(mockSource)));

		const result = await fetchSource("hackernews");
		expect(result.name).toBe("hackernews");
		expect(result.description).toBe("Scrape Hacker News front page");
	});
});

describe("fetchRuns", () => {
	it("passes query params and returns Run[]", async () => {
		server.use(
			http.get(`${API_URL}/runs`, ({ request }) => {
				const url = new URL(request.url);
				expect(url.searchParams.get("source")).toBe("hackernews");
				expect(url.searchParams.get("limit")).toBe("5");
				return HttpResponse.json([mockRun]);
			}),
		);

		const result = await fetchRuns({ source: "hackernews", limit: 5 });
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe(1);
	});

	it("omits query string when no params given", async () => {
		server.use(
			http.get(`${API_URL}/runs`, ({ request }) => {
				const url = new URL(request.url);
				expect(url.searchParams.toString()).toBe("");
				return HttpResponse.json([]);
			}),
		);

		const result = await fetchRuns();
		expect(result).toEqual([]);
	});
});

describe("fetchHeals", () => {
	it("returns Heal[] on 200", async () => {
		server.use(http.get(`${API_URL}/heals`, () => HttpResponse.json([mockHeal])));

		const result = await fetchHeals();
		expect(result).toHaveLength(1);
		expect(result[0].pr_url).toContain("github.com");
	});
});

describe("fetchHealth", () => {
	it("returns Health on 200", async () => {
		server.use(http.get(`${API_URL}/health`, () => HttpResponse.json(mockHealth)));

		const result = await fetchHealth();
		expect(result.status).toBe("ok");
		expect(result.db).toBe("ok");
	});
});

describe("error handling", () => {
	it("throws ApiError with status 404 on not found", async () => {
		server.use(
			http.get(
				`${API_URL}/sources/nonexistent`,
				() => new HttpResponse(JSON.stringify({ detail: "source not found" }), { status: 404 }),
			),
		);

		await expect(fetchSource("nonexistent")).rejects.toThrow(ApiError);
		await expect(fetchSource("nonexistent")).rejects.toMatchObject({
			status: 404,
		});
	});

	it("throws ApiError with status 500 on server error", async () => {
		server.use(
			http.get(
				`${API_URL}/sources`,
				() => new HttpResponse(JSON.stringify({ detail: "internal error" }), { status: 500 }),
			),
		);

		await expect(fetchSources()).rejects.toThrow(ApiError);
		await expect(fetchSources()).rejects.toMatchObject({
			status: 500,
		});
	});

	it("throws on malformed JSON response", async () => {
		server.use(
			http.get(`${API_URL}/sources`, () => new HttpResponse("not json {{{", { status: 200 })),
		);

		await expect(fetchSources()).rejects.toThrow();
	});

	it("propagates network errors", async () => {
		server.use(http.get(`${API_URL}/sources`, () => HttpResponse.error()));

		await expect(fetchSources()).rejects.toThrow();
	});
});

describe("edge cases", () => {
	it("fetchSource with empty string still calls API", async () => {
		server.use(http.get(`${API_URL}/sources/`, () => HttpResponse.json({ detail: "not found" })));

		// Should attempt the call, not short-circuit
		await expect(fetchSource("")).rejects.toThrow();
	});

	it("falls back to localhost:8000 when NEXT_PUBLIC_API_URL is unset", async () => {
		const saved = process.env.NEXT_PUBLIC_API_URL;
		delete process.env.NEXT_PUBLIC_API_URL;

		// Without the env var, it will try localhost:8000 and fail with a network error
		await expect(fetchHealth()).rejects.toThrow();

		process.env.NEXT_PUBLIC_API_URL = saved;
	});

	it("uses statusText when error response body is not valid JSON", async () => {
		server.use(
			http.get(`${API_URL}/sources`, () => {
				return new HttpResponse("<<<not json>>>", {
					status: 502,
					statusText: "Bad Gateway",
				});
			}),
		);

		await expect(fetchSources()).rejects.toMatchObject({
			status: 502,
			message: "Bad Gateway",
		});
	});

	it("uses body.message when body.detail is absent", async () => {
		server.use(
			http.get(
				`${API_URL}/sources`,
				() =>
					new HttpResponse(JSON.stringify({ message: "rate limited" }), {
						status: 429,
						statusText: "Too Many Requests",
					}),
			),
		);

		await expect(fetchSources()).rejects.toMatchObject({
			status: 429,
			message: "rate limited",
		});
	});

	it("falls back to statusText when error body JSON has no detail or message", async () => {
		server.use(
			http.get(
				`${API_URL}/sources`,
				() =>
					new HttpResponse(JSON.stringify({ code: "UNKNOWN" }), {
						status: 503,
						statusText: "Service Unavailable",
					}),
			),
		);

		await expect(fetchSources()).rejects.toMatchObject({
			status: 503,
			message: "Service Unavailable",
		});
	});

	it("omits query string when all param values are undefined", async () => {
		server.use(
			http.get(`${API_URL}/runs`, ({ request }) => {
				const url = new URL(request.url);
				expect(url.searchParams.toString()).toBe("");
				return HttpResponse.json([]);
			}),
		);

		const result = await fetchRuns({ source: undefined, limit: undefined });
		expect(result).toEqual([]);
	});
});
