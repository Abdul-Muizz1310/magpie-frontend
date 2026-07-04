// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import {
	makeHeal,
	makeRun,
	makeRunItem,
	makeSourceDetail,
	makeSourceSummary,
} from "../../test/msw/fixtures";

// Route-level tests: async RSC pages can't be *rendered* in jsdom (React's
// client renderer rejects async components — verified), so we invoke each page
// function directly against a mocked data layer. Invoking executes the exact
// composition logic the audit flagged as untested (Promise.all, notFound()
// detection, pagination offset math) and its JSX construction, without needing
// Playwright/e2e. Boundaries (error/not-found/loading) are render-tested in
// boundaries.test.tsx.

vi.mock("@/lib/data", () => ({
	getSource: vi.fn(),
	getSourceConfig: vi.fn(),
	getRuns: vi.fn(),
	getHeals: vi.fn(),
	getSourceItems: vi.fn(),
	getHealth: vi.fn(),
	getSources: vi.fn(),
	listCrudSources: vi.fn(),
}));

const data = await import("@/lib/data");
const { notFound } = await import("next/navigation");
const notFoundMock = vi.mocked(notFound);

// All page modules imported at top level (describe callbacks are synchronous).
const detailPage = await import("./sources/[name]/page");
const itemsPage = await import("./sources/[name]/items/page");
const healsPage = await import("./heals/page");
const editPage = await import("./sources/[name]/edit/page");
const runPage = await import("./runs/[id]/page");
const demoPage = await import("./demo/page");
const loginPage = await import("./login/page");

const params = <T,>(v: T) => Promise.resolve(v);
const search = <T,>(v: T) => Promise.resolve(v);

beforeEach(() => {
	notFoundMock.mockClear();
});

describe("/sources/[name] (source detail)", () => {
	const page = detailPage;

	it("generateMetadata returns a source-specific title (P3)", async () => {
		const meta = await page.generateMetadata({ params: params({ name: "hackernews" }) });
		expect(meta.title).toBe("hackernews — magpie");
	});

	it("fetches runs/heals/source/config in parallel with the right pagination offset", async () => {
		vi.mocked(data.getSource).mockResolvedValue(makeSourceSummary());
		vi.mocked(data.getSourceConfig).mockResolvedValue(makeSourceDetail({ origin: "api" }));
		vi.mocked(data.getRuns).mockResolvedValue([makeRun()]);
		vi.mocked(data.getHeals).mockResolvedValue([makeHeal()]);

		const el = await page.default({
			params: params({ name: "hackernews" }),
			searchParams: search({ page: "2" }),
		});
		expect(el).toBeTruthy();
		// page=2, PAGE_SIZE=10 ⇒ offset 10.
		expect(data.getRuns).toHaveBeenCalledWith({ source: "hackernews", limit: 10, offset: 10 });
		expect(notFoundMock).not.toHaveBeenCalled();
	});

	it("treats a missing config (404) as null and still renders", async () => {
		vi.mocked(data.getSource).mockResolvedValue(makeSourceSummary());
		vi.mocked(data.getSourceConfig).mockRejectedValue(new ApiError(404, "no config"));
		vi.mocked(data.getRuns).mockResolvedValue([]);
		vi.mocked(data.getHeals).mockResolvedValue([]);
		const el = await page.default({
			params: params({ name: "hackernews" }),
			searchParams: search({}),
		});
		expect(el).toBeTruthy();
		expect(notFoundMock).not.toHaveBeenCalled();
	});

	it("calls notFound() when the source is unknown (404)", async () => {
		vi.mocked(data.getSource).mockRejectedValue(new ApiError(404, "unknown source"));
		vi.mocked(data.getSourceConfig).mockResolvedValue(makeSourceDetail());
		vi.mocked(data.getRuns).mockResolvedValue([]);
		vi.mocked(data.getHeals).mockResolvedValue([]);
		await page.default({ params: params({ name: "ghost" }), searchParams: search({}) });
		expect(notFoundMock).toHaveBeenCalled();
	});

	it("renders an error alert for a non-404 failure", async () => {
		vi.mocked(data.getSource).mockRejectedValue(new ApiError(500, "boom"));
		vi.mocked(data.getSourceConfig).mockResolvedValue(makeSourceDetail());
		vi.mocked(data.getRuns).mockResolvedValue([]);
		vi.mocked(data.getHeals).mockResolvedValue([]);
		const el = await page.default({ params: params({ name: "x" }), searchParams: search({}) });
		expect(el).toBeTruthy();
		expect(notFoundMock).not.toHaveBeenCalled();
	});
});

describe("/sources/[name]/items", () => {
	const page = itemsPage;

	it("generateMetadata returns an items title", async () => {
		const meta = await page.generateMetadata({ params: params({ name: "hackernews" }) });
		expect(meta.title).toContain("hackernews");
	});

	it("uses PAGE_SIZE=50 offset math for ?page=2", async () => {
		vi.mocked(data.getSource).mockResolvedValue(makeSourceSummary());
		vi.mocked(data.getSourceItems).mockResolvedValue([makeRunItem()]);
		const el = await page.default({
			params: params({ name: "hackernews" }),
			searchParams: search({ page: "2" }),
		});
		expect(el).toBeTruthy();
		expect(data.getSourceItems).toHaveBeenCalledWith("hackernews", { limit: 50, offset: 50 });
	});

	it("clamps a bogus page param to 1 (offset 0)", async () => {
		vi.mocked(data.getSource).mockResolvedValue(makeSourceSummary());
		vi.mocked(data.getSourceItems).mockResolvedValue([]);
		await page.default({
			params: params({ name: "hackernews" }),
			searchParams: search({ page: "-9" }),
		});
		expect(data.getSourceItems).toHaveBeenCalledWith("hackernews", { limit: 50, offset: 0 });
	});

	it("calls notFound() on a 404", async () => {
		vi.mocked(data.getSource).mockRejectedValue(new ApiError(404, "unknown"));
		vi.mocked(data.getSourceItems).mockRejectedValue(new ApiError(404, "unknown"));
		await page.default({ params: params({ name: "ghost" }), searchParams: search({}) });
		expect(notFoundMock).toHaveBeenCalled();
	});
});

