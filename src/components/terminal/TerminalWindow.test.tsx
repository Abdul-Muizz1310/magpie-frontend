import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TerminalWindow } from "./TerminalWindow";

describe("TerminalWindow", () => {
	it("applies terminal-glow-strong class when strong prop is true", () => {
		render(
			<TerminalWindow title="test.log" strong>
				content
			</TerminalWindow>,
		);

		const section = screen.getByText("content").closest("section");
		expect(section?.className).toContain("terminal-glow-strong");
		expect(section?.className).not.toContain("terminal-glow ");
	});

	it("applies terminal-glow class when strong prop is false (default)", () => {
		render(
			<TerminalWindow title="test.log">
				content
			</TerminalWindow>,
		);

		const section = screen.getByText("content").closest("section");
		expect(section?.className).toContain("terminal-glow");
		expect(section?.className).not.toContain("terminal-glow-strong");
	});
});
