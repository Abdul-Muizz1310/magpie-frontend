import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shareCardAssets } from "@/lib/site/assets";
import { SITE } from "@/lib/site/config";
import {
	fitsIn,
	GLYPH_ADVANCE,
	HEADLINE_SIZES,
	headlineSize,
	headlineWords,
	LETTER_SPACING_EM,
	rgba,
	SHARE_CARD_SIZE,
	ShareCard,
	shareCardAlt,
	wrapLines,
} from "@/lib/site/share-card";

const plain = (text: string) => ({ text, highlight: false });
const lit = (text: string) => ({ text, highlight: true });

describe("headline words (T-FE-08)", () => {
	it("splits the headline into words and marks the highlight, not its punctuation", () => {
		expect(headlineWords("prove who wrote it first.", "first")).toMatchObject([
			[plain("prove")],
			[plain("who")],
			[plain("wrote")],
			[plain("it")],
			[lit("first"), plain(".")],
		]);
	});

	it("marks a highlight that spans words", () => {
		expect(headlineWords("watch AI argue with itself.", "AI argue")).toMatchObject([
			[plain("watch")],
			[lit("AI")],
			[lit("argue")],
			[plain("with")],
			[plain("itself.")],
		]);
	});

	it("keys every segment by its offset in the headline", () => {
		const offsets = headlineWords("catch slow queries.", "slow")
			.flat()
			.map((s) => s.at);
		expect(offsets).toEqual([0, 6, 11]);
	});

	it("refuses a highlight the headline does not contain", () => {
		expect(() => headlineWords("catch slow queries.", "fast")).toThrow(/highlight/);
	});
});

describe("headline fit (T-FE-08)", () => {
	it("wraps greedily at the column", () => {
		expect(fitsIn(["catch", "slow", "queries."], 10, 2)).toBe(true);
		expect(fitsIn(["catch", "slow", "queries."], 9, 2)).toBe(false);
	});

	it("never fits a word wider than the column", () => {
		expect(fitsIn(["supercalifragilistic"], 10, 5)).toBe(false);
	});

	it("sets a short headline at the largest size", () => {
		expect(headlineSize("catch slow queries.")).toBe(96);
	});

	it("steps down exactly at the two-line boundary", () => {
		// 1056 px / (0.6 × 96 px) = 18 columns at the largest size
		const full = `${"a".repeat(18)} ${"b".repeat(18)}`;
		expect(headlineSize(full)).toBe(96);
		expect(headlineSize(`${full}b`)).toBe(88);
	});

	it("falls back to the smallest size when nothing fits", () => {
		expect(headlineSize("x".repeat(60))).toBe(HEADLINE_SIZES.at(-1));
	});

	it("fits the real headline on two lines", () => {
		// 96 px is 18 columns: "collect" / "everything, heal" / "automatically." is three lines.
		// 88 px is 20 columns: "collect everything," / "heal automatically." is two.
		expect(headlineSize(SITE.card.headline)).toBe(88);
	});
});

describe("headline glyph advance (T-FE-08)", () => {
	const CONTENT_WIDTH = 1200 - 2 * 72;

	it("is Geist Mono's 0.6 em minus the card's letter spacing", () => {
		expect(LETTER_SPACING_EM).toBe(-0.02);
		expect(GLYPH_ADVANCE).toBeCloseTo(0.58, 10);
	});

	it("renders the headline with the letter spacing the model counts", () => {
		const html = renderToStaticMarkup(<ShareCard site={SITE} icon="data:image/png;base64,AAAA" />);
		expect(html).toContain(`letter-spacing:${LETTER_SPACING_EM}em`);
	});

	it("agrees with a column count computed from 0.58 em at every size", () => {
		for (const px of HEADLINE_SIZES) {
			const columns = Math.floor(CONTENT_WIDTH / (0.58 * px));
			const edge = `${"a".repeat(columns)} ${"b".repeat(columns)}`;
			expect(headlineSize(edge)).toBeGreaterThanOrEqual(px);
			// the smallest size is the fallback, so nothing is smaller than it
			if (px !== HEADLINE_SIZES.at(-1)) expect(headlineSize(`${edge}b`)).toBeLessThan(px);
		}
	});

	it("never leaves a one-letter word at the end of line one", () => {
		const size = headlineSize(SITE.card.headline);
		const columns = Math.floor(CONTENT_WIDTH / (0.58 * size));
		const lines = wrapLines(SITE.card.headline.split(" "), columns);
		expect(lines.length).toBeLessThanOrEqual(2);
		for (const line of lines.slice(0, -1)) expect(line.at(-1)?.length).toBeGreaterThan(1);
	});
});

describe("accent colours (T-FE-08)", () => {
	it("turns #rrggbb into rgba with the given alpha", () => {
		expect(rgba("#34d399", 0.25)).toBe("rgba(52, 211, 153, 0.25)");
		expect(rgba("#0A0a0A", 1)).toBe("rgba(10, 10, 10, 1)");
	});
});

describe("share card (T-FE-08)", () => {
	it("is the 1200×630 Open Graph size", () => {
		expect(SHARE_CARD_SIZE).toEqual({ width: 1200, height: 630 });
	});

	it("describes itself in its alt text", () => {
		expect(shareCardAlt(SITE)).toBe("magpie — collect everything, heal automatically.");
	});

	it("renders the name, the comment, the highlight in the accent and the live host", () => {
		const html = renderToStaticMarkup(<ShareCard site={SITE} icon="data:image/svg+xml;base64," />);
		expect(html).toContain(">magpie<");
		expect(html).toContain("// yaml scrapers that self-heal");
		expect(html).toMatch(/color:#34d399[^>]*>heal</);
		expect(html).toContain("magpie-frontend-three.vercel.app");
	});

	it("loads both Geist Mono weights and the icon for the renderer", async () => {
		const { fonts, icon } = await shareCardAssets();
		expect(fonts.map((f) => `${f.name} ${f.weight}`)).toEqual(["Geist Mono 400", "Geist Mono 700"]);
		for (const font of fonts) expect(font.data.byteLength).toBeGreaterThan(10_000);
		expect(icon).toMatch(/^data:image\/svg\+xml;base64,/);
	});
});
