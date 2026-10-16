/**
 * The site's identity, parsed once when the config module loads. A bad origin or a
 * never-use host fails the build instead of shipping into every link preview.
 */

export type Route = `/${string}`;
export type HexColor = `#${string}`;

export type SiteInput = {
	/** The brand as the UI writes it; doubles as the manifest's short_name. */
	name: string;
	/** The default <title>, for pages that set none. */
	title: string;
	description: string;
	/** The production origin, e.g. "https://inkthread-frontend.vercel.app". */
	url: string;
	accent: HexColor;
	keywords: readonly string[];
	card: {
		/** The `//` comment line above the share card's headline. */
		comment: string;
		headline: string;
		/** The part of the headline set in the accent colour. */
		highlight: string;
	};
	routes: {
		/** Listed in the sitemap. */
		sitemap: readonly Route[];
		/**
		 * Disallowed in robots.txt: machine endpoints only. Link-preview bots obey robots.txt,
		 * so a page that should stay out of search sets `robots: { index: false }` instead.
		 */
		disallow: readonly Route[];
	};
};

export type Site = Readonly<SiteInput> & { readonly origin: URL };

/**
 * Hosts strangers own or that were deleted. Mirrors the workspace's binding list in
 * knowledge/infrastructure/infra-never-use-hosts.md.
 */
export const NEVER_USE_HOSTS: ReadonlySet<string> = new Set([
	"bastion.vercel.app",
	"paper-trail-backend.onrender.com",
	"paper-trail-frontend.vercel.app",
	"paper-trail-backend-7h27.onrender.com",
	"magpie-backend-izzu.onrender.com",
	"abdulmuizz.dev",
]);

export class SiteConfigError extends Error {
	override name = "SiteConfigError";
}

function fail(reason: string): never {
	throw new SiteConfigError(`site config: ${reason}`);
}

function parseOrigin(url: string): URL {
	let origin: URL;
	try {
		origin = new URL(url);
	} catch {
		return fail(`url is not a URL: ${url}`);
	}
	if (origin.protocol !== "https:") fail(`url must be https: ${url}`);
	if (origin.origin !== url) {
		fail(`url must be a bare origin, with no path or trailing slash: ${url}`);
	}
	if (NEVER_USE_HOSTS.has(origin.hostname)) fail(`${origin.hostname} is on the never-use list`);
	return origin;
}

export function defineSite(input: SiteInput): Site {
	const origin = parseOrigin(input.url);
	const { name, title, description, accent, card, routes } = input;

	if (name.length < 1 || name.length > 12) fail(`name must be 1 to 12 characters: "${name}"`);
	if (title.length < 1 || title.length > 70) fail(`title must be 1 to 70 characters: "${title}"`);
	if (description.length < 50 || description.length > 160) {
		fail(`description must be 50 to 160 characters, not ${description.length}`);
	}
	if (!/^#[0-9a-f]{6}$/i.test(accent)) fail(`accent must be #rrggbb: ${accent}`);
	if (card.highlight.length === 0 || !card.headline.includes(card.highlight)) {
		fail(`highlight "${card.highlight}" must occur in the headline`);
	}
	for (const route of [...routes.sitemap, ...routes.disallow]) {
		if (!route.startsWith("/")) fail(`route must start with "/": ${route}`);
	}
	for (const route of routes.sitemap) {
		if (routes.disallow.some((prefix) => route.startsWith(prefix))) {
			fail(`sitemap route ${route} is one robots.txt would disallow`);
		}
	}

	return Object.freeze({ ...input, origin });
}
