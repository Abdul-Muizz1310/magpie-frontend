import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { makeEnqueueResponse } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
import { RunTriggerPanel } from "./RunTriggerPanel";

vi.mock("@/lib/actions", () => ({
	enqueueScrapeAction: vi.fn(),
}));

const actions = await import("@/lib/actions");
const enqueueScrapeAction = vi.mocked(actions.enqueueScrapeAction);

afterEach(() => {
	enqueueScrapeAction.mockReset();
});

describe("RunTriggerPanel", () => {
	it("shows only the enqueue trigger — no sync button", () => {
		renderUI(<RunTriggerPanel source="hackernews" />);
		expect(screen.getByRole("button", { name: /enqueue run/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /run now/i })).toBeNull();
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

	it("surfaces enqueue errors without navigating", async () => {
		enqueueScrapeAction.mockResolvedValueOnce({
			ok: false,
			status: 503,
			message: "worker down",
		});
		const { user } = renderUI(<RunTriggerPanel source="hackernews" />);
		await user.click(screen.getByRole("button", { name: /enqueue run/i }));
		expect(await screen.findByText(/failed to enqueue/i)).toBeInTheDocument();
		expect(screen.getByText("worker down")).toBeInTheDocument();
		expect(routerSpies.push).not.toHaveBeenCalled();
	});
});
