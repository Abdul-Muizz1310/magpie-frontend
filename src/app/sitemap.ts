import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/config";
import { sitemapEntries } from "@/lib/site/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
	return sitemapEntries(SITE);
}
