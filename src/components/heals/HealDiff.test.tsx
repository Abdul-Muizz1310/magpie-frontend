import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HealDiff } from "./HealDiff";

describe("HealDiff", () => {
	it("renders field label and both selectors", () => {
		render(
			<HealDiff
				oldConfig={{ field: "title", selector: "span.old" }}
				newConfig={{ field: "title", selector: "span.new", selector_type: "css" }}
			/>,
		);
		expect(screen.getByText("title")).toBeInTheDocument();
		expect(screen.getByText("span.old")).toBeInTheDocument();
		expect(screen.getByText("span.new")).toBeInTheDocument();
	});

	it("renders confidence percent when present", () => {
		render(
			<HealDiff
				oldConfig={{ field: "title", selector: "a" }}
				newConfig={{ field: "title", selector: "b", confidence: 0.87 }}
			/>,
		);
		expect(screen.getByText(/87%/)).toBeInTheDocument();
	});

	it("renders reasoning block when present", () => {
		render(
			<HealDiff
				oldConfig={{ field: "title", selector: "a" }}
				newConfig={{
					field: "title",
					selector: "b",
					reasoning: "old selector class was renamed to .titleline",
				}}
			/>,
		);
		expect(screen.getByText(/renamed to/)).toBeInTheDocument();
	});

	it("omits confidence badge when missing", () => {
		render(
			<HealDiff
				oldConfig={{ field: "title", selector: "a" }}
				newConfig={{ field: "title", selector: "b" }}
			/>,
		);
		expect(screen.queryByText(/confidence/i)).toBeNull();
	});
});
