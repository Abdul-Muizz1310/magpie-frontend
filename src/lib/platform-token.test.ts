// @vitest-environment node
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeKeyPair, verifyToken } from "../../test/platform-keys";
import { ConfigError } from "./env";
import {
	base64url,
	mintPlatformToken,
	parseSigningKey,
	SIGNING_KEY_ENV,
	signingInput,
	signToken,
	TOKEN_HEADER,
	TOKEN_LIFETIME_S,
	tokenClaims,
} from "./platform-token";

const NOW_S = 1_792_000_000;
const JTI = "0d3c5d1e-8a4b-4c2f-9e6a-7b1f2c3d4e5f";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("base64url (T-PTP-1)", () => {
	it("uses the URL alphabet with no padding", () => {
		// 0xfb 0xff 0xbf is "+/+/" in standard base64.
		const bytes = new Uint8Array([0xfb, 0xff, 0xbf, 0xfb]);
		const encoded = base64url(bytes);
		expect(encoded).not.toMatch(/[+/=]/);
		expect(encoded).toBe("-_-_-w");
	});

	it("decodes back to the input, for strings and bytes", () => {
		const text = '{"alg":"EdDSA","note":"ünïcode"}';
		expect(Buffer.from(base64url(text), "base64url").toString("utf8")).toBe(text);
		const bytes = randomBytes(37);
		expect(Buffer.from(base64url(bytes), "base64url").equals(bytes)).toBe(true);
	});
});

describe("tokenClaims (T-PTP-2)", () => {
	it("is exactly the contract's claim set, living 60 seconds", () => {
		const claims = tokenClaims(NOW_S, JTI);
		expect(claims).toStrictEqual({
			sub: "magpie-frontend",
			role: "frontend",
			service: "magpie",
			iat: NOW_S,
			exp: NOW_S + 60,
			jti: JTI,
		});
		expect(Object.keys(claims)).toEqual(["sub", "role", "service", "iat", "exp", "jti"]);
		expect(TOKEN_LIFETIME_S).toBe(60);
	});
});

describe("signToken (T-PTP-3)", () => {
	const keys = makeKeyPair();
	const parsed = parseSigningKey(keys.privateKeyB64);
	if (!parsed.ok) throw new Error("test key did not parse");
	const claims = tokenClaims(NOW_S, JTI);

	it("is a compact JWS with the fixed header, verifiable with the matching public key", () => {
		const token = signToken(parsed.key, claims);
		expect(token.split(".")).toHaveLength(3);
		expect(token.startsWith(`${signingInput(claims)}.`)).toBe(true);
		const verified = verifyToken(token, keys.publicKey);
		expect(verified?.header).toStrictEqual({
			alg: "EdDSA",
			typ: "JWT",
			kid: "magpie-frontend-2026-10",
		});
		expect(TOKEN_HEADER).toStrictEqual(verified?.header);
		expect(verified?.claims).toStrictEqual(claims);
	});

	it("does not verify with another keypair's public key", () => {
		const token = signToken(parsed.key, claims);
		expect(verifyToken(token, makeKeyPair().publicKey)).toBeNull();
	});

	it("does not verify once a claim is altered", () => {
		const [header, , signature] = signToken(parsed.key, claims).split(".");
		const forged = base64url(JSON.stringify({ ...claims, service: "paper-trail" }));
		expect(verifyToken(`${header}.${forged}.${signature}`, keys.publicKey)).toBeNull();
	});

	it("is deterministic: the same key and claims give the same token", () => {
		expect(signToken(parsed.key, claims)).toBe(signToken(parsed.key, claims));
	});
});

describe("parseSigningKey (T-PTP-4)", () => {
	const keys = makeKeyPair();

	it.each([
		["unset", undefined],
		["empty", ""],
		["whitespace", " \r\n\t"],
		["BOM only", "﻿"],
	])("%s is missing", (_label, raw) => {
		expect(parseSigningKey(raw)).toStrictEqual({ ok: false, reason: "missing" });
	});

	it("parses a key wrapped in a BOM and CRLF (a Windows pipe)", () => {
		const parsed = parseSigningKey(`﻿${keys.privateKeyB64}\r\n`);
		expect(parsed.ok).toBe(true);
		if (parsed.ok) expect(parsed.key.asymmetricKeyType).toBe("ed25519");
	});

	const rsaPkcs8 = generateKeyPairSync("rsa", { modulusLength: 1024 })
		.privateKey.export({ format: "der", type: "pkcs8" })
		.toString("base64");
	const ed25519Spki = keys.publicKey.export({ format: "der", type: "spki" }).toString("base64");
	const pem = generateKeyPairSync("ed25519").privateKey.export({ format: "pem", type: "pkcs8" });
	const lineBroken = keys.privateKeyB64.replace(/(.{16})/g, "$1\n");

	it.each([
		["not base64", "not base64!"],
		["base64 with line breaks", lineBroken],
		["PEM text", String(pem)],
		["random bytes", randomBytes(48).toString("base64")],
		["an RSA PKCS#8 key", rsaPkcs8],
		["an Ed25519 SPKI public key", ed25519Spki],
	])("%s is malformed", (_label, raw) => {
		expect(parseSigningKey(raw)).toStrictEqual({ ok: false, reason: "malformed" });
	});
});

describe("mintPlatformToken (T-PTP-5)", () => {
	it("signs the env key's token with claims from the injected clock", () => {
		const keys = makeKeyPair();
		vi.stubEnv(SIGNING_KEY_ENV, keys.privateKeyB64);
		const verified = verifyToken(mintPlatformToken(NOW_S * 1000 + 999), keys.publicKey);
		expect(verified?.claims.iat).toBe(NOW_S);
		expect(verified?.claims.exp).toBe(NOW_S + 60);
		expect(verified?.claims.sub).toBe("magpie-frontend");
		expect(verified?.claims.jti).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it("mints a fresh jti on every call", () => {
		const keys = makeKeyPair();
		vi.stubEnv(SIGNING_KEY_ENV, keys.privateKeyB64);
		const a = verifyToken(mintPlatformToken(NOW_S * 1000), keys.publicKey);
		const b = verifyToken(mintPlatformToken(NOW_S * 1000), keys.publicKey);
		expect(a?.claims.jti).not.toBe(b?.claims.jti);
	});

	it("throws ConfigError naming the variable when the key is missing", () => {
		vi.stubEnv(SIGNING_KEY_ENV, "");
		expect(() => mintPlatformToken()).toThrow(ConfigError);
		expect(() => mintPlatformToken()).toThrow(/MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE is not set/);
	});

	it("throws ConfigError naming the variable, never echoing the value, when malformed", () => {
		const secretLooking = "c2VjcmV0LWJ1dC1ub3QtYS1rZXk=";
		vi.stubEnv(SIGNING_KEY_ENV, secretLooking);
		let caught: unknown;
		try {
			mintPlatformToken();
		} catch (e) {
			caught = e;
		}
		expect(caught).toBeInstanceOf(ConfigError);
		expect((caught as Error).message).toMatch(/MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE/);
		expect((caught as Error).message).not.toContain(secretLooking);
	});
});
