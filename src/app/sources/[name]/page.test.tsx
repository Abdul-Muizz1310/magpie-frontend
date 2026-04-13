import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("@/lib/api", () => ({
	fetchSource: vi.fn(),
	fetchRuns: vi.fn(),
	ApiError: class ApiError extends Error {
		constructor(
			public status: number,
			message: string,
		) {
			super(message);
		}
	},
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("next/navigation", () => ({
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));

import { ApiError, fetchRuns, fetchSource } from "@/lib/api";
import SourceDetailPage from "./page";

const mockFetchSource = fetchSource as Mock;
const mockFetchRuns = fetchRuns as Mock;

afterEach(() => vi.restoreAllMocks());

const mockSource = {
	name: "hackernews",
	description: "Scrape Hacker News front page",
	last_run_at: "2026-04-10T12:00:00Z",
	last_status: "ok",
	item_count: 30,
	config_sha: "abc123",
};

const mockRuns = [
	{
		id: 2,
		source: "hackernews",
		started_at: "2026-04-10T12:00:00Z",
		ended_at: "2026-04-10T12:01:00Z",
		items_new: 5,
		items_updated: 2,
		items_removed: 1,
		status: "ok",
		error: null,
	},
	{
		id: 1,
		source: "hackernews",
		started_at: "2026-04-09T12:00:00Z",
		ended_at: "2026-04-09T12:02:00Z",
		items_new: 30,
		items_updated: 0,
		items_removed: 0,
		status: "ok",
		error: null,
	},
];

describe("Source Detail Page (/sources/[name])", () => {
	it("renders source name, description, and status badge in header", async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue(mockRuns);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByRole("heading", { name: /hackernews/i })).toBeInTheDocument();
		expect(screen.getByText("Scrape Hacker News front page")).toBeInTheDocument();
		expect(screen.getAllByText("ok").length).toBeGreaterThanOrEqual(1);
	});

	it("renders run timeline with correct data", async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue(mockRuns);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		// Should show both runs
		expect(screen.getByText(/5 new/i)).toBeInTheDocument();
		expect(screen.getByText(/30 new/i)).toBeInTheDocument();
	});

	it("shows formatted dates and status icons for runs", async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue(mockRuns);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		// Should have status indicators
		const statusIcons = screen.getAllByTestId("run-status-icon");
		expect(statusIcons).toHaveLength(2);
	});

	it('shows "No runs recorded" when source has zero runs', async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue([]);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByText(/no runs recorded/i)).toBeInTheDocument();
	});

	it('shows "In progress" for run with null ended_at', async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue([{ ...mockRuns[0], ended_at: null, status: "running" }]);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByText(/in progress/i)).toBeInTheDocument();
	});

	it("displays error text for runs with error", async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue([
			{ ...mockRuns[0], status: "error", error: "Connection timeout" },
		]);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByText("Connection timeout")).toBeInTheDocument();
	});

	it("triggers notFound() when source returns 404", async () => {
		mockFetchSource.mockRejectedValue(new ApiError(404, "source not found"));
		mockFetchRuns.mockResolvedValue([]);

		await expect(
			SourceDetailPage({ params: Promise.resolve({ name: "nonexistent" }) }),
		).rejects.toThrow("NEXT_NOT_FOUND");
	});

	it("shows error banner when API is unreachable", async () => {
		mockFetchSource.mockRejectedValue(new Error("fetch failed"));
		mockFetchRuns.mockRejectedValue(new Error("fetch failed"));

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("renders default warning icon for unknown run status", async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue([
			{ ...mockRuns[0], status: "unknown-status" },
		]);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		const statusIcons = screen.getAllByTestId("run-status-icon");
		expect(statusIcons).toHaveLength(1);
	});

	it("falls back to generic error message when API rejects with non-Error", async () => {
		mockFetchSource.mockRejectedValue("string error");
		mockFetchRuns.mockRejectedValue("string error");

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByRole("alert")).toHaveTextContent("Failed to load source");
	});

	it("renders short duration (seconds) for runs under 60 seconds", async () => {
		mockFetchSource.mockResolvedValue(mockSource);
		mockFetchRuns.mockResolvedValue([
			{
				...mockRuns[0],
				started_at: "2026-04-10T12:00:00Z",
				ended_at: "2026-04-10T12:00:30Z",
			},
		]);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByText("30s")).toBeInTheDocument();
	});

	it('shows "idle" when source last_status is null', async () => {
		mockFetchSource.mockResolvedValue({ ...mockSource, last_status: null });
		mockFetchRuns.mockResolvedValue([]);

		const page = await SourceDetailPage({ params: Promise.resolve({ name: "hackernews" }) });
		render(page);

		expect(screen.getByText("idle")).toBeInTheDocument();
	});
});
