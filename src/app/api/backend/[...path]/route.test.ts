// @vitest-environment node
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { API_URL, makeSourceSummary } from "../../../../../test/msw/fixtures";
import { server } from "../../../../../test/msw/server";
import { makeKeyPair, type TestKeyPair, verifyToken } from "../../../../../test/platform-keys";

// The proxy route (spec 07, T-PTP-8..17). Non-GET methods are admin-gated through the same
// `requireAdmin` the Server Actions use, which reads the session cookie through next/headers.
const ADMIN_SECRET = "test-admin-secret";
let sessionCookie: string | undefined;
vi.mock("next/headers", () => ({
	cookies: async () => ({
		get: (name: string) =>
			name === "magpie_session" && sessionCookie ? { value: sessionCookie } : undefined,
	}),
	headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));

const route = await import("./route");
const { isWithinBackend, upstreamUrl } = await import("@/lib/backend-proxy");
const { SIGNING_KEY_ENV } = await import("@/lib/platform-token");
const { mintSessionToken } = await import("@/lib/auth");
const { __resetRateLimit } = await import("@/lib/rate-limit");

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function call(
	method: Method,
	path: string[],
	init: {
		search?: string;
		headers?: Record<string, string>;
		body?: string;
		signal?: AbortSignal;
	} = {},
): Promise<Response> {
	// The proxy reads only the query from the URL; the path arrives as Next's decoded segments.
	// `new URL` percent-encodes what the browser would (a lone surrogate becomes U+FFFD).
	const url = new URL(`http://localhost:3000/api/backend/${path.join("/")}${init.search ?? ""}`);
	const request = new Request(url, {
		method,
		headers: init.headers,
		body: init.body,
		signal: init.signal,
	});
	return route[method](request, { params: Promise.resolve({ path }) });
}

/** Count every request that reaches any upstream URL. */
function countUpstream(): { hits: number } {
	const counter = { hits: 0 };
	server.use(
		http.all("*", () => {
			counter.hits += 1;
			return HttpResponse.json({});
		}),
	);
	return counter;
}

let keys: TestKeyPair;
let consoleError: MockInstance<typeof console.error>;

beforeEach(async () => {
	keys = makeKeyPair();
	vi.stubEnv(SIGNING_KEY_ENV, keys.privateKeyB64);
	vi.stubEnv("MAGPIE_ADMIN_SECRET", ADMIN_SECRET);
	sessionCookie = await mintSessionToken(ADMIN_SECRET);
	__resetRateLimit();
	consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
	vi.unstubAllEnvs();
	consoleError.mockRestore();
});

describe("route module (T-PTP-17)", () => {
	it("exports the five methods and a 300 s budget, and no `dynamic` or `runtime`", () => {
		for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) {
			expect(typeof route[method]).toBe("function");
		}
		expect(route.maxDuration).toBe(300);
		// Cache Components rejects both at build time; Node is already its only runtime.
		expect("dynamic" in route).toBe(false);
		expect("runtime" in route).toBe(false);
	});
});

describe("happy path (T-PTP-8)", () => {
	it("forwards a GET with its query and returns the backend's status and JSON", async () => {
		let seen: { url: string; token: string | null } | undefined;
		server.use(
			http.get(`${API_URL}/sources`, ({ request }) => {
				seen = { url: request.url, token: request.headers.get("x-platform-token") };
				return HttpResponse.json([makeSourceSummary()]);
			}),
		);
		const res = await call("GET", ["sources"], { search: "?limit=5&q=a%20b" });
		expect(res.status).toBe(200);
		expect(await res.json()).toStrictEqual([makeSourceSummary()]);
		expect(seen?.url).toBe(`${API_URL}/sources?limit=5&q=a%20b`);
		const claims = verifyToken(seen?.token ?? "", keys.publicKey)?.claims;
		expect(claims?.iss).toBe("magpie-frontend");
		expect(claims?.aud).toBe("magpie");
		expect(claims?.sub).toBe("magpie-frontend");
		expect(claims?.role).toBe("frontend");
		expect(claims?.service).toBe("magpie");
		expect(Number(claims?.exp) - Number(claims?.iat)).toBe(60);
	});
});

