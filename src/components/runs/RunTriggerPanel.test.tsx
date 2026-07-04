import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { makeEnqueueResponse, makeScrapeResult } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
import { RunTriggerPanel } from "./RunTriggerPanel";

vi.mock("@/lib/actions", () => ({
	enqueueScrapeAction: vi.fn(),
	scrapeOnceAction: vi.fn(),
}));

const actions = await import("@/lib/actions");
const enqueueScrapeAction = vi.mocked(actions.enqueueScrapeAction);
const scrapeOnceAction = vi.mocked(actions.scrapeOnceAction);

afterEach(() => {
	enqueueScrapeAction.mockReset();
	scrapeOnceAction.mockReset();
});

describe("RunTriggerPanel", () => {
	it("offers both an enqueue trigger and a sync 'scrape now' trigger", () => {
		renderUI(<RunTriggerPanel source="hackernews" />);
		expect(screen.getByRole("button", { name: /enqueue run/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /scrape now/i })).toBeInTheDocument();
	});

	it("enqueues with default max_items and navigates to /runs/{id}", async () => {
		enqueueScrapeAction.mockResolvedValueOnce({ ok: true, data: makeEnqueueResponse() });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /enqueue run/i }));
		await vi.waitFor(() => {
			expect(routerSpies.push).toHaveBeenCalledWith(expect.stringMatching(/^\/runs\//));
		});
		expect(enqueueScrapeAction).toHaveBeenCalledWith("hackernews", 10);
	});

	it("respects max_items input", async () => {
		enqueueScrapeAction.mockResolvedValueOnce({ ok: true, data: makeEnqueueResponse() });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "25" } });
		await user.click(screen.getByRole("button", { name: /enqueue run/i }));
		expect(enqueueScrapeAction).toHaveBeenCalledWith("hackernews", 25);
	});

	it("clamps max_items to 1-100", async () => {
		enqueueScrapeAction.mockResolvedValueOnce({ ok: true, data: makeEnqueueResponse() });
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		const input = screen.getByRole("spinbutton") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "999" } });
		await user.click(screen.getByRole("button", { name: /enqueue run/i }));
		expect(enqueueScrapeAction).toHaveBeenCalledWith("hackernews", 100);
	});

	it("surfaces trigger errors without navigating", async () => {
		enqueueScrapeAction.mockResolvedValueOnce({
			ok: false,
			status: 503,
			message: "worker down",
		});
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /enqueue run/i }));
		expect(await screen.findByText(/scrape trigger failed/i)).toBeInTheDocument();
		expect(screen.getByText("worker down")).toBeInTheDocument();
		expect(routerSpies.push).not.toHaveBeenCalled();
	});

	it("runs a synchronous scrape and renders the scraped items inline", async () => {
		scrapeOnceAction.mockResolvedValueOnce({
			ok: true,
			data: makeScrapeResult({ items: [], run_id: "aaaaaaaa-0000-4000-8000-000000000000" }),
		});
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /scrape now/i }));
		// Sync path stays on the page (no redirect) and shows the run summary inline.
		await vi.waitFor(() => {
			expect(scrapeOnceAction).toHaveBeenCalledWith("hackernews", 10);
		});
		expect(await screen.findByText(/scraped 0 items/i)).toBeInTheDocument();
		expect(routerSpies.push).not.toHaveBeenCalled();
	});

	it("surfaces an auth failure from the sync scrape trigger", async () => {
		scrapeOnceAction.mockResolvedValueOnce({
			ok: false,
			status: 401,
			message: "Not authorized. Sign in to perform this action.",
		});
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /scrape now/i }));
		expect(await screen.findByText(/scrape trigger failed/i)).toBeInTheDocument();
		expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
	});
});
