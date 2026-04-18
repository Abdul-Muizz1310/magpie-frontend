import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { renderUI } from "../../../test/utils/render";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
	it("disables prev on page 1", () => {
		renderUI(<Pagination page={1} hasMore />);
		const prev = screen.getByRole("button", { name: /prev/i });
		expect(prev).toBeDisabled();
	});

	it("disables next when hasMore is false", () => {
		renderUI(<Pagination page={3} hasMore={false} />);
		const next = screen.getByRole("button", { name: /next/i });
		expect(next).toBeDisabled();
	});

	it("pushes to ?page=3 when clicking next on page 2", async () => {
		const { user } = renderUI(<Pagination page={2} hasMore />);
		await user.click(screen.getByRole("button", { name: /next/i }));
		expect(routerSpies.push).toHaveBeenCalledTimes(1);
		const arg = routerSpies.push.mock.calls[0][0] as string;
		expect(arg).toMatch(/page=3/);
	});

	it("drops ?page=1 on prev from page 2 (clean URL for default)", async () => {
		const { user } = renderUI(<Pagination page={2} hasMore />);
		await user.click(screen.getByRole("button", { name: /prev/i }));
		expect(routerSpies.push).toHaveBeenCalledTimes(1);
		const arg = routerSpies.push.mock.calls[0][0] as string;
		expect(arg).not.toMatch(/page=/);
	});

	it("renders the current page number", () => {
		renderUI(<Pagination page={4} hasMore />);
		expect(screen.getByText(/page 4/i)).toBeInTheDocument();
	});
});
