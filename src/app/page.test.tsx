import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";
import Home from "./page";

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/lib/api", () => ({
	fetchSources: vi.fn(),
}));

import { fetchSources } from "@/lib/api";

const mockFetchSources = fetchSources as Mock;

afterEach(() => vi.restoreAllMocks());

describe("Sources List Page (/)", () => {
	it("renders a card for each source returned by the API", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "hackernews",
				description: "Scrape Hacker News",
				last_run_at: "2026-04-10T12:00:00Z",
				last_status: "ok",
				item_count: 30,
				config_sha: "abc",
			},
			{
				name: "arxiv-cs",
				description: "Arxiv CS papers",
				last_run_at: "2026-04-09T08:00:00Z",
				last_status: "empty",
				item_count: 0,
				config_sha: "def",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByText("hackernews")).toBeInTheDocument();
		expect(screen.getByText("arxiv-cs")).toBeInTheDocument();
	});

	it("displays name, description, status badge, item count, and relative time", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "hackernews",
				description: "Scrape Hacker News",
				last_run_at: "2026-04-10T12:00:00Z",
				last_status: "ok",
				item_count: 30,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByRole("heading", { name: "hackernews" })).toBeInTheDocument();
		expect(screen.getByText("Scrape Hacker News")).toBeInTheDocument();
		expect(screen.getAllByText("ok").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText(/30 items/)).toBeInTheDocument();
	});

	it("links cards to /sources/{name}", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "hackernews",
				description: "HN",
				last_run_at: null,
				last_status: "ok",
				item_count: 10,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		const links = screen.getAllByRole("link");
		const cardLink = links.find((l) => l.getAttribute("href") === "/sources/hackernews");
		expect(cardLink).toBeDefined();
	});

	it('shows "No sources configured" when zero sources returned', async () => {
		mockFetchSources.mockResolvedValue([]);

		const page = await Home();
		render(page);

		expect(screen.getByText(/no sources configured/i)).toBeInTheDocument();
	});

	it('shows "Never" when last_run_at is null', async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "hackernews",
				description: "HN",
				last_run_at: null,
				last_status: "ok",
				item_count: 0,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByText("Never")).toBeInTheDocument();
	});

	it("shows gray badge when last_status is null", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "hackernews",
				description: "HN",
				last_run_at: null,
				last_status: null,
				item_count: 0,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		const badge = screen.getByTestId("status-badge");
		expect(badge.className).toContain("bg-fg-faint");
	});

	it("shows error banner when API fails", async () => {
		mockFetchSources.mockRejectedValue(new Error("Connection refused"));

		const page = await Home();
		render(page);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});

	it("renders healed status icon and dot correctly", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "healed-source",
				description: "A healed source",
				last_run_at: "2026-04-10T12:00:00Z",
				last_status: "healed",
				item_count: 10,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByText("healed-source")).toBeInTheDocument();
		const badge = screen.getByTestId("status-badge");
		expect(badge.className).toContain("bg-accent-teal");
	});

	it("renders error status icon and dot correctly", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "error-source",
				description: "An errored source",
				last_run_at: "2026-04-10T12:00:00Z",
				last_status: "error",
				item_count: 5,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByText("error-source")).toBeInTheDocument();
		const badge = screen.getByTestId("status-badge");
		expect(badge.className).toContain("bg-error");
	});

	it("falls back to generic error message when API rejects with non-Error", async () => {
		mockFetchSources.mockRejectedValue("string error");

		const page = await Home();
		render(page);

		expect(screen.getByRole("alert")).toHaveTextContent("Failed to fetch sources");
	});

	it("renders minutes-ago format for recent last_run_at", async () => {
		const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
		mockFetchSources.mockResolvedValue([
			{
				name: "recent-source",
				description: "Recently ran",
				last_run_at: thirtyMinutesAgo,
				last_status: "ok",
				item_count: 5,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByText("30m ago")).toBeInTheDocument();
	});

	it("renders hours-ago format for last_run_at a few hours old", async () => {
		const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
		mockFetchSources.mockResolvedValue([
			{
				name: "hours-source",
				description: "Ran hours ago",
				last_run_at: threeHoursAgo,
				last_status: "ok",
				item_count: 5,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		expect(screen.getByText("3h ago")).toBeInTheDocument();
	});

	it("renders fallback badge style for unrecognized status string", async () => {
		mockFetchSources.mockResolvedValue([
			{
				name: "pending-source",
				description: "Unknown status",
				last_run_at: null,
				last_status: "pending",
				item_count: 0,
				config_sha: "abc",
			},
		]);

		const page = await Home();
		render(page);

		const badge = screen.getByTestId("status-badge");
		expect(badge.className).toContain("bg-fg-faint");
	});
});
