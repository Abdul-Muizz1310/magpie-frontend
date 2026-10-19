// @vitest-environment node
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL, makeSourceDetail, makeSourceSummary } from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";
import { makeKeyPair, type TestKeyPair, verifyToken } from "../../test/platform-keys";
import { serverApi } from "./api-server";
import { ConfigError } from "./env";
import { PLATFORM_TOKEN_HEADER, SIGNING_KEY_ENV } from "./platform-token";

// Server-side calls (RSC pages, data.ts, Server Actions) go straight to the backend with a
// freshly minted platform token (spec 07, T-PTP-6).

let keys: TestKeyPair;

beforeEach(() => {
	keys = makeKeyPair();
	vi.stubEnv(SIGNING_KEY_ENV, keys.privateKeyB64);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("serverApi carries a signed platform token (T-PTP-6)", () => {
	it("calls the backend directly with a token the backend can verify", async () => {
		const seen: { url: string; token: string | null }[] = [];
		server.use(
			http.get(`${API_URL}/sources`, ({ request }) => {
				seen.push({ url: request.url, token: request.headers.get(PLATFORM_TOKEN_HEADER) });
				return HttpResponse.json([makeSourceSummary()]);
			}),
		);
		const before = Math.floor(Date.now() / 1000);
		const sources = await serverApi.fetchSources();
		const after = Math.floor(Date.now() / 1000);

		expect(sources[0].name).toBe("hackernews");
		expect(seen).toHaveLength(1);
		expect(seen[0].url).toBe(`${API_URL}/sources`);
		const verified = verifyToken(seen[0].token ?? "", keys.publicKey);
		expect(verified).not.toBeNull();
		const claims = verified?.claims ?? {};
		expect(claims.iss).toBe("magpie-frontend");
		expect(claims.aud).toBe("magpie");
		expect(claims.sub).toBe("magpie-frontend");
		expect(claims.role).toBe("frontend");
		expect(claims.service).toBe("magpie");
		expect(claims.iat).toBeGreaterThanOrEqual(before);
		expect(claims.iat).toBeLessThanOrEqual(after);
		expect(Number(claims.exp) - Number(claims.iat)).toBe(60);
	});

	it("signs mutations too, keeping the JSON body", async () => {
		let token: string | null = null;
		let body: unknown;
		server.use(
			http.post(`${API_URL}/api/sources`, async ({ request }) => {
				token = request.headers.get(PLATFORM_TOKEN_HEADER);
				body = await request.json();
				return HttpResponse.json(makeSourceDetail(), { status: 201 });
			}),
		);
		await serverApi.createSource({ yaml: "name: x" });
		expect(verifyToken(token ?? "", keys.publicKey)).not.toBeNull();
		expect(body).toStrictEqual({ yaml: "name: x" });
	});

	it("mints a new token for every call", async () => {
		const tokens: string[] = [];
		server.use(
			http.get(`${API_URL}/sources`, ({ request }) => {
				tokens.push(request.headers.get(PLATFORM_TOKEN_HEADER) ?? "");
				return HttpResponse.json([]);
			}),
		);
		await serverApi.fetchSources();
		await serverApi.fetchSources();
		const [a, b] = tokens.map((t) => verifyToken(t, keys.publicKey)?.claims.jti);
		expect(a).toBeDefined();
		expect(a).not.toBe(b);
	});

	it.each([
		["missing", ""],
		["malformed", "bm90LWEta2V5"],
	])("rejects with ConfigError and sends nothing when the key is %s", async (_label, raw) => {
		vi.stubEnv(SIGNING_KEY_ENV, raw);
		let hits = 0;
		server.use(
			http.get(`${API_URL}/sources`, () => {
				hits += 1;
				return HttpResponse.json([]);
			}),
		);
		await expect(serverApi.fetchSources()).rejects.toBeInstanceOf(ConfigError);
		expect(hits).toBe(0);
	});
});
