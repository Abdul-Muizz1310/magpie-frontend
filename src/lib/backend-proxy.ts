import "server-only";

import { isIP } from "node:net";
import { ConfigError, getBaseUrl } from "./env";
import { mintPlatformToken, PLATFORM_TOKEN_HEADER } from "./platform-token";
import { requireAdmin } from "./session";

// The browser's way to the backend (spec 07): `/api/backend/<path>` is signed with a fresh
// platform token and forwarded to `getBaseUrl()/<path>`. The route file only wires methods to
// `proxyToBackend`; everything that decides anything is here.

export const FORWARDED_REQUEST_HEADERS = [
	"content-type",
	"accept",
	"last-event-id",
	"x-request-id",
] as const;

export const FORWARDED_RESPONSE_HEADERS = [
	"content-type",
	"cache-control",
	"retry-after",
	"x-request-id",
	"last-event-id",
] as const;

// Statuses whose response must not carry a body (the Response constructor rejects one).
const NULL_BODY_STATUSES = new Set([204, 205, 304]);

// ── Pure core ──────────────────────────────────────────────────────────────

/** A segment that names one path step and nothing else. Next has already decoded it. */
function isPlainSegment(segment: string): boolean {
	return (
		segment.length > 0 &&
		segment !== "." &&
		segment !== ".." &&
		!segment.includes("/") &&
		!segment.includes("\\")
	);
}

/** True when `url` is on the backend's origin and under its base path. */
export function isWithinBackend(url: URL, base: URL): boolean {
	const basePath = base.pathname.replace(/\/+$/, "");
	return url.origin === base.origin && url.pathname.startsWith(`${basePath}/`);
}

/**
 * The backend URL for the catch-all `segments` and the raw query `search` ("" or "?…"), or
 * null when the path is not a plain backend path (the SSRF guard).
 */
export function upstreamUrl(base: string, segments: readonly string[], search: string): URL | null {
	if (segments.length === 0 || !segments.every(isPlainSegment)) return null;
	let url: URL;
	try {
		url = new URL(`${base}/${segments.map(encodeURIComponent).join("/")}${search}`);
	} catch {
		return null;
	}
	return isWithinBackend(url, new URL(base)) ? url : null;
}

/** `value` trimmed when it is one IPv4 or IPv6 address, else null. */
function singleAddress(value: string | null | undefined): string | null {
	const candidate = value?.trim() ?? "";
	return isIP(candidate) === 0 ? null : candidate;
}

/**
 * The one visitor address to forward: the leftmost `x-forwarded-for` entry (Vercel's edge writes
 * the visitor's address there), else `x-real-ip`; null when neither is an IP address. Never the
 * chain: magpie-backend keys a frontend token's rate-limit bucket on this address (platform
 * contract v2 §2, amended 2026-10-20).
 */
export function clientAddress(incoming: Headers): string | null {
	const leftmost = incoming.get("x-forwarded-for")?.split(",")[0];
	return singleAddress(leftmost) ?? singleAddress(incoming.get("x-real-ip"));
}

/** The allowlisted request headers, the token, and the visitor's address for rate limits. */
export function upstreamRequestHeaders(incoming: Headers, token: string): Headers {
	const out = new Headers();
	for (const name of FORWARDED_REQUEST_HEADERS) {
		const value = incoming.get(name);
		if (value !== null) out.set(name, value);
	}
	out.set(PLATFORM_TOKEN_HEADER, token);
	const client = clientAddress(incoming);
	if (client !== null) out.set("x-forwarded-for", client);
	return out;
}

/** The allowlisted response headers. `set-cookie`, `location` and the rest stay behind. */
export function downstreamResponseHeaders(upstream: Headers): Headers {
	const out = new Headers();
	for (const name of FORWARDED_RESPONSE_HEADERS) {
		const value = upstream.get(name);
		if (value !== null) out.set(name, value);
	}
	return out;
}

// ── Imperative shell ───────────────────────────────────────────────────────

function errorResponse(status: number, error: string): Response {
	return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

function notConfigured(error: unknown): Response {
	if (!(error instanceof ConfigError)) throw error;
	// ConfigError messages name the variable, never a secret's value.
	console.error(`[api/backend] proxy not configured: ${error.message}`);
	return errorResponse(503, "proxy not configured");
}

/** Sign and forward one browser request to the backend, streaming the answer back. */
export async function proxyToBackend(
	request: Request,
	segments: readonly string[],
): Promise<Response> {
	const { method } = request;
	if (method !== "GET") {
		// magpie's browser code only reads; mutations are admin-gated Server Actions. Without this
		// gate the proxy would sign anyone's POST and bypass the admin login.
		const auth = await requireAdmin(`proxy:${method}`);
		if (!auth.ok) return errorResponse(auth.status, auth.message);
	}

	let base: string;
	try {
		base = getBaseUrl();
	} catch (error) {
		return notConfigured(error);
	}

	const url = upstreamUrl(base, segments, new URL(request.url).search);
	if (url === null) return errorResponse(400, "invalid backend path");

	let token: string;
	try {
		token = mintPlatformToken();
	} catch (error) {
		return notConfigured(error);
	}

	const body = method === "GET" ? undefined : await request.arrayBuffer();
	let upstream: Response;
	try {
		upstream = await fetch(url, {
			method,
			headers: upstreamRequestHeaders(request.headers, token),
			body: body && body.byteLength > 0 ? body : undefined,
			cache: "no-store",
			redirect: "manual",
			signal: request.signal,
		});
	} catch (error) {
		if (!request.signal.aborted) {
			console.error(
				`[api/backend] backend unreachable: ${error instanceof Error ? error.message : error}`,
			);
		}
		return errorResponse(502, "backend unreachable");
	}

	return new Response(NULL_BODY_STATUSES.has(upstream.status) ? null : upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: downstreamResponseHeaders(upstream.headers),
	});
}
