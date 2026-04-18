// @vitest-environment node
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import {
	API_URL,
	makeEnqueueResponse,
	makeHeal,
	makeHealth,
	makeRun,
	makeRunItem,
	makeScrapeResult,
	makeSourceCrudSummary,
	makeSourceDetail,
	makeSourceSummary,
	UUID_A,
} from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";
import {
	ApiError,
	createSource,
	deleteSource,
	enqueueScrape,
	fetchHeals,
	fetchHealth,
	fetchRun,
	fetchRunItems,
	fetchRuns,
	fetchSource,
	fetchSources,
	getSourceDetail,
	listSourcesCrud,
	scrapeOnce,
	updateSource,
} from "./api";

describe("fetchSources (viewer)", () => {
	it("returns SourceSummary[] on 200", async () => {
		server.use(http.get(`${API_URL}/sources`, () => HttpResponse.json([makeSourceSummary()])));
		const result = await fetchSources();
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("hackernews");
		expect(result[0].last_status).toBe("ok");
	});

	it("rejects invalid run-status values via Zod", async () => {
		server.use(
			http.get(`${API_URL}/sources`, () =>
				HttpResponse.json([{ ...makeSourceSummary(), last_status: "mystery" }]),
			),
		);
		await expect(fetchSources()).rejects.toThrow();
	});
});

describe("fetchSource (viewer, by name)", () => {
	it("returns a single SourceSummary", async () => {
		server.use(
			http.get(`${API_URL}/sources/hackernews`, () => HttpResponse.json(makeSourceSummary())),
		);
		const result = await fetchSource("hackernews");
		expect(result.name).toBe("hackernews");
	});
});

describe("fetchRuns", () => {
	it("parses UUID id (not a number) + optional duration_ms/item_count", async () => {
		server.use(http.get(`${API_URL}/runs`, () => HttpResponse.json([makeRun()])));
		const result = await fetchRuns();
		expect(result[0].id).toBe(UUID_A);
		expect(result[0].duration_ms).toBe(60_000);
	});

	it("rejects integer id (P0 contract drift)", async () => {
		server.use(http.get(`${API_URL}/runs`, () => HttpResponse.json([{ ...makeRun(), id: 42 }])));
		await expect(fetchRuns()).rejects.toThrow();
	});

	it("accepts missing duration_ms/item_count (viewer shape)", async () => {
		const viewerShape = {
			id: UUID_A,
			source: "hackernews",
			status: "ok" as const,
			started_at: "2026-04-10T12:00:00Z",
			ended_at: "2026-04-10T12:01:00Z",
			items_new: 1,
			items_updated: 0,
			items_removed: 0,
			error: null,
		};
		server.use(http.get(`${API_URL}/runs`, () => HttpResponse.json([viewerShape])));
		const result = await fetchRuns();
		expect(result[0].duration_ms).toBeUndefined();
		expect(result[0].item_count).toBeUndefined();
	});

	it("passes source + limit + offset query params", async () => {
		server.use(
			http.get(`${API_URL}/runs`, ({ request }) => {
				const u = new URL(request.url);
				expect(u.searchParams.get("source")).toBe("hackernews");
				expect(u.searchParams.get("limit")).toBe("5");
				expect(u.searchParams.get("offset")).toBe("10");
				return HttpResponse.json([]);
			}),
		);
		await fetchRuns({ source: "hackernews", limit: 5, offset: 10 });
	});
});

describe("fetchHeals", () => {
	it("parses structured old/new config with confidence", async () => {
		server.use(http.get(`${API_URL}/heals`, () => HttpResponse.json([makeHeal()])));
		const result = await fetchHeals();
		expect(result[0].new_config.confidence).toBe(0.92);
		expect(result[0].pr_url).toContain("github.com");
	});

	it("accepts null pr_url (db-patched heals)", async () => {
		server.use(
			http.get(`${API_URL}/heals`, () => HttpResponse.json([{ ...makeHeal(), pr_url: null }])),
		);
		const result = await fetchHeals();
		expect(result[0].pr_url).toBeNull();
	});
});

describe("fetchHealth", () => {
	it("returns Health on 200", async () => {
		server.use(http.get(`${API_URL}/health`, () => HttpResponse.json(makeHealth())));
		const result = await fetchHealth();
		expect(result.db).toBe("ok");
	});
});

describe("async scrape / job queue", () => {
	it("enqueueScrape posts max_items and returns 202 body", async () => {
		server.use(
			http.post(`${API_URL}/api/scrape/hackernews/enqueue`, async ({ request }) => {
				const body = (await request.json()) as { max_items?: number };
				expect(body.max_items).toBe(25);
				return HttpResponse.json(makeEnqueueResponse({ job_id: "job-1" }), { status: 202 });
			}),
		);
		const result = await enqueueScrape("hackernews", 25);
		expect(result.run_id).toBe(UUID_A);
		expect(result.status).toBe("queued");
	});

	it("fetchRun returns the full Run shape including duration_ms", async () => {
		server.use(http.get(`${API_URL}/api/runs/${UUID_A}`, () => HttpResponse.json(makeRun())));
		const result = await fetchRun(UUID_A);
		expect(result.duration_ms).toBe(60_000);
		expect(result.status).toBe("ok");
	});

	it("fetchRunItems returns persisted RunItem[]", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}/items`, ({ request }) => {
				const u = new URL(request.url);
				expect(u.searchParams.get("limit")).toBe("50");
				return HttpResponse.json([makeRunItem()]);
			}),
		);
		const items = await fetchRunItems(UUID_A, { limit: 50 });
		expect(items).toHaveLength(1);
		expect(items[0].stable_id).toBe("item-1");
		expect(items[0].content_hash).toBe("deadbeefcafebabe");
	});

	it("fetchRunItems accepts null html_snapshot_url + empty title/url", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}/items`, () =>
				HttpResponse.json([makeRunItem({ title: "", url: "", html_snapshot_url: null })]),
			),
		);
		const items = await fetchRunItems(UUID_A);
		expect(items[0].title).toBe("");
		expect(items[0].url).toBe("");
	});

	it("scrapeOnce returns items with stable_id + hash", async () => {
		server.use(
			http.post(`${API_URL}/api/scrape/hackernews/once`, () =>
				HttpResponse.json(makeScrapeResult()),
			),
		);
		const result = await scrapeOnce("hackernews", 10);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].content_hash).toBe("deadbeefcafebabe");
	});
});

