import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/lib/api", () => ({
	fetchHeals: vi.fn(),
}));

import { fetchHeals } from "@/lib/api";
import HealsPage from "./page";

const mockFetchHeals = fetchHeals as Mock;

afterEach(() => vi.restoreAllMocks());

const mockHeal = {
	id: 1,
	source: "hackernews",
	run_id: 42,
	old_config: { selector: "span.old::text" },
	new_config: { selector: "span.new::text" },
	pr_url: "https://github.com/Abdul-Muizz1310/magpie-backend/pull/1",
	created_at: "2026-04-10T13:00:00Z",
};

describe("Heals Page (/heals)", () => {
	it("renders a list of heal entries with all fields", async () => {
		mockFetchHeals.mockResolvedValue([mockHeal]);

		const page = await HealsPage();
		render(page);

		expect(screen.getByText("hackernews")).toBeInTheDocument();
		expect(screen.getByText(/pull\/1/)).toBeInTheDocument();
	});

	it("PR link opens in new tab with security attributes", async () => {
		mockFetchHeals.mockResolvedValue([mockHeal]);

		const page = await HealsPage();
		render(page);

		const prLink = screen.getByRole("link", { name: /pull/i });
		expect(prLink).toHaveAttribute("target", "_blank");
		expect(prLink).toHaveAttribute("rel", expect.stringContaining("noopener"));
	});

	it("shows config diff as formatted JSON", async () => {
		mockFetchHeals.mockResolvedValue([mockHeal]);

		const page = await HealsPage();
		render(page);

		expect(screen.getByText(/span\.old/)).toBeInTheDocument();
		expect(screen.getByText(/span\.new/)).toBeInTheDocument();
	});

	it("source name links to /sources/{source}", async () => {
		mockFetchHeals.mockResolvedValue([mockHeal]);

		const page = await HealsPage();
		render(page);

		const sourceLink = screen.getByRole("link", { name: /hackernews/i });
		expect(sourceLink).toHaveAttribute("href", "/sources/hackernews");
	});

	it("shows empty state when zero heals returned", async () => {
		mockFetchHeals.mockResolvedValue([]);

		const page = await HealsPage();
		render(page);

		expect(screen.getByText(/no heals recorded/i)).toBeInTheDocument();
	});

	it('shows "PR pending" when pr_url is null', async () => {
		mockFetchHeals.mockResolvedValue([{ ...mockHeal, pr_url: null }]);

		const page = await HealsPage();
		render(page);

		expect(screen.getByText(/pr pending/i)).toBeInTheDocument();
	});

	it("omits run reference when run_id is null", async () => {
		mockFetchHeals.mockResolvedValue([{ ...mockHeal, run_id: null }]);

		const page = await HealsPage();
		render(page);

		expect(screen.queryByText(/triggered by run/i)).not.toBeInTheDocument();
	});

	it("pretty-prints deeply nested config objects", async () => {
		const deepHeal = {
			...mockHeal,
			old_config: { item: { fields: [{ name: "title", selector: "h1::text" }] } },
			new_config: { item: { fields: [{ name: "title", selector: "h2.title::text" }] } },
		};
		mockFetchHeals.mockResolvedValue([deepHeal]);

		const page = await HealsPage();
		render(page);

		expect(screen.getByText(/h1::text/)).toBeInTheDocument();
		expect(screen.getByText(/h2\.title::text/)).toBeInTheDocument();
	});

	it("shows error banner when API fails", async () => {
		mockFetchHeals.mockRejectedValue(new Error("Connection refused"));

		const page = await HealsPage();
		render(page);

		expect(screen.getByRole("alert")).toBeInTheDocument();
	});
});
