import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeSourceSummary } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
import { SourceCard } from "./SourceCard";

describe("SourceCard", () => {
	it("links to the source detail page", () => {
		renderUI(<SourceCard source={makeSourceSummary({ name: "hackernews" })} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/sources/hackernews");
	});

	it("renders item count + short config SHA", () => {
		renderUI(
			<SourceCard source={makeSourceSummary({ config_sha: "abc123def456", item_count: 42 })} />,
		);
		expect(screen.getByText(/42 items/)).toBeInTheDocument();
		expect(screen.getByText("abc123d")).toBeInTheDocument();
	});

	it("shows 'no description' italic when description is empty", () => {
		renderUI(<SourceCard source={makeSourceSummary({ description: "" })} />);
		expect(screen.getByText(/no description/i)).toBeInTheDocument();
	});
});