describe("header allowlists (T-PTP-9)", () => {
	it("forwards only the allowlisted request headers, plus the token and the visitor's IP", async () => {
		let upstream: Headers | undefined;
		server.use(
			http.get(`${API_URL}/sources`, ({ request }) => {
				upstream = request.headers;
				return HttpResponse.json([]);
			}),
		);
		await call("GET", ["sources"], {
			headers: {
				"content-type": "application/json",
				accept: "text/event-stream",
				"last-event-id": "42",
				"x-request-id": "req-1",
				cookie: "magpie_session=abc",
				authorization: "Bearer stolen",
				"x-custom": "nope",
				"x-forwarded-for": "198.51.100.1, 10.0.0.1",
				"x-real-ip": "192.0.2.9",
			},
		});
		expect(upstream?.get("content-type")).toBe("application/json");
		expect(upstream?.get("accept")).toBe("text/event-stream");
		expect(upstream?.get("last-event-id")).toBe("42");
		expect(upstream?.get("x-request-id")).toBe("req-1");
		expect(upstream?.get("x-forwarded-for")).toBe("198.51.100.1, 10.0.0.1");
		expect(verifyToken(upstream?.get("x-platform-token") ?? "", keys.publicKey)).not.toBeNull();
		expect(upstream?.get("cookie")).toBeNull();
		expect(upstream?.get("authorization")).toBeNull();
		expect(upstream?.get("x-custom")).toBeNull();
		expect(upstream?.get("x-real-ip")).toBeNull();
	});

	it("falls back to x-real-ip for X-Forwarded-For, and sends none without either", async () => {
		const seen: (string | null)[] = [];
		server.use(
			http.get(`${API_URL}/sources`, ({ request }) => {
				seen.push(request.headers.get("x-forwarded-for"));
				return HttpResponse.json([]);
			}),
		);
		await call("GET", ["sources"], { headers: { "x-real-ip": "192.0.2.9" } });
		await call("GET", ["sources"]);
		expect(seen).toEqual(["192.0.2.9", null]);
	});

	it("returns only the allowlisted response headers", async () => {
		server.use(
			http.get(`${API_URL}/sources`, () =>
				HttpResponse.json([], {
					headers: {
						"cache-control": "no-cache",
						"retry-after": "7",
						"x-request-id": "req-2",
						"last-event-id": "43",
						"set-cookie": "tracker=1",
						"x-powered-by": "uvicorn",
						"access-control-allow-origin": "*",
					},
				}),
			),
		);
		const res = await call("GET", ["sources"]);
		expect(res.headers.get("content-type")).toBe("application/json");
		expect(res.headers.get("cache-control")).toBe("no-cache");
		expect(res.headers.get("retry-after")).toBe("7");
		expect(res.headers.get("x-request-id")).toBe("req-2");
		expect(res.headers.get("last-event-id")).toBe("43");
		expect(res.headers.get("set-cookie")).toBeNull();
		expect(res.headers.get("x-powered-by")).toBeNull();
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});
});

describe("statuses (T-PTP-10)", () => {
	it.each([401, 404, 429])("passes a %i through with its body", async (status) => {
		server.use(
			http.get(`${API_URL}/sources/x`, () =>
				HttpResponse.json(
					{ detail: "nope" },
					{ status, headers: status === 429 ? { "retry-after": "30" } : {} },
				),
			),
		);
		const res = await call("GET", ["sources", "x"]);
		expect(res.status).toBe(status);
		expect(await res.json()).toStrictEqual({ detail: "nope" });
		if (status === 429) expect(res.headers.get("retry-after")).toBe("30");
	});

	it("answers a 204 with no body", async () => {
		server.use(
			http.delete(`${API_URL}/api/sources/x`, () => new HttpResponse(null, { status: 204 })),
		);
		const res = await call("DELETE", ["api", "sources", "x"]);
		expect(res.status).toBe(204);
		expect(res.body).toBeNull();
	});

	it("does not follow a redirect, and does not hand its location to the browser", async () => {
		let followed = false;
		server.use(
			http.get(
				`${API_URL}/sources/x`,
				() =>
					new HttpResponse(null, { status: 307, headers: { location: `${API_URL}/elsewhere` } }),
			),
			http.get(`${API_URL}/elsewhere`, () => {
				followed = true;
				return HttpResponse.json([]);
			}),
		);
		const res = await call("GET", ["sources", "x"]);
		expect(res.status).toBe(307);
		expect(res.headers.get("location")).toBeNull();
		expect(followed).toBe(false);
	});
});

