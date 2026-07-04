// Best-effort fixed-window rate limiter.
//
// LIMITATION: state lives in module memory, so it is per-serverless-instance,
// not global. On Vercel this bounds abuse from a single warm instance but a
// determined attacker hitting many cold starts can exceed the nominal budget.
// For durable, cross-instance limiting swap this for Vercel KV / Upstash Redis
// (see needs_user in the audit report). It is still a meaningful brake on the
// naive "spam the delete/enqueue action" abuse the audit flagged, and it never
// blocks a legitimate operator's normal usage.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the call is allowed, false if the caller has exhausted its
 * budget for the current window. Fixed-window: `limit` calls per `windowMs`.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();
	const bucket = buckets.get(key);
	if (!bucket || now >= bucket.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	if (bucket.count >= limit) return false;
	bucket.count += 1;
	return true;
}

/** Test-only: clear all buckets so windows don't leak across cases. */
export function __resetRateLimit(): void {
	buckets.clear();
}
