// @vitest-environment node
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	API_URL,
	makeEnqueueResponse,
	makeScrapeResult,
	makeSourceDetail,
} from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";

// Must mock before importing actions (module evaluates `"use server"` + imports).
vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

const {
	createSourceAction,
	deleteSourceAction,
	enqueueScrapeAction,
	scrapeOnceAction,
	updateSourceAction,
} = await import("./actions");
const { revalidatePath } = await import("next/cache");
const revalidatePathMock = vi.mocked(revalidatePath);

afterEach(() => {
	revalidatePathMock.mockClear();
});

describe("createSourceAction", () => {
	it("returns ok + invalidates sources + /{name} routes on success", async () => {
		server.use(
			http.post(`${API_URL}/api/sources`, () =>
				HttpResponse.json(makeSourceDetail(), { status: 201 }),
			),
		);
		const result = await createSourceAction({ yaml: "name: custom-one" });
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.name).toBe("custom-one");
		expect(revalidatePathMock).toHaveBeenCalledWith("/");
		expect(revalidatePathMock).toHaveBeenCalledWith("/sources/custom-one");
	});

	it("returns failure with 422 issues on validation error", async () => {
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
		const result = await createSourceAction({ yaml: "bad" });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.status).toBe(422);
			expect(result.issues).toBeDefined();
		}
		// No invalidation on failure.
		expect(revalidatePathMock).not.toHaveBeenCalled();
	});

	it("returns failure with 409 on conflict", async () => {
		server.use(
			http.post(
				`${API_URL}/api/sources`,
				() => new HttpResponse(JSON.stringify({ detail: "already exists" }), { status: 409 }),
			),
		);
		const result = await createSourceAction({ yaml: "name: dup" });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(409);
	});

	it("wraps non-ApiError throws", async () => {
		server.use(http.post(`${API_URL}/api/sources`, () => HttpResponse.error()));
		const result = await createSourceAction({ yaml: "" });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(0);
	});
});

describe("updateSourceAction", () => {
	it("invalidates the source-specific paths on success", async () => {
		server.use(
			http.patch(`${API_URL}/api/sources/custom-one`, () =>
				HttpResponse.json(makeSourceDetail({ name: "custom-one" })),
			),
		);
		const result = await updateSourceAction("custom-one", { yaml: "name: custom-one" });
		expect(result.ok).toBe(true);
		expect(revalidatePathMock).toHaveBeenCalledWith("/sources/custom-one");
		expect(revalidatePathMock).toHaveBeenCalledWith("/sources/custom-one/edit");
	});
});

describe("deleteSourceAction", () => {
	it("returns ok: null on 204 and invalidates routes", async () => {
		server.use(
			http.delete(
				`${API_URL}/api/sources/custom-one`,
				() => new HttpResponse(null, { status: 204 }),
			),
		);
		const result = await deleteSourceAction("custom-one");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data).toBeNull();
		expect(revalidatePathMock).toHaveBeenCalledWith("/");
	});

	it("returns failure on immutable file-origin", async () => {
		server.use(
			http.delete(
				`${API_URL}/api/sources/hackernews`,
				() =>
					new HttpResponse(
						JSON.stringify({ detail: "file-origin source 'hackernews' is immutable" }),
						{ status: 409 },
					),
			),
		);
		const result = await deleteSourceAction("hackernews");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.status).toBe(409);
	});
});

describe("enqueueScrapeAction", () => {
	it("returns run_id on 202 + invalidates runs route", async () => {
		server.use(
			http.post(`${API_URL}/api/scrape/hackernews/enqueue`, () =>
				HttpResponse.json(makeEnqueueResponse(), { status: 202 }),
			),
		);
		const result = await enqueueScrapeAction("hackernews", 20);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.status).toBe("queued");
		expect(revalidatePathMock).toHaveBeenCalledWith("/sources/hackernews");
	});
});

describe("scrapeOnceAction", () => {
	it("returns items on 200", async () => {
		server.use(
			http.post(`${API_URL}/api/scrape/hackernews/once`, () =>
				HttpResponse.json(makeScrapeResult()),
			),
		);
		const result = await scrapeOnceAction("hackernews", 10);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.items).toHaveLength(1);
	});
});