describe("bodies (T-PTP-11)", () => {
	it.each(["POST", "PUT", "PATCH", "DELETE"] as const)(
		"forwards a %s with its body byte for byte",
		async (method) => {
			const body = JSON.stringify({ yaml: "name: ünïcode\n", n: 1 });
			let seen: { method: string; body: string; type: string | null } | undefined;
			server.use(
				http.all(`${API_URL}/api/sources/x`, async ({ request }) => {
					seen = {
						method: request.method,
						body: await request.text(),
						type: request.headers.get("content-type"),
					};
					return HttpResponse.json({ ok: true });
				}),
			);
			const res = await call(method, ["api", "sources", "x"], {
				headers: { "content-type": "application/json" },
				body,
			});
			expect(res.status).toBe(200);
			expect(seen).toStrictEqual({ method, body, type: "application/json" });
		},
	);
});

describe("admin gate on non-GET methods (T-PTP-12)", () => {
	it("refuses an anonymous POST with 401 and never reaches the backend", async () => {
		sessionCookie = undefined;
		const upstream = countUpstream();
		const res = await call("POST", ["api", "scrape", "hackernews", "once"], { body: "{}" });
		expect(res.status).toBe(401);
		expect(await res.json()).toHaveProperty("error");
		expect(upstream.hits).toBe(0);
	});

	it("refuses every mutation with 503 when no admin secret is configured", async () => {
		vi.stubEnv("MAGPIE_ADMIN_SECRET", "");
		const upstream = countUpstream();
		const res = await call("DELETE", ["api", "sources", "x"]);
		expect(res.status).toBe(503);
		expect(upstream.hits).toBe(0);
	});

	it("lets an anonymous GET through", async () => {
		sessionCookie = undefined;
		server.use(http.get(`${API_URL}/sources`, () => HttpResponse.json([])));
		const res = await call("GET", ["sources"]);
		expect(res.status).toBe(200);
	});
});

describe("path guard (T-PTP-13)", () => {
	it.each([
		["a dot-dot segment", [".."]],
		["a trailing dot-dot", ["sources", ".."]],
		["a dot segment", ["."]],
		["an empty segment", ["sources", ""]],
		["a lone empty segment", [""]],
		["a backslash", ["sources\\..\\admin"]],
		["an encoded slash", ["sources", "x/../../admin"]],
		["no segments", []],
		["a segment that cannot be encoded (a lone surrogate)", ["sources", "\ud800"]],
	])("rejects %s with 400 and no upstream call", async (_label, path) => {
		const upstream = countUpstream();
		const res = await call("GET", path);
		expect(res.status).toBe(400);
		expect(await res.json()).toStrictEqual({ error: "invalid backend path" });
		expect(upstream.hits).toBe(0);
	});

	it("re-encodes each segment", async () => {
		let pathname = "";
		server.use(
			http.get(`${API_URL}/sources/:name`, ({ request }) => {
				pathname = new URL(request.url).pathname;
				return HttpResponse.json(makeSourceSummary());
			}),
		);
		const res = await call("GET", ["sources", "hacker news?#"]);
		expect(res.status).toBe(200);
		expect(pathname).toBe("/sources/hacker%20news%3F%23");
	});

	it("joins onto a base URL that has a path", () => {
		expect(upstreamUrl("http://localhost:9999/v1", ["sources"], "?a=1")?.href).toBe(
			"http://localhost:9999/v1/sources?a=1",
		);
		expect(upstreamUrl("http://localhost:9999/v1", [".."], "")).toBeNull();
	});

	it("only accepts URLs on the backend's origin and under its base path", () => {
		const base = new URL("http://localhost:9999/v1");
		expect(isWithinBackend(new URL("http://localhost:9999/v1/sources"), base)).toBe(true);
		expect(isWithinBackend(new URL("http://evil.test/v1/sources"), base)).toBe(false);
		expect(isWithinBackend(new URL("https://localhost:9999/v1/sources"), base)).toBe(false);
		expect(isWithinBackend(new URL("http://localhost:9998/v1/sources"), base)).toBe(false);
		expect(isWithinBackend(new URL("http://localhost:9999/v2/sources"), base)).toBe(false);
		expect(isWithinBackend(new URL("http://localhost:9999/v1x/sources"), base)).toBe(false);
		expect(isWithinBackend(new URL("http://localhost:9999/sources"), new URL(API_URL))).toBe(true);
	});
});

