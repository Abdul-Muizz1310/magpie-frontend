/**
 * The 1200×630 link-preview card as a tree `next/og` (Satori) can render: flexbox only,
 * inline styles, and every element with more than one child a flex container.
 */
import type { HexColor, Site } from "./define";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

const PADDING_X = 72;
const CONTENT_WIDTH = SHARE_CARD_SIZE.width - 2 * PADDING_X;
/** The tracking the headline renders with; the fit model reads the same constant. */
export const LETTER_SPACING_EM = -0.02;
/** Geist Mono sets every glyph 600/1000 em wide; tracking is added to each advance. */
const MONO_ADVANCE = 0.6;
/** What one glyph (and so one word gap) really advances, in em: 0.58. */
export const GLYPH_ADVANCE = MONO_ADVANCE + LETTER_SPACING_EM;
const HEADLINE_LINES = 2;
export const HEADLINE_SIZES = [96, 88, 80, 72, 64, 56, 48] as const;

/** The sites' dot grid; Satori cannot tile a CSS gradient, so it is an SVG pattern. */
const DOT_GRID = `data:image/svg+xml,${encodeURIComponent(
	`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_CARD_SIZE.width}" height="${SHARE_CARD_SIZE.height}"><defs><pattern id="d" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="1.1" fill="#ffffff" fill-opacity="0.09"/></pattern></defs><rect width="100%" height="100%" fill="url(#d)"/></svg>`,
)}`;

const INK = { background: "#0a0a0a", foreground: "#fafafa", muted: "#8a8aa3", border: "#1e1e2e" };

/** A run of a headline word, keyed by its offset in the headline. */
export type Segment = { at: number; text: string; highlight: boolean };

/** Split a headline into words, each cut where the highlight starts and ends. */
export function headlineWords(headline: string, highlight: string): Segment[][] {
	const start = headline.indexOf(highlight);
	if (highlight.length === 0 || start < 0) {
		throw new Error(`highlight "${highlight}" is not in the headline`);
	}
	const end = start + highlight.length;
	const clamp = (n: number, from: number, to: number) => Math.min(Math.max(n, from), to);

	const words: Segment[][] = [];
	let from = 0;
	for (const word of headline.split(" ")) {
		const to = from + word.length;
		const cuts = [from, clamp(start, from, to), clamp(end, from, to), to];
		const segments: Segment[] = [];
		for (let i = 0; i < 3; i++) {
			const [a = 0, b = 0] = [cuts[i], cuts[i + 1]];
			if (b > a) segments.push({ at: a, text: headline.slice(a, b), highlight: i === 1 });
		}
		if (segments.length > 0) words.push(segments);
		from = to + 1;
	}
	return words;
}

/** Greedily wrap words into lines of at most `columns` characters; a word wider than the column gets a line of its own. */
export function wrapLines(words: readonly string[], columns: number): string[][] {
	const lines: string[][] = [];
	let used = 0;
	for (const word of words) {
		const line = lines.at(-1);
		if (line && used + 1 + word.length <= columns) {
			line.push(word);
			used += 1 + word.length;
		} else {
			lines.push([word]);
			used = word.length;
		}
	}
	return lines;
}

/** Whether the words wrap, greedily, into at most `maxLines` lines of `columns` characters. */
export function fitsIn(words: readonly string[], columns: number, maxLines: number): boolean {
	if (words.some((word) => word.length > columns)) return false;
	return wrapLines(words, columns).length <= maxLines;
}

/** A line that ends in a one-letter word ("a", "I") leaves it dangling before the break. */
function dangles(words: readonly string[], columns: number): boolean {
	return wrapLines(words, columns)
		.slice(0, -1)
		.some((line) => line.at(-1)?.length === 1);
}

/**
 * The largest headline size at which the headline wraps to two lines across the card and
 * no line ends in a one-letter word.
 */
export function headlineSize(headline: string): number {
	const words = headline.split(" ").filter(Boolean);
	const fits = HEADLINE_SIZES.find((px) => {
		const columns = Math.floor(CONTENT_WIDTH / (GLYPH_ADVANCE * px));
		return fitsIn(words, columns, HEADLINE_LINES) && !dangles(words, columns);
	});
	return fits ?? HEADLINE_SIZES[HEADLINE_SIZES.length - 1];
}

export function rgba(hex: HexColor, alpha: number): string {
	const n = Number.parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function shareCardAlt(site: Site): string {
	return `${site.name} — ${site.card.headline}`;
}

export function ShareCard({ site, icon }: { site: Site; icon: string }) {
	const size = headlineSize(site.card.headline);
	const words = headlineWords(site.card.headline, site.card.highlight);
	const fill = { position: "absolute", top: 0, left: 0, display: "flex" } as const;

	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				width: "100%",
				height: "100%",
				padding: `64px ${PADDING_X}px 56px`,
				backgroundColor: INK.background,
				color: INK.foreground,
				fontFamily: "Geist Mono",
			}}
		>
			{/* biome-ignore lint/performance/noImgElement: Satori draws a plain <img>; next/image cannot render here */}
			<img src={DOT_GRID} alt="" style={{ ...fill, ...SHARE_CARD_SIZE }} />
			<div
				style={{
					...fill,
					width: SHARE_CARD_SIZE.width,
					height: SHARE_CARD_SIZE.height,
					backgroundImage: `radial-gradient(circle at 22% 0%, ${rgba(site.accent, 0.22)} 0%, ${rgba(site.accent, 0)} 60%)`,
				}}
			/>

			<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
				{/* biome-ignore lint/performance/noImgElement: Satori draws a plain <img>; next/image cannot render here */}
				<img src={icon} width={64} height={64} alt="" />
				<span style={{ fontSize: 34, fontWeight: 700, letterSpacing: `${LETTER_SPACING_EM}em` }}>
					{site.name}
				</span>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<span style={{ fontSize: 28, color: INK.muted }}>{`// ${site.card.comment}`}</span>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						columnGap: size * GLYPH_ADVANCE,
						rowGap: Math.round(size * 0.14),
						fontSize: size,
						fontWeight: 700,
						lineHeight: 1.08,
						letterSpacing: `${LETTER_SPACING_EM}em`,
					}}
				>
					{words.map((word) => (
						<div key={word[0]?.at} style={{ display: "flex" }}>
							{word.map((segment) =>
								segment.highlight ? (
									<span
										key={segment.at}
										style={{
											color: site.accent,
											borderBottom: `${Math.round(size / 14)}px solid ${rgba(site.accent, 0.65)}`,
										}}
									>
										{segment.text}
									</span>
								) : (
									<span key={segment.at}>{segment.text}</span>
								),
							)}
						</div>
					))}
				</div>
			</div>

			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					paddingTop: 24,
					borderTop: `1px solid ${INK.border}`,
					fontSize: 24,
					color: INK.muted,
				}}
			>
				<div style={{ display: "flex", gap: 14 }}>
					<span style={{ color: site.accent }}>$</span>
					<span>open</span>
					<span style={{ color: INK.foreground }}>{site.origin.host}</span>
				</div>
				<span>muizz-lab</span>
			</div>
		</div>
	);
}
