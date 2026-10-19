// @vitest-environment node
import { HttpResponse, http, passthrough } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "./msw/server";

/**
 * Post-deploy smoke tier (spec 08): the deployed magpie-backend's `/health`.
 *
 * `SMOKE_BASE_URL` is a bare origin, e.g. `https://magpie-backend-t4bb.onrender.com`. CI passes
 * it only to the push-gated `smoke` job (from the repository variable of the same name); the
 * `test` job never sees it, so there the live test skips and makes no request. Run it locally:
 *
 *     SMOKE_BASE_URL=https://magpie-backend-t4bb.onrender.com pnpm vitest run test/smoke.test.ts
 */

const SMOKE_URL_ENV = "SMOKE_BASE_URL";

// Render's free tier holds the first request open while the container cold-boots (over 70 s
// measured), so a tight timeout would report a dead deploy for what is a cold start.
const ATTEMPT_TIMEOUT_MS = 120_000;
const ATTEMPTS = 3;
const RETRY_DELAY_MS = 5_000;
const RETRY_STATUSES = new Set([502, 503, 504]);

class SmokeTargetError extends Error {}

/** The configured smoke origin; `null` when the tier is off. Throws on anything unusable. */
function smokeBaseUrl(raw: string | undefined): string | null {
	if (raw === undefined || raw.trim() === "") return null;
	const value = raw.trim().replace(/\/+$/, "");
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new SmokeTargetError(`${SMOKE_URL_ENV}=${JSON.stringify(raw)} is not a URL`);
	}
	const isHttp = url.protocol === "http:" || url.protocol === "https:";
	if (!isHttp || url.host === "" || url.pathname !== "/" || url.search !== "" || url.hash !== "") {
		throw new SmokeTargetError(
			`${SMOKE_URL_ENV}=${JSON.stringify(raw)} must be a bare http(s) origin (no path or query)`,
		);
	}
	return url.origin;
}

async function probeHealth(origin: string): Promise<Response> {
	const url = `${origin}/health`;
	let last = "no attempt made";
	for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
		try {
			const res = await fetch(url, {
				cache: "no-store",
				signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
			});
			if (!RETRY_STATUSES.has(res.status)) return res;
			last = `HTTP ${res.status}`;
			if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
		} catch (error) {
			last = error instanceof Error ? error.message : String(error);
		}
	}
	throw new Error(`GET ${url} did not come up after ${ATTEMPTS} attempts: ${last}`);
}

describe("smoke target resolution (always runs)", () => {
	it.each([undefined, "", "   ", "\n"])("%j means the tier is off", (raw) => {
		expect(smokeBaseUrl(raw)).toBeNull();
	});

	it("strips a trailing slash and keeps a port", () => {
		expect(smokeBaseUrl("https://magpie.test/")).toBe("https://magpie.test");
		expect(smokeBaseUrl("http://localhost:8000")).toBe("http://localhost:8000");
	});

	it.each([
		["no scheme", "magpie.test"],
		["ftp", "ftp://magpie.test"],
		["no host", "https://"],
		["a path", "https://magpie.test/health"],
		["a query", "https://magpie.test/?x=1"],
		["free text", "not a url"],
	])("%s fails loudly, naming the variable", (_label, raw) => {
		expect(() => smokeBaseUrl(raw)).toThrow(SmokeTargetError);
		expect(() => smokeBaseUrl(raw)).toThrow(/SMOKE_BASE_URL/);
	});

	it("probes with retries: a 503 then a 200 is up", async () => {
		let calls = 0;
		server.use(
			http.get("https://cold.test/health", () => {
				calls += 1;
				return calls === 1
					? HttpResponse.json({ status: "booting" }, { status: 503 })
					: HttpResponse.json({ status: "ok", service: "magpie" });
			}),
		);
		const res = await probeHealth("https://cold.test");
		expect(res.status).toBe(200);
		expect(calls).toBe(2);
	}, 20_000);
});

const target = smokeBaseUrl(process.env[SMOKE_URL_ENV]);

describe("deployed backend health (skipped unless SMOKE_BASE_URL is set)", () => {
	it.skipIf(target === null)(
		"GET /health answers 200 with status ok for magpie",
		async () => {
			const origin = target as string;
			server.use(http.get(`${origin}/health`, () => passthrough()));
			const res = await probeHealth(origin);
			const body = await res.text();
			expect(res.status, `GET ${origin}/health -> ${res.status}\n${body.slice(0, 500)}`).toBe(
				200,
			);
			const json = JSON.parse(body) as { status?: string; service?: string };
			expect(json.status).toBe("ok");
			expect(json.service).toBe("magpie");
		},
		ATTEMPTS * (ATTEMPT_TIMEOUT_MS + RETRY_DELAY_MS) + 10_000,
	);
});
