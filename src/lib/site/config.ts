import { defineSite } from "./define";

/** Everything a tab, a search result, an install and a link preview say about magpie. */
export const SITE = defineSite({
	name: "magpie",
	title: "magpie — YAML scrapers that self-heal",
	description:
		"Define a scraper in 20 lines of YAML. When a selector breaks, an LLM patches it and opens a PR.",
	url: "https://magpie-frontend-three.vercel.app",
	accent: "#34d399",
	keywords: ["web scraping", "YAML", "self-healing selectors", "LLM", "Playwright", "Scrapy"],
	card: {
		comment: "yaml scrapers that self-heal",
		headline: "collect everything, heal automatically.",
		highlight: "heal",
	},
	// Mutations are Server Actions, so there are no machine endpoints to disallow.
	// /login sets noindex instead.
	routes: { sitemap: ["/", "/heals", "/demo"], disallow: [] },
});
