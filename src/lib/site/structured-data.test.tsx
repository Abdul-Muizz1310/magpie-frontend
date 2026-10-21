import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site/config";
import { defineSite } from "@/lib/site/define";
import { jsonLd, StructuredData, structuredData } from "@/lib/site/structured-data";

const PERSON = "https://github.com/Abdul-Muizz1310#person";

describe("structured data (T-FE-12)", () => {
	const data = structuredData(SITE);

	it("describes the site, the app and its author as one schema.org graph", () => {
		expect(data["@context"]).toBe("https://schema.org");
		expect(data["@graph"].map((node) => node["@type"])).toEqual([
			"WebSite",
			"WebApplication",
			"Person",
		]);
	});

	it("names the website from the config, so a result reads magpie, not vercel.app", () => {
		expect(data["@graph"][0]).toEqual({
			"@type": "WebSite",
			"@id": "https://magpie-frontend-three.vercel.app/#website",
			url: "https://magpie-frontend-three.vercel.app/",
			name: "magpie",
			description: SITE.description,
			inLanguage: "en",
			publisher: { "@id": PERSON },
		});
	});

	it("describes the app as free, part of the website, by the author, with no rating or price", () => {
		expect(data["@graph"][1]).toEqual({
			"@type": "WebApplication",
			"@id": "https://magpie-frontend-three.vercel.app/#app",
			url: "https://magpie-frontend-three.vercel.app/",
			name: "magpie",
			description: SITE.description,
			applicationCategory: "DeveloperApplication",
			operatingSystem: "Any",
			isAccessibleForFree: true,
			isPartOf: { "@id": "https://magpie-frontend-three.vercel.app/#website" },
			author: { "@id": PERSON },
		});
	});

	it("names the author once, by the id the other nodes point at", () => {
		expect(data["@graph"][2]).toEqual({
			"@type": "Person",
			"@id": PERSON,
			name: "Abdul-Muizz Anwar",
			url: "https://github.com/Abdul-Muizz1310",
		});
	});

	it("serialises with every < escaped, so no value can close the script tag", () => {
		const site = defineSite({
			...SITE,
			description: `${"d".repeat(60)} </script><script>alert(1)`,
		});
		const text = jsonLd(structuredData(site));
		expect(text).not.toContain("<");
		expect(text).toContain("\\u003c/script>");
		expect(JSON.parse(text)).toEqual(structuredData(site));
	});

	it("renders as one application/ld+json script that parses back to the graph", () => {
		const html = renderToStaticMarkup(<StructuredData site={SITE} />);
		const scripts = [
			...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
		];
		expect(scripts).toHaveLength(1);
		expect(JSON.parse(scripts[0]?.[1] ?? "")).toEqual(data);
	});
});
