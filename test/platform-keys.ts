import { generateKeyPairSync, type KeyObject, verify } from "node:crypto";

// Throwaway Ed25519 keypairs for the platform-token tests (spec 07). Generated per test file;
// no real key is ever read.

export type TestKeyPair = {
	/** PKCS#8 DER, standard base64: the format of MAGPIE_FRONTEND_SIGNING_KEY_PRIVATE. */
	privateKeyB64: string;
	publicKey: KeyObject;
};

export function makeKeyPair(): TestKeyPair {
	const { privateKey, publicKey } = generateKeyPairSync("ed25519");
	return {
		privateKeyB64: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
		publicKey,
	};
}

export type VerifiedToken = {
	header: Record<string, unknown>;
	claims: Record<string, unknown>;
};

function decodeSegment(segment: string): Record<string, unknown> {
	return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
}

/** Verify a compact EdDSA JWS against `publicKey`, as the backend does; null when it fails. */
export function verifyToken(token: string, publicKey: KeyObject): VerifiedToken | null {
	const parts = token.split(".");
	if (parts.length !== 3) return null;
	const [header, claims, signature] = parts;
	const signed = Buffer.from(`${header}.${claims}`);
	if (!verify(null, signed, publicKey, Buffer.from(signature, "base64url"))) return null;
	return { header: decodeSegment(header), claims: decodeSegment(claims) };
}

/** The keypair `test/setup.ts` installs, so server-side code under test can sign. */
export const SETUP_KEYS = makeKeyPair();
