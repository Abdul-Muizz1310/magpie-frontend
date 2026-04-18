import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeHeal } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
import { HealEntry } from "./HealEntry";

describe("HealEntry", () => {
	it("renders PR link when pr_url present", () => {
		renderUI(<HealEntry heal={makeHeal()} />);
		const link = screen.getByRole("link", { name: /magpie-backend\/pull\/1/i });
		expect(link).toHaveAttribute("href", expect.stringContaining("github.com"));
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("renders db-patched badge when pr_url is null", () => {
		renderUI(<HealEntry heal={makeHeal({ pr_url: null })} />);
		expect(screen.getByText(/db-patched/i)).toBeInTheDocument();
	});

	it("shows the truncated run id when run_id present", () => {
		renderUI(<HealEntry heal={makeHeal()} />);
		expect(screen.getByText(/11111111/)).toBeInTheDocument();
	});

	it("omits run chip when run_id is null", () => {
		renderUI(<HealEntry heal={makeHeal({ run_id: null })} />);
		expect(screen.queryByText(/triggered by run/i)).toBeNull();
	});
});
