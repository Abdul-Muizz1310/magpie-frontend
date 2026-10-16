/**
 * The 1200×630 link-preview card as a tree `next/og` (Satori) can render: flexbox only,
 * inline styles, and every element with more than one child a flex container.
 */
import type { HexColor, Site } from "./define";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

const PADDING_X = 72;
const CONTENT_WIDTH = SHARE_CARD_SIZE.width - 2 * PADDING_X;
/** Geist Mono sets every glyph 600/1000 em wide, so a line's width is known exactly. */
const MONO_ADVANCE = 0.6;
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

/** Whether the words wrap, greedily, into at most `maxLines` lines of `columns` characters. */
export function fitsIn(words: readonly string[], columns: number, maxLines: number): boolean {
	let lines = 0;
	let used = 0;
	for (const word of words) {
		if (word.length > columns) return false;
		if (lines === 0 || used + 1 + word.length > columns) {
			lines += 1;
			used = word.length;
		} else {
			used += 1 + word.length;
		}
	}
	return lines <= maxLines;
}

/** The largest headline size at which the headline wraps to two lines across the card. */
export function headlineSize(headline: string): number {
	const words = headline.split(" ").filter(Boolean);
	const fits = HEADLINE_SIZES.find((px) =>
		fitsIn(words, Math.floor(CONTENT_WIDTH / (MONO_ADVANCE * px)), HEADLINE_LINES),
	);
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
				<span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>{site.name}</span>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<span style={{ fontSize: 28, color: INK.muted }}>{`// ${site.card.comment}`}</span>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						columnGap: size * MONO_ADVANCE,
						rowGap: Math.round(size * 0.14),
						fontSize: size,
						fontWeight: 700,
						lineHeight: 1.08,
						letterSpacing: "-0.02em",
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
