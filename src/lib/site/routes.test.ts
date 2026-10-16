import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE } from "@/lib/site/config";
import { defineSite } from "@/lib/site/define";
import { robotsFile } from "@/lib/site/metadata";
import { pngSize } from "./image-headers.test-helpers";

describe("manifest (T-FE-05)", () => {
	const m = manifest();

	it("names the site and opens at the home page in the dark colours", () => {
		expect(m).toMatchObject({
			name: "magpie",
			short_name: "magpie",
			description: SITE.description,
			start_url: "/",
			scope: "/",
			display: "standalone",
			background_color: "#0a0a0a",
			theme_color: "#0a0a0a",
		});
	});

	it("lists any-purpose 192 and 512 icons and a maskable 512", () => {
		expect(m.icons?.map((i) => `${i.sizes} ${i.purpose}`)).toEqual([
			"192x192 any",
			"512x512 any",
			"512x512 maskable",
		]);
	});

	it.each(m.icons ?? [])("$src exists in public/ at $sizes", (icon) => {
		expect(pngSize(readFileSync(join("public", icon.src)))).toBe(icon.sizes);
	});
});

describe("robots and sitemap (T-FE-06)", () => {
	it("allows the whole site and names the sitemap", () => {
		expect(robots()).toEqual({
			rules: [{ userAgent: "*", allow: "/" }],
			sitemap: "https://magpie-frontend-three.vercel.app/sitemap.xml",
		});
	});

	it("disallows the machine endpoints a site declares", () => {
		const site = defineSite({ ...SITE, routes: { sitemap: ["/"], disallow: ["/api/", "/auth/"] } });
		expect(robotsFile(site).rules).toEqual([
			{ userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
		]);
	});

	it("lists the sitemap routes, as absolute URLs, once each", () => {
		const urls = sitemap().map((entry) => entry.url);
		expect(urls).toEqual([
			"https://magpie-frontend-three.vercel.app/",
			"https://magpie-frontend-three.vercel.app/heals",
			"https://magpie-frontend-three.vercel.app/demo",
		]);
		expect(new Set(urls).size).toBe(urls.length);
	});
});
