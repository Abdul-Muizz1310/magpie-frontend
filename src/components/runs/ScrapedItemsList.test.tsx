import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScrapeItem } from "@/lib/schemas";
import { ScrapedItemsList } from "./ScrapedItemsList";

const sampleItem: ScrapeItem = {
	stable_id: "abc",
	url: "https://example.com/a",
	title: "Example post",
	content_text: "Example body text",
	content_hash: "deadbeefcafebabe",
	fetched_at: "2026-04-10T12:00:00Z",
	html_snapshot_url: "https://snap.example/abc.html",
};

describe("ScrapedItemsList", () => {
	it("shows empty-state when there are no items", () => {
		render(<ScrapedItemsList items={[]} />);
		expect(screen.getByText(/0 items scraped/i)).toBeInTheDocument();
	});

	it("renders item title as link with target=_blank", () => {
		render(<ScrapedItemsList items={[sampleItem]} />);
		const link = screen.getByRole("link", { name: /example post/i });
		expect(link).toHaveAttribute("href", sampleItem.url);
		expect(link).toHaveAttribute("target", "_blank");
	});

	it("renders snapshot link when html_snapshot_url is present", () => {
		render(<ScrapedItemsList items={[sampleItem]} />);
		expect(screen.getByRole("link", { name: /snapshot/i })).toHaveAttribute(
			"href",
			sampleItem.html_snapshot_url,
		);
	});

	it("truncates the content hash", () => {
		render(<ScrapedItemsList items={[sampleItem]} />);
		expect(screen.getByText(/sha: deadbeef/)).toBeInTheDocument();
	});
});
