import type { Metadata, MetadataRoute, Viewport } from "next";
import type { Site } from "./define";

const AUTHOR = { name: "Abdul-Muizz Anwar", url: "https://github.com/Abdul-Muizz1310" };
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
