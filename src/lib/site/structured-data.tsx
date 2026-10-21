/**
 * The home page's schema.org graph: the website, the app and its author, all from the config.
 * Search engines read the site name from the WebSite node. Nothing is claimed that the site does
 * not have: no rating, review or price.
 */
import type { Site } from "./define";
import { AUTHOR } from "./metadata";

const PERSON_ID = `${AUTHOR.url}#person`;

export function structuredData(site: Site) {
	const home = site.origin.href;
	const website = `${home}#website`;
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				"@id": website,
				url: home,
				name: site.name,
				description: site.description,
				inLanguage: "en",
				publisher: { "@id": PERSON_ID },
			},
			{
				"@type": "WebApplication",
				"@id": `${home}#app`,
				url: home,
				name: site.name,
				description: site.description,
				applicationCategory: "DeveloperApplication",
				operatingSystem: "Any",
				isAccessibleForFree: true,
				isPartOf: { "@id": website },
				author: { "@id": PERSON_ID },
			},
			{ "@type": "Person", "@id": PERSON_ID, name: AUTHOR.name, url: AUTHOR.url },
		],
	};
}

/** JSON with every `<` escaped, so no value can close the script tag it sits in. */
export function jsonLd(data: unknown): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function StructuredData({ site }: { site: Site }) {
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is data, and jsonLd escapes every `<`
			dangerouslySetInnerHTML={{ __html: jsonLd(structuredData(site)) }}
		/>
	);
}
