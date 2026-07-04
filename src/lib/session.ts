import { cookies, headers } from "next/headers";
import { COOKIE_NAME, isAdminConfigured, verifySessionToken } from "./auth";
import { checkRateLimit } from "./rate-limit";

// Server-side (Node runtime) session helpers for Server Actions and RSCs.
// Kept separate from `auth.ts` so the Edge-runtime `proxy.ts` never pulls in
// `next/headers`.

export type AuthOutcome = { ok: true } | { ok: false; status: number; message: string };

/** Read the session cookie and verify it against the configured admin secret. */
export async function isAuthenticated(): Promise<boolean> {
	const store = await cookies();
	const token = store.get(COOKIE_NAME)?.value;
	return verifySessionToken(token);
}

/** Best-effort client identifier for rate limiting (proxy-set forwarding headers). */
async function clientKey(): Promise<string> {
	const h = await headers();
	const fwd = h.get("x-forwarded-for");
	if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
	return h.get("x-real-ip") ?? "unknown";
}

/**
 * Gate a state-changing Server Action. Fails closed:
 *  - 503 when no admin secret is configured on the server (mutations disabled);
 *  - 401 when the caller has no valid session;
 *  - 429 when the caller exceeds the per-client mutation budget.
 * Returns `{ ok: true }` only for an authenticated, under-budget caller.
 */
export async function requireAdmin(action: string): Promise<AuthOutcome> {
	if (!isAdminConfigured()) {
		return {
			ok: false,
			status: 503,
			message: "Admin actions are disabled: MAGPIE_ADMIN_SECRET is not configured on the server.",
		};
	}
	if (!(await isAuthenticated())) {
		return { ok: false, status: 401, message: "Not authorized. Sign in to perform this action." };
	}
	// 30 mutations / 60s per client, keyed by action + IP. Best-effort in-memory
	// (per serverless instance) — see rate-limit.ts.
	const key = `${action}:${await clientKey()}`;
	if (!checkRateLimit(key, 30, 60_000)) {
		return {
			ok: false,
			status: 429,
			message: "Rate limit exceeded. Slow down and try again shortly.",
		};
	}
	return { ok: true };
}
