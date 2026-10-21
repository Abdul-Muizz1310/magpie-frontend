import type { Metadata, MetadataRoute, Viewport } from "next";
import { type Route, type Site, SiteConfigError } from "./define";

export const AUTHOR = { name: "Abdul-Muizz Anwar", url: "https://github.com/Abdul-Muizz1310" };
const BACKGROUND = "#0a0a0a";

export function rootMetadata(site: Site): Metadata {
	return {
		metadataBase: site.origin,
		title: { default: site.title, template: `%s — ${site.name}` },
		description: site.description,
		applicationName: site.name,
		authors: [AUTHOR],
		creator: AUTHOR.name,
		keywords: [...site.keywords],
		category: "technology",
		formatDetection: { telephone: false, email: false, address: false },
		appleWebApp: { title: site.name, statusBarStyle: "black" },
		// No title, description or url: Next fills og:title and og:description from each
		// page's own, and a root og:url would claim that every page is the home page.
		openGraph: { type: "website", siteName: site.name, locale: "en_US" },
		// Next fills the Twitter title, description and image from Open Graph.
		twitter: { card: "summary_large_image" },
	};
}

export type PageCopy = { title: string; description: string };

/**
 * An indexable page's own title and description, and a canonical that names the page itself.
 * Called at module scope, so bad copy fails the build. Next fills og:description and
 * twitter:description from the description; the page sets no openGraph, which would replace the
 * root's and drop the share image.
 */
export function pageMetadata(site: Site, route: Route, page: PageCopy): Metadata {
	const fail = (reason: string): never => {
		throw new SiteConfigError(`page ${route}: ${reason}`);
	};
	// As the root's title template renders it.
	const shown = `${page.title} — ${site.name}`;
	if (page.title.length === 0) fail("title must not be empty");
	if (shown.length > 70) fail(`title must be at most 70 characters with the template: "${shown}"`);
	const { length } = page.description;
	if (length < 50 || length > 160) {
		fail(`description must be 50 to 160 characters, not ${length}`);
	}
	return {
		title: page.title,
		description: page.description,
		alternates: { canonical: route },
	};
}

export const ROOT_VIEWPORT: Viewport = { themeColor: BACKGROUND, colorScheme: "dark" };

export function webManifest(site: Site): MetadataRoute.Manifest {
	return {
		id: "/",
		name: site.name,
		short_name: site.name,
		description: site.description,
		start_url: "/",
		scope: "/",
		display: "standalone",
		background_color: BACKGROUND,
		theme_color: BACKGROUND,
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
			{ src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
		],
	};
}

export function robotsFile(site: Site): MetadataRoute.Robots {
	return {
		rules: [
			site.routes.disallow.length > 0
				? { userAgent: "*", allow: "/", disallow: [...site.routes.disallow] }
				: { userAgent: "*", allow: "/" },
		],
		sitemap: new URL("/sitemap.xml", site.origin).href,
	};
}

export function sitemapEntries(site: Site): MetadataRoute.Sitemap {
	return site.routes.sitemap.map((route) => ({ url: new URL(route, site.origin).href }));
}
