// Edge-safe auth primitives. NO `next/headers` import here — this module is
// imported by both `proxy.ts` (Edge runtime) and the server-side session layer
// (Node runtime), so it must only use APIs available in both: `process.env`
// and the Web Crypto `crypto.subtle` global (present in Edge and Node 20+).
//
// Auth model: a single shared admin secret (`MAGPIE_ADMIN_SECRET`, server-only,
// never `NEXT_PUBLIC_*`). Logging in mints a stateless session token — an
// HMAC-SHA256 of a constant payload keyed by the secret — stored in an
// httpOnly cookie. Verification recomputes the HMAC and timing-safe compares.
// No secret configured ⇒ no valid token can ever be minted ⇒ every mutation
// is denied. That is the intended fail-closed posture for an unconfigured deploy.

export const COOKIE_NAME = "magpie_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 8; // 8 hours

// Bump this to invalidate all existing sessions (rotates the signed payload).
const SESSION_PAYLOAD = "magpie-admin-session-v1";

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** Constant-time string comparison. Both inputs are fixed-length hex digests. */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let mismatch = 0;
	for (let i = 0; i < a.length; i += 1) {
		mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return mismatch === 0;
}

/** The configured admin secret, or `null` when unset/empty (⇒ fail closed). */
export function getAdminSecret(): string | null {
	const secret = process.env.MAGPIE_ADMIN_SECRET;
	return typeof secret === "string" && secret.length > 0 ? secret : null;
}

/** True when the server is configured to allow admin mutations at all. */
export function isAdminConfigured(): boolean {
	return getAdminSecret() !== null;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	return toHex(sig);
}

async function sha256Hex(input: string): Promise<string> {
	return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
}

/** Mint the session token for a given secret. Deterministic (stateless session). */
export async function mintSessionToken(secret: string): Promise<string> {
	return hmacHex(secret, SESSION_PAYLOAD);
}

/**
 * Verify a session-cookie value against the configured secret.
 * Returns false when no secret is configured (fail closed) or the token is
 * missing/forged.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
	const secret = getAdminSecret();
	if (!secret || !token) return false;
	const expected = await mintSessionToken(secret);
	return timingSafeEqual(token, expected);
}

/**
 * Verify a submitted admin password against the configured secret using a
 * constant-time comparison of their SHA-256 digests. Returns false when no
 * secret is configured (fail closed).
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
	const secret = getAdminSecret();
	if (!secret || !password) return false;
	const [a, b] = await Promise.all([sha256Hex(password), sha256Hex(secret)]);
	return timingSafeEqual(a, b);
}
