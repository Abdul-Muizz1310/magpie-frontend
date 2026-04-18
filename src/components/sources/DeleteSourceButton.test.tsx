import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { renderUI } from "../../../test/utils/render";
import { DeleteSourceButton } from "./DeleteSourceButton";

vi.mock("@/lib/actions", () => ({
	deleteSourceAction: vi.fn(),
}));

const actions = await import("@/lib/actions");
const deleteSourceAction = vi.mocked(actions.deleteSourceAction);

afterEach(() => {
	deleteSourceAction.mockReset();
});

describe("DeleteSourceButton", () => {
	it("initial state shows only the delete trigger", () => {
		renderUI(<DeleteSourceButton source="custom-one" />);
		expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
	});

	it("clicking delete reveals confirm + cancel", async () => {
		const { user } = renderUI(<DeleteSourceButton source="custom-one" />);
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
	});

	it("cancel returns to initial state", async () => {
		const { user } = renderUI(<DeleteSourceButton source="custom-one" />);
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await user.click(screen.getByRole("button", { name: /cancel/i }));
		expect(screen.queryByRole("button", { name: /confirm/i })).toBeNull();
	});

	it("confirm calls action and navigates home on success", async () => {
		deleteSourceAction.mockResolvedValueOnce({ ok: true, data: null });
		const { user } = renderUI(<DeleteSourceButton source="custom-one" />);
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await user.click(screen.getByRole("button", { name: /confirm/i }));
		expect(deleteSourceAction).toHaveBeenCalledWith("custom-one");
		expect(routerSpies.push).toHaveBeenCalledWith("/");
	});

	it("shows error and returns to chooser on failure", async () => {
		deleteSourceAction.mockResolvedValueOnce({
			ok: false,
			status: 409,
			message: "source 'custom-one' is immutable (file-origin)",
		});
		const { user } = renderUI(<DeleteSourceButton source="custom-one" />);
		await user.click(screen.getByRole("button", { name: /^delete$/i }));
		await user.click(screen.getByRole("button", { name: /confirm/i }));
		expect(await screen.findByText(/file-origin/i)).toBeInTheDocument();
		expect(routerSpies.push).not.toHaveBeenCalled();
	});
});
