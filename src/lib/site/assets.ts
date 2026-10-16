import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

/** The files the share card is drawn with: Geist Mono, and the site icon as a data URI. */
export async function shareCardAssets() {
	const [regular, bold, icon] = await Promise.all([
		readFile(join(root, "src/lib/site/fonts/GeistMono-Regular.ttf")),
		readFile(join(root, "src/lib/site/fonts/GeistMono-Bold.ttf")),
		readFile(join(root, "src/app/icon.svg")),
	]);
	return {
		fonts: [
			{ name: "Geist Mono", data: regular, weight: 400 as const, style: "normal" as const },
			{ name: "Geist Mono", data: bold, weight: 700 as const, style: "normal" as const },
		],
		icon: `data:image/svg+xml;base64,${icon.toString("base64")}`,
	};
}