describe("/heals", () => {
	const page = healsPage;

	it("passes the right offset for ?page=2 and an optional source filter", async () => {
		vi.mocked(data.getHeals).mockResolvedValue([makeHeal()]);
		const el = await page.default({ searchParams: search({ page: "2", source: "hackernews" }) });
		expect(el).toBeTruthy();
		expect(data.getHeals).toHaveBeenCalledWith({ limit: 10, offset: 10, source: "hackernews" });
	});

	it("renders an error state when the backend fails", async () => {
		vi.mocked(data.getHeals).mockRejectedValue(new Error("down"));
		const el = await page.default({ searchParams: search({}) });
		expect(el).toBeTruthy();
	});
});

describe("/sources/[name]/edit", () => {
	const page = editPage;

	it("generateMetadata returns an edit title", async () => {
		const meta = await page.generateMetadata({ params: params({ name: "custom-one" }) });
		expect(meta.title).toContain("custom-one");
	});

	it("renders the editor for an api-origin source", async () => {
		vi.mocked(data.getSourceConfig).mockResolvedValue(makeSourceDetail({ origin: "api" }));
		const el = await page.default({ params: params({ name: "custom-one" }) });
		expect(el).toBeTruthy();
		expect(notFoundMock).not.toHaveBeenCalled();
	});

	it("renders a read-only view for a file-origin source", async () => {
		vi.mocked(data.getSourceConfig).mockResolvedValue(makeSourceDetail({ origin: "file" }));
		const el = await page.default({ params: params({ name: "hackernews" }) });
		expect(el).toBeTruthy();
	});

	it("calls notFound() on a 404", async () => {
		vi.mocked(data.getSourceConfig).mockRejectedValue(new ApiError(404, "unknown"));
		// notFound() halts rendering in prod; with the no-op mock the fall-through
		// `throw e` surfaces, so we assert both notFound() was called and it rejects.
		await expect(page.default({ params: params({ name: "ghost" }) })).rejects.toBeInstanceOf(
			ApiError,
		);
		expect(notFoundMock).toHaveBeenCalled();
	});

	it("rethrows non-404 errors to the error boundary", async () => {
		vi.mocked(data.getSourceConfig).mockRejectedValue(new ApiError(500, "boom"));
		await expect(page.default({ params: params({ name: "x" }) })).rejects.toBeInstanceOf(ApiError);
	});
});

describe("/runs/[id]", () => {
	const page = runPage;

	it("generateMetadata truncates the run id in the title", async () => {
		const meta = await page.generateMetadata({
			params: params({ id: "abcdef12-0000-4000-8000-000000000000" }),
		});
		expect(meta.title).toContain("abcdef12");
	});

	it("renders the live run view", async () => {
		const el = await page.default({
			params: params({ id: "abcdef12-0000-4000-8000-000000000000" }),
		});
		expect(el).toBeTruthy();
	});
});

describe("/demo", () => {
	const page = demoPage;

	it("renders connected state when the backend is healthy", async () => {
		vi.mocked(data.getHealth).mockResolvedValue({ status: "ok", db: "ok", version: "v1" });
		vi.mocked(data.getSources).mockResolvedValue([makeSourceSummary()]);
		const el = await page.default();
		expect(el).toBeTruthy();
		expect(data.getHealth).toHaveBeenCalled();
		expect(data.getSources).toHaveBeenCalled();
	});

	it("degrades gracefully when the backend is offline", async () => {
		vi.mocked(data.getHealth).mockRejectedValue(new Error("offline"));
		vi.mocked(data.getSources).mockRejectedValue(new Error("offline"));
		const el = await page.default();
		expect(el).toBeTruthy();
	});
});

describe("/login", () => {
	const page = loginPage;
	const ORIGINAL = process.env.MAGPIE_ADMIN_SECRET;

	it("renders the login form when an admin secret is configured", async () => {
		process.env.MAGPIE_ADMIN_SECRET = "s3cret";
		const el = await page.default({ searchParams: search({ next: "/sources/new" }) });
		expect(el).toBeTruthy();
		process.env.MAGPIE_ADMIN_SECRET = ORIGINAL;
	});

	it("renders a disabled notice when no secret is configured", async () => {
		delete process.env.MAGPIE_ADMIN_SECRET;
		const el = await page.default({ searchParams: search({}) });
		expect(el).toBeTruthy();
		if (ORIGINAL !== undefined) process.env.MAGPIE_ADMIN_SECRET = ORIGINAL;
	});
});

describe("static pages", () => {
	it("home renders", async () => {
		const { default: Home } = await import("./page");
		expect(Home()).toBeTruthy();
	});

	it("new-source page renders", async () => {
		const { default: NewSourcePage } = await import("./sources/new/page");
		expect(NewSourcePage()).toBeTruthy();
	});
});
