import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ScrapeItem } from "@/lib/schemas";
import { makeRunItem } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
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

	it("shows an expand button when data has extra fields", () => {
		const item = makeRunItem({
			data: { title: "x", url: "https://x.example", authors: "A, B", score: 42 },
		});
		render(<ScrapedItemsList items={[item]} />);
		expect(screen.getByRole("button", { name: /show fields \(2\)/i })).toBeInTheDocument();
	});

	it("hides the expand button when data has no non-surfaced fields", () => {
		const item = makeRunItem({ data: { title: "x", url: "https://x.example" } });
		render(<ScrapedItemsList items={[item]} />);
		// `title`/`url` are already surfaced — no extras means no toggle.
		expect(screen.queryByRole("button", { name: /show fields/i })).toBeNull();
	});

	it("reveals all non-surfaced fields on expand click", async () => {
		const item = makeRunItem({
			data: {
				title: "x",
				url: "https://x.example",
				authors: "Alice, Bob",
				score: 42,
				category: "cs.LG",
			},
		});
		const { user } = renderUI(<ScrapedItemsList items={[item]} />);
		const toggle = screen.getByRole("button", { name: /show fields/i });
		await user.click(toggle);
		expect(screen.getByText("authors")).toBeInTheDocument();
		expect(screen.getByText("Alice, Bob")).toBeInTheDocument();
		expect(screen.getByText("score")).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
		expect(screen.getByText("category")).toBeInTheDocument();
		// title/url already rendered through the main UI — not repeated.
		expect(screen.queryByText("title")).toBeNull();
	});

	it("collapses the fields panel on second click", async () => {
		const item = makeRunItem({
			data: { title: "x", url: "https://x.example", authors: "A" },
		});
		const { user } = renderUI(<ScrapedItemsList items={[item]} />);
		const toggle = screen.getByRole("button", { name: /show fields/i });
		await user.click(toggle);
		expect(screen.getByText("authors")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /hide fields/i }));
		expect(screen.queryByText("authors")).toBeNull();
	});

	it("JSON-pretty-prints complex data values", async () => {
		const item = makeRunItem({
			data: {
				title: "x",
				url: "https://x.example",
				nested: { key: "value", list: [1, 2, 3] },
			},
		});
		const { user } = renderUI(<ScrapedItemsList items={[item]} />);
		await user.click(screen.getByRole("button", { name: /show fields/i }));
		const pre = screen.getByText(/"list":/);
		expect(pre.tagName.toLowerCase()).toBe("pre");
	});
});
