// The env boundary (spec 06). Edge-safe: string operations and `URL` only, because
// `auth.ts` (imported by the Edge proxy) and client components read through it.

export class ConfigError extends Error {
	override name = "ConfigError";
}

/**
 * An env value minus what copy-paste and shell pipes add: a byte-order mark and surrounding
 * whitespace (a Windows pipe adds both, `echo` adds a newline). Blank means unset.
 */
export function envValue(raw: string | undefined): string | null {
	if (raw === undefined) return null;
	const clean = raw.replace(/^[\s﻿]+|[\s﻿]+$/g, "");
	return clean.length > 0 ? clean : null;
}

/** The backend's base URL, with no trailing slash; localhost when unset. */
export function getBaseUrl(): string {
	// Referenced literally so Next inlines it into client bundles.
	const value = envValue(process.env.NEXT_PUBLIC_API_URL);
	if (value === null) return "http://localhost:8000";
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new ConfigError(`NEXT_PUBLIC_API_URL is not a URL: "${value}"`);
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new ConfigError(`NEXT_PUBLIC_API_URL must be http or https: "${value}"`);
	}
	return value.replace(/\/+$/, "");
}
