import { cacheLife } from "next/cache";
import { ImageResponse } from "next/og";
import { shareCardAssets } from "@/lib/site/assets";
import { SITE } from "@/lib/site/config";
import { SHARE_CARD_SIZE, ShareCard, shareCardAlt } from "@/lib/site/share-card";

export const alt = shareCardAlt(SITE);
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

/**
 * With cacheComponents, a route handler is prerendered only if its response body is ready
 * without uncached I/O. Reading the fonts and drawing the PNG are both I/O, so the card is
 * rendered inside a cache boundary: the build fills it once and the route ships as static.
 * The card changes only with a deploy, hence the longest cache life.
 */
async function renderShareCard(): Promise<ArrayBuffer> {
	"use cache";
	cacheLife("max");
	const { fonts, icon } = await shareCardAssets();
	return new ImageResponse(<ShareCard site={SITE} icon={icon} />, { ...size, fonts }).arrayBuffer();
}

export default async function OpengraphImage() {
	return new Response(await renderShareCard(), { headers: { "Content-Type": contentType } });
}
