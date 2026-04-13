import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Prompt } from "./Prompt";

describe("Prompt", () => {
	it("renders cursor element when cursor prop is true", () => {
		render(<Prompt cursor>hello</Prompt>);

		expect(screen.getByText("hello")).toBeInTheDocument();
		const container = screen.getByText("hello").closest("div");
		const cursorEl = container?.querySelector(".cursor-blink");
		expect(cursorEl).toBeTruthy();
	});

	it("does not render cursor element when cursor prop is false", () => {
		render(<Prompt>hello</Prompt>);

		const container = screen.getByText("hello").closest("div");
		const cursorEl = container?.querySelector(".cursor-blink");
		expect(cursorEl).toBeNull();
	});
});
