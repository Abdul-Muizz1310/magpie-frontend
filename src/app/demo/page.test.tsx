import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";

vi.mock("@/lib/api", () => ({
	fetchHealth: vi.fn(),
	fetchSources: vi.fn(),
}));

import { fetchHealth, fetchSources } from "@/lib/api";
import DemoPage from "./page";

const mockFetchHealth = fetchHealth as Mock;
const mockFetchSources = fetchSources as Mock;

afterEach(() => vi.restoreAllMocks());

describe("Demo Page (/demo)", () => {
	it("renders all 6 step cards with titles", async () => {
		mockFetchHealth.mockResolvedValue({ status: "ok", version: "abc", db: "ok" });
		mockFetchSources.mockResolvedValue([{ name: "hackernews" }, { name: "arxiv-cs" }]);

		const page = await DemoPage();
		render(page);

		expect(screen.getByText(/define a scraper/i)).toBeInTheDocument();
		expect(screen.getByText(/scraper runs/i)).toBeInTheDocument();
		expect(screen.getByText(/selectors break/i)).toBeInTheDocument();
		expect(screen.getByText(/healer fires/i)).toBeInTheDocument();
		expect(screen.getByText(/pr opens/i)).toBeInTheDocument();
		expect(screen.getByText(/human reviews/i)).toBeInTheDocument();
	});

	it("renders YAML snippet in a code block", async () => {
		mockFetchHealth.mockResolvedValue({ status: "ok", version: "abc", db: "ok" });
		mockFetchSources.mockResolvedValue([]);

		const page = await DemoPage();
		render(page);

		expect(screen.getByText(/hackernews\.yaml/i)).toBeInTheDocument();
		const codeBlock = screen.getByRole("code");
		expect(codeBlock).toBeInTheDocument();
	});

	it('shows "Connected" when backend returns 200', async () => {
		mockFetchHealth.mockResolvedValue({ status: "ok", version: "abc", db: "ok" });
		mockFetchSources.mockResolvedValue([{ name: "hackernews" }]);

		const page = await DemoPage();
		render(page);

		expect(screen.getByText(/connected/i)).toBeInTheDocument();
	});

	it("displays source count from API", async () => {
		mockFetchHealth.mockResolvedValue({ status: "ok", version: "abc", db: "ok" });
		mockFetchSources.mockResolvedValue([
			{ name: "hackernews" },
			{ name: "arxiv-cs" },
			{ name: "weather-live" },
		]);

		const page = await DemoPage();
		render(page);

		expect(screen.getByText(/3 sources/i)).toBeInTheDocument();
	});

	it('shows "Backend offline" when health check fails', async () => {
		mockFetchHealth.mockRejectedValue(new Error("fetch failed"));
		mockFetchSources.mockRejectedValue(new Error("fetch failed"));

		const page = await DemoPage();
		render(page);

		expect(screen.getByText(/backend offline/i)).toBeInTheDocument();
	});

	it("does not crash when backend is offline", async () => {
		mockFetchHealth.mockRejectedValue(new Error("fetch failed"));
		mockFetchSources.mockRejectedValue(new Error("fetch failed"));

		// Should not throw
		const page = await DemoPage();
		expect(() => render(page)).not.toThrow();
	});
});
