import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { makeEnqueueResponse, makeScrapeResult } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
import { RunTriggerPanel } from "./RunTriggerPanel";

vi.mock("@/lib/actions", () => ({
	scrapeOnceAction: vi.fn(),
	enqueueScrapeAction: vi.fn(),
}));

const actions = await import("@/lib/actions");
const scrapeOnceAction = vi.mocked(actions.scrapeOnceAction);
const enqueueScrapeAction = vi.mocked(actions.enqueueScrapeAction);

afterEach(() => {
	scrapeOnceAction.mockReset();
	enqueueScrapeAction.mockReset();
});

describe("RunTriggerPanel", () => {
	it("runs sync scrape and shows items", async () => {
		scrapeOnceAction.mockResolvedValueOnce({
			ok: true,
			data: makeScrapeResult({ source: "hackernews" }),
		});
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /run now/i }));
		expect(await screen.findByText(/items \(1\)/i)).toBeInTheDocument();
		expect(scrapeOnceAction).toHaveBeenCalledWith("hackernews", 10);
	});

	it("enqueues and navigates to /runs/{id}", async () => {
		enqueueScrapeAction.mockResolvedValueOnce({ ok: true, data: makeEnqueueResponse() });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /enqueue/i }));
		await vi.waitFor(() => {
			expect(routerSpies.push).toHaveBeenCalledWith(expect.stringMatching(/^\/runs\//));
		});
	});

	it("surfaces sync-scrape errors without navigating", async () => {
		scrapeOnceAction.mockResolvedValueOnce({ ok: false, status: 503, message: "boom" });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /run now/i }));
		expect(await screen.findByText(/trigger failed/i)).toBeInTheDocument();
		expect(screen.getByText("boom")).toBeInTheDocument();
		expect(routerSpies.push).not.toHaveBeenCalled();
	});

	it("respects max_items input", async () => {
		scrapeOnceAction.mockResolvedValueOnce({ ok: true, data: makeScrapeResult() });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "25" } });
		await user.click(screen.getByRole("button", { name: /run now/i }));
		expect(scrapeOnceAction).toHaveBeenCalledWith("hackernews", 25);
	});

	it("clamps max_items to 1-100", async () => {
		scrapeOnceAction.mockResolvedValueOnce({ ok: true, data: makeScrapeResult() });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "999" } });
		await user.click(screen.getByRole("button", { name: /run now/i }));
		expect(scrapeOnceAction).toHaveBeenCalledWith("hackernews", 100);
	});
});
