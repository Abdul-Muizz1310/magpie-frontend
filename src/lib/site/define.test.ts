import { describe, expect, it } from "vitest";
import { SITE } from "@/lib/site/config";
import { defineSite, NEVER_USE_HOSTS, SiteConfigError, type SiteInput } from "@/lib/site/define";

const valid: SiteInput = {
	name: "example",
	title: "example — a site that passes every check",
	description: "A description long enough for a search result and short enough not to be cut off.",
	url: "https://example-frontend.vercel.app",
	accent: "#34d399",
	keywords: ["example"],
	card: { comment: "a comment", headline: "catch slow queries.", highlight: "slow" },
	routes: { sitemap: ["/"], disallow: ["/api/"] },
};

describe("defineSite (T-FE-01)", () => {
	it("accepts the real config and derives its origin", () => {
		expect(SITE.url).toBe("https://magpie-frontend-three.vercel.app");
		expect(SITE.origin.href).toBe("https://magpie-frontend-three.vercel.app/");
	});

	it("accepts a valid config", () => {
		expect(defineSite(valid).origin.host).toBe("example-frontend.vercel.app");
	});
});

describe("defineSite rejects (T-FE-02)", () => {
	const cases: [string, Record<string, unknown>, RegExp][] = [
		["a url that is not a URL", { url: "not a url" }, /not a URL/],
		["an http origin", { url: "http://example-frontend.vercel.app" }, /https/],
		["an origin with a path", { url: "https://example-frontend.vercel.app/app" }, /bare origin/],
		["a trailing slash", { url: "https://example-frontend.vercel.app/" }, /bare origin/],
		...[...NEVER_USE_HOSTS].map((host): [string, Record<string, unknown>, RegExp] => [
			`the never-use host ${host}`,
			{ url: `https://${host}` },
			/never-use/,
		]),
		["an empty name", { name: "" }, /name/],
		["a name over 12 characters", { name: "a-very-long-name" }, /name/],
		["a title over 70 characters", { title: "t".repeat(71) }, /title/],
		["a description under 50 characters", { description: "too short" }, /description/],
		["a description over 160 characters", { description: "d".repeat(161) }, /description/],
		["an accent that is not #rrggbb", { accent: "#fff" }, /accent/],
		["an empty highlight", { card: { ...valid.card, highlight: "" } }, /highlight/],
		[
			"a highlight missing from the headline",
			{ card: { ...valid.card, highlight: "fast" } },
			/highlight/,
		],
		["a route without a leading slash", { routes: { sitemap: ["d"], disallow: [] } }, /route/],
		[
			"a sitemap route that robots.txt disallows",
			{ routes: { sitemap: ["/api/status"], disallow: ["/api/"] } },
			/disallow/,
		],
	];

	it.each(cases)("%s", (_why, patch, reason) => {
		const input = { ...valid, ...patch } as unknown as SiteInput;
		expect(() => defineSite(input)).toThrow(SiteConfigError);
		expect(() => defineSite(input)).toThrow(reason);
	});
});
