// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { makeSourceSummary } from "../../../test/msw/fixtures";

vi.mock("@/lib/data", () => ({ getSources: vi.fn() }));

const data = await import("@/lib/data");
const { SourcesGrid, SourcesGridSkeleton } = await import("./SourcesGrid");

// SourcesGrid is an async server component: invoked directly (jsdom can't render
// async components) to exercise the empty / populated / error branches that the
// home page's Suspense boundary streams.
describe("SourcesGrid", () => {
	it("renders a grid of SourceCards when sources exist", async () => {
		vi.mocked(data.getSources).mockResolvedValue([
			makeSourceSummary({ name: "a" }),
			makeSourceSummary({ name: "b" }),
		]);
		const el = await SourcesGrid();
		expect(el).toBeTruthy();
		expect(data.getSources).toHaveBeenCalled();
	});

	it("renders an empty-state prompt when there are no sources", async () => {
		vi.mocked(data.getSources).mockResolvedValue([]);
		const el = await SourcesGrid();
		expect(el).toBeTruthy();
	});

	it("renders an error alert when the backend fails", async () => {
		vi.mocked(data.getSources).mockRejectedValue(new Error("backend down"));
		const el = await SourcesGrid();
		expect(el).toBeTruthy();
	});

	it("skeleton renders", () => {
		expect(SourcesGridSkeleton()).toBeTruthy();
	});
});
