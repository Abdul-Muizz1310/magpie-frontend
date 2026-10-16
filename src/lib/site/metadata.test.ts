import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site/config";
import { ROOT_VIEWPORT, rootMetadata } from "@/lib/site/metadata";

describe("root metadata (T-FE-03)", () => {
	const metadata = rootMetadata(SITE);

	it("resolves every relative URL against the production origin", () => {
		expect(String(metadata.metadataBase)).toBe("https://magpie-frontend-three.vercel.app/");
	});

	it("has a default title and a template that names the site", () => {
		expect(metadata.title).toEqual({
			default: "magpie — YAML scrapers that self-heal",
			template: "%s — magpie",
		});
	});

	it("describes the site and credits its author", () => {
		expect(metadata.description).toBe(SITE.description);
		expect(metadata.applicationName).toBe("magpie");
		expect(metadata.authors).toEqual([
			{ name: "Abdul-Muizz Anwar", url: "https://github.com/Abdul-Muizz1310" },
		]);
		expect(metadata.keywords).toEqual(SITE.keywords);
	});

	it("leaves the Open Graph title, description and url to each page", () => {
		expect(metadata.openGraph).toEqual({ type: "website", siteName: "magpie", locale: "en_US" });
	});

	it("asks for the large Twitter card and lets Next fill the rest from Open Graph", () => {
		expect(metadata.twitter).toEqual({ card: "summary_large_image" });
	});

	it("sets no canonical at the root, so no page claims to be the home page", () => {
		expect(metadata).not.toHaveProperty("alternates");
	});

	it("names the home-screen app and keeps the iOS status bar dark", () => {
		expect(metadata.appleWebApp).toEqual({ title: "magpie", statusBarStyle: "black" });
	});

	it("stops iOS turning numbers into phone links", () => {
		expect(metadata.formatDetection).toEqual({ telephone: false, email: false, address: false });
	});
});

describe("viewport (T-FE-04)", () => {
	it("paints the browser chrome in the page background and declares a dark scheme", () => {
		expect(ROOT_VIEWPORT).toEqual({ themeColor: "#0a0a0a", colorScheme: "dark" });
	});
});
