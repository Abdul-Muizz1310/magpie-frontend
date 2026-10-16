import "server-only";

import { createPrivateKey, type KeyObject, randomUUID, sign } from "node:crypto";
import { ConfigError, envValue } from "./env";

// magpie-frontend's platform token (spec 07, workspace DR-0030): a 60-second EdDSA JWT, signed
// with magpie-frontend's own Ed25519 key, that magpie-backend accepts in `X-Platform-Token`.
// Server-only: the key and the signer must never reach a client bundle.

export const SIGNING_KEY_ENV = "MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE";
export const PLATFORM_TOKEN_HEADER = "X-Platform-Token";
export const TOKEN_LIFETIME_S = 60;
export const TOKEN_HEADER = { alg: "EdDSA", typ: "JWT", kid: "magpie-frontend-2026-10" } as const;

export type PlatformTokenClaims = {
	sub: "magpie-frontend";
	role: "frontend";
	service: "magpie";
	iat: number;
	exp: number;
	jti: string;
};

export type SigningKey =
	| { ok: true; key: KeyObject }
	| { ok: false; reason: "missing" | "malformed" };

// ── Pure core ──────────────────────────────────────────────────────────────

export function base64url(input: string | Uint8Array): string {
	return Buffer.from(input).toString("base64url");
}

/** The claims for a token issued at `nowS` (whole seconds). */
export function tokenClaims(nowS: number, jti: string): PlatformTokenClaims {
	return {
		sub: "magpie-frontend",
		role: "frontend",
		service: "magpie",
		iat: nowS,
		exp: nowS + TOKEN_LIFETIME_S,
		jti,
	};
}

/** `base64url(header).base64url(claims)`: the bytes the signature covers. */
export function signingInput(claims: PlatformTokenClaims): string {
	return `${base64url(JSON.stringify(TOKEN_HEADER))}.${base64url(JSON.stringify(claims))}`;
}

// Standard alphabet, padded, one line: the format of bastion's BASTION_SIGNING_KEY_PRIVATE.
// Checked first because Node's base64 decoder skips characters it does not know.
const STANDARD_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

/** Parse the env value into an Ed25519 private key. Never throws; never echoes the value. */
export function parseSigningKey(raw: string | undefined): SigningKey {
	const value = envValue(raw);
	if (value === null) return { ok: false, reason: "missing" };
	if (!STANDARD_BASE64.test(value)) return { ok: false, reason: "malformed" };
	let key: KeyObject;
	try {
		key = createPrivateKey({ key: Buffer.from(value, "base64"), format: "der", type: "pkcs8" });
	} catch {
		return { ok: false, reason: "malformed" };
	}
	if (key.asymmetricKeyType !== "ed25519") return { ok: false, reason: "malformed" };
	return { ok: true, key };
}

/** A compact JWS over `claims`. Ed25519 is deterministic: same key and claims, same token. */
export function signToken(key: KeyObject, claims: PlatformTokenClaims): string {
	const input = signingInput(claims);
	return `${input}.${base64url(sign(null, Buffer.from(input), key))}`;
}

// ── Imperative shell ───────────────────────────────────────────────────────

/**
 * A fresh token from the configured key, issued at `nowMs`. Throws `ConfigError` naming the
 * variable (never its value) when the key is missing or malformed, so no caller can send an
 * unsigned request by accident.
 */
export function mintPlatformToken(nowMs: number = Date.now()): string {
	const parsed = parseSigningKey(process.env.MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE);
	if (!parsed.ok) {
		throw new ConfigError(
			parsed.reason === "missing"
				? `${SIGNING_KEY_ENV} is not set`
				: `${SIGNING_KEY_ENV} is not an Ed25519 PKCS#8 private key in base64 DER`,
		);
	}
	return signToken(parsed.key, tokenClaims(Math.floor(nowMs / 1000), randomUUID()));
}