describe("custom-source CRUD (/api/sources)", () => {
	it("listSourcesCrud filters by origin", async () => {
		server.use(
			http.get(`${API_URL}/api/sources`, ({ request }) => {
				expect(new URL(request.url).searchParams.get("origin")).toBe("api");
				return HttpResponse.json([makeSourceCrudSummary()]);
			}),
		);
		const result = await listSourcesCrud("api");
		expect(result[0].origin).toBe("api");
	});

	it("getSourceDetail returns config_yaml", async () => {
		server.use(
			http.get(`${API_URL}/api/sources/custom-one`, () => HttpResponse.json(makeSourceDetail())),
		);
		const result = await getSourceDetail("custom-one");
		expect(result.config_yaml).toContain("custom-one");
	});

	it("createSource posts body and returns detail", async () => {
		server.use(
			http.post(`${API_URL}/api/sources`, async ({ request }) => {
				const body = (await request.json()) as { yaml?: string };
				expect(body.yaml).toContain("name:");
				return HttpResponse.json(makeSourceDetail(), { status: 201 });
			}),
		);
		const result = await createSource({ yaml: "name: custom-one\nurl: https://example.com" });
		expect(result.name).toBe("custom-one");
	});

	it("updateSource sends PATCH and returns detail", async () => {
		server.use(
			http.patch(`${API_URL}/api/sources/custom-one`, () => HttpResponse.json(makeSourceDetail())),
		);
		const result = await updateSource("custom-one", { yaml: "name: custom-one" });
		expect(result.name).toBe("custom-one");
	});

	it("deleteSource returns on 204", async () => {
		server.use(
			http.delete(
				`${API_URL}/api/sources/custom-one`,
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		await expect(deleteSource("custom-one")).resolves.toBeUndefined();
	});

	it("createSource surfaces 422 Pydantic issue list", async () => {
		server.use(
			http.post(
				`${API_URL}/api/sources`,
				() =>
					new HttpResponse(
						JSON.stringify({
							detail: [{ loc: ["body", "url"], msg: "invalid url", type: "value_error" }],
						}),
						{ status: 422 },
					),
			),
		);
		await expect(createSource({ yaml: "" })).rejects.toMatchObject({
			status: 422,
			issues: expect.any(Array),
		});
	});

	it("createSource SSRF 422 preserves detail string", async () => {
		server.use(
			http.post(
				`${API_URL}/api/sources`,
				() =>
					new HttpResponse(
						JSON.stringify({
							detail: "URL host '127.0.0.1' is not allowed (loopback/private/link-local)",
						}),
						{ status: 422 },
					),
			),
		);
		await expect(createSource({ yaml: "name: x" })).rejects.toMatchObject({
			status: 422,
			message: expect.stringContaining("127.0.0.1"),
		});
	});

	it("createSource 409 surfaces conflict message", async () => {
		server.use(
			http.post(
				`${API_URL}/api/sources`,
				() =>
					new HttpResponse(JSON.stringify({ detail: "source 'x' already exists" }), {
						status: 409,
					}),
			),
		);
		await expect(createSource({ yaml: "name: x" })).rejects.toMatchObject({
			status: 409,
			message: expect.stringContaining("already exists"),
		});
	});
});

describe("error handling (generic)", () => {
	it("throws ApiError with status 404 on not found", async () => {
		server.use(
			http.get(
				`${API_URL}/sources/nonexistent`,
				() => new HttpResponse(JSON.stringify({ detail: "source not found" }), { status: 404 }),
			),
		);
		await expect(fetchSource("nonexistent")).rejects.toBeInstanceOf(ApiError);
	});

	it("falls back to localhost:8000 when NEXT_PUBLIC_API_URL is unset", async () => {
		const saved = process.env.NEXT_PUBLIC_API_URL;
		delete process.env.NEXT_PUBLIC_API_URL;
		await expect(fetchHealth()).rejects.toThrow();
		process.env.NEXT_PUBLIC_API_URL = saved;
	});

	it("uses statusText when error response body is not valid JSON", async () => {
		server.use(
			http.get(
				`${API_URL}/sources`,
				() => new HttpResponse("<<<not json>>>", { status: 502, statusText: "Bad Gateway" }),
			),
		);
		await expect(fetchSources()).rejects.toMatchObject({ status: 502, message: "Bad Gateway" });
	});

	it("health fixture round-trips through fetchHealth", async () => {
		server.use(http.get(`${API_URL}/health`, () => HttpResponse.json(makeHealth())));
		const h = await fetchHealth();
		expect(h.version).toBe("abc123");
	});
});