describe("configuration (T-PTP-14)", () => {
	it.each([
		["missing", ""],
		["malformed", "c2VjcmV0LWJ1dC1ub3QtYS1rZXk="],
	])("answers 503 with no upstream call when the key is %s", async (_label, raw) => {
		vi.stubEnv(SIGNING_KEY_ENV, raw);
		const upstream = countUpstream();
		const res = await call("GET", ["sources"]);
		expect(res.status).toBe(503);
		expect(await res.json()).toStrictEqual({ error: "proxy not configured" });
		expect(upstream.hits).toBe(0);
		const logged = consoleError.mock.calls.flat().map(String).join(" ");
		expect(logged).toContain(SIGNING_KEY_ENV);
		if (raw) expect(logged).not.toContain(raw);
	});

	it("answers 503 with no upstream call when the backend URL is unusable", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "not a url");
		const upstream = countUpstream();
		const res = await call("GET", ["sources"]);
		expect(res.status).toBe(503);
		expect(await res.json()).toStrictEqual({ error: "proxy not configured" });
		expect(upstream.hits).toBe(0);
	});

	it("reaches the backend when its URL carries a BOM and CRLF (T-ENV-4)", async () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", `﻿${API_URL}\r\n`);
		server.use(
			http.get(`${API_URL}/health`, () =>
				HttpResponse.json({ status: "ok", service: "magpie", db: "ok" }),
			),
		);
		const res = await call("GET", ["health"]);
		expect(res.status).toBe(200);
		expect(await res.json()).toHaveProperty("db", "ok");
	});
});

describe("upstream down (T-PTP-15)", () => {
	it("answers 502 when the backend cannot be reached", async () => {
		server.use(http.get(`${API_URL}/sources`, () => HttpResponse.error()));
		const res = await call("GET", ["sources"]);
		expect(res.status).toBe(502);
		expect(await res.json()).toStrictEqual({ error: "backend unreachable" });
	});
});

describe("streaming (T-PTP-16)", () => {
	function within<T>(ms: number, promise: Promise<T>): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`no data in ${ms} ms`)), ms)),
		]);
	}

	it("streams an event stream through without waiting for it to end", async () => {
		const encoder = new TextEncoder();
		let release: () => void = () => undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		server.use(
			http.get(`${API_URL}/api/runs/x/events`, () => {
				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						controller.enqueue(encoder.encode("event: a\ndata: 1\n\n"));
						await gate;
						controller.enqueue(encoder.encode("event: b\ndata: 2\n\n"));
						controller.close();
					},
				});
				return new HttpResponse(stream, {
					headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
				});
			}),
		);
		const res = await within(2_000, call("GET", ["api", "runs", "x", "events"]));
		expect(res.headers.get("content-type")).toBe("text/event-stream");
		const reader = res.body?.getReader();
		if (!reader) throw new Error("no body");
		const decoder = new TextDecoder();
		const first = await within(2_000, reader.read());
		expect(decoder.decode(first.value)).toContain("data: 1");
		release();
		let rest = "";
		for (;;) {
			const chunk = await within(2_000, reader.read());
			if (chunk.done) break;
			rest += decoder.decode(chunk.value);
		}
		expect(rest).toContain("data: 2");
	});

	it("fetches with no-store, manual redirects and the request's own signal", async () => {
		server.use(http.get(`${API_URL}/sources`, () => HttpResponse.json([])));
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		try {
			const controller = new AbortController();
			const request = new Request("http://localhost:3000/api/backend/sources", {
				signal: controller.signal,
			});
			await route.GET(request, { params: Promise.resolve({ path: ["sources"] }) });
			const init = fetchSpy.mock.calls[0]?.[1];
			expect(init?.cache).toBe("no-store");
			expect(init?.redirect).toBe("manual");
			expect(init?.signal).toBe(request.signal);
		} finally {
			fetchSpy.mockRestore();
		}
	});
});
