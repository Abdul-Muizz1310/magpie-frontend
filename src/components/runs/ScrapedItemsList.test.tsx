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

	it("renders plain text instead of a link when url is root-relative", () => {
		const relativeItem: ScrapeItem = { ...sampleItem, url: "/papers/2604.14683" };
		render(<ScrapedItemsList items={[relativeItem]} />);
		// No link for the title — avoids rendering `<a href="/papers/...">` which
		// would navigate to the magpie domain instead of the source site.
		expect(screen.queryByRole("link", { name: /example post/i })).toBeNull();
		// Title still shown as text.
		expect(screen.getByText("Example post")).toBeInTheDocument();
	});

	it("renders plain text when url is empty", () => {
		const noUrlItem: ScrapeItem = { ...sampleItem, url: "" };
		render(<ScrapedItemsList items={[noUrlItem]} />);
		expect(screen.queryByRole("link", { name: /example post/i })).toBeNull();
		expect(screen.getByText("Example post")).toBeInTheDocument();
	});

	it("suppresses snapshot link when url is relative", () => {
		const relativeSnapshotItem: ScrapeItem = {
			...sampleItem,
			html_snapshot_url: "/snapshots/abc.html",
		};
		render(<ScrapedItemsList items={[relativeSnapshotItem]} />);
		expect(screen.queryByRole("link", { name: /snapshot/i })).toBeNull();
	});
});
