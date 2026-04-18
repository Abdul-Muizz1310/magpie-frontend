import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Run } from "@/lib/schemas";
import { RunRow } from "./RunRow";

const baseRun: Run = {
	id: "11111111-1111-4111-8111-111111111111",
	source: "hackernews",
	status: "ok",
	started_at: "2026-04-10T12:00:00Z",
	ended_at: "2026-04-10T12:01:00Z",
	duration_ms: 60_000,
	item_count: 30,
	items_new: 5,
	items_updated: 2,
	items_removed: 1,
	error: null,
	job_id: null,
};

describe("RunRow", () => {
	it("shows new/updated/removed counts", () => {
		render(<RunRow run={baseRun} />);
		expect(screen.getByText(/5 new/)).toBeInTheDocument();
		expect(screen.getByText(/2 updated/)).toBeInTheDocument();
		expect(screen.getByText(/1 removed/)).toBeInTheDocument();
	});

	it("omits zero-valued updated/removed rows", () => {
		const run = { ...baseRun, items_updated: 0, items_removed: 0 };
		render(<RunRow run={run} />);
		expect(screen.queryByText(/updated/)).toBeNull();
		expect(screen.queryByText(/removed/)).toBeNull();
	});

	it("renders the error message when present", () => {
		const run: Run = { ...baseRun, status: "error", error: "selector broke" };
		render(<RunRow run={run} />);
		expect(screen.getByText("selector broke")).toBeInTheDocument();
	});

	it("shows 'in progress' when no ended_at and status is running", () => {
		const run: Run = {
			...baseRun,
			status: "running",
			ended_at: null,
			duration_ms: 0,
		};
		render(<RunRow run={run} />);
		expect(screen.getByText(/in progress/i)).toBeInTheDocument();
	});

	it("links to /runs/{id}", () => {
		render(<RunRow run={baseRun} />);
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", `/runs/${baseRun.id}`);
	});
});
