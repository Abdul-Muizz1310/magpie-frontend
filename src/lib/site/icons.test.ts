import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site/config";
import { icoSizes, pngSize } from "./image-headers.test-helpers";

describe("icon files (T-FE-07)", () => {
	it("draws the vector icon in the site's accent", () => {
		const svg = readFileSync("src/app/icon.svg", "utf8");
		expect(svg).toContain('viewBox="0 0 64 64"');
		expect(svg).toContain(`stroke="${SITE.accent}"`);
	});

	it("packs 16, 32 and 48 px frames into favicon.ico", () => {
		expect(icoSizes(readFileSync("src/app/favicon.ico"))).toEqual([16, 32, 48]);
	});

	it("ships a 180 px apple touch icon", () => {
		expect(pngSize(readFileSync("src/app/apple-icon.png"))).toBe("180x180");
	});
});
