import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelativeTime } from "./RelativeTime";

describe("RelativeTime", () => {
	beforeEach(() => {
		// Freeze clock for deterministic relative strings.
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders 'never' when iso is null", () => {
		render(<RelativeTime iso={null} />);
		expect(screen.getByText("never")).toBeInTheDocument();
	});

	it("formats minutes ago", () => {
		render(<RelativeTime iso={new Date("2026-04-10T11:55:00Z").toISOString()} />);
		expect(screen.getByText(/5m ago/)).toBeInTheDocument();
	});

	it("formats hours ago", () => {
		render(<RelativeTime iso={new Date("2026-04-10T09:00:00Z").toISOString()} />);
		expect(screen.getByText(/3h ago/)).toBeInTheDocument();
	});

	it("formats days ago", () => {
		render(<RelativeTime iso={new Date("2026-04-07T12:00:00Z").toISOString()} />);
		expect(screen.getByText(/3d ago/)).toBeInTheDocument();
	});

	it("renders 'just now' for future timestamps (clock skew)", () => {
		render(<RelativeTime iso={new Date("2026-04-10T12:00:01Z").toISOString()} />);
		expect(screen.getByText("just now")).toBeInTheDocument();
	});

	it("sets title and dateTime attributes for a11y + tooltip", () => {
		const iso = "2026-04-10T11:55:00Z";
		render(<RelativeTime iso={iso} />);
		const el = screen.getByText(/5m ago/);
		expect(el).toHaveAttribute("title", iso);
		expect(el).toHaveAttribute("datetime", iso);
	});

	it("renders seconds for fresh timestamps", () => {
		render(<RelativeTime iso={new Date("2026-04-10T11:59:55Z").toISOString()} />);
		expect(screen.getByText(/5s ago/)).toBeInTheDocument();
	});
});
