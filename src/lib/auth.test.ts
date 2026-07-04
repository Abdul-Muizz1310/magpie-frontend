// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import {
	getAdminSecret,
	isAdminConfigured,
	mintSessionToken,
	verifyAdminPassword,
	verifySessionToken,
} from "./auth";

const ORIGINAL = process.env.MAGPIE_ADMIN_SECRET;

afterEach(() => {
	if (ORIGINAL === undefined) delete process.env.MAGPIE_ADMIN_SECRET;
	else process.env.MAGPIE_ADMIN_SECRET = ORIGINAL;
});

describe("getAdminSecret / isAdminConfigured", () => {
	it("treats unset and empty secrets as not configured (fail closed)", () => {
		delete process.env.MAGPIE_ADMIN_SECRET;
		expect(getAdminSecret()).toBeNull();
		expect(isAdminConfigured()).toBe(false);
		process.env.MAGPIE_ADMIN_SECRET = "";
		expect(isAdminConfigured()).toBe(false);
	});

	it("reports configured when a non-empty secret is set", () => {
		process.env.MAGPIE_ADMIN_SECRET = "hunter2";
		expect(getAdminSecret()).toBe("hunter2");
		expect(isAdminConfigured()).toBe(true);
	});
});

describe("session tokens", () => {
	it("mints a token that verifies against the same secret", async () => {
		process.env.MAGPIE_ADMIN_SECRET = "s3cret";
		const token = await mintSessionToken("s3cret");
		expect(await verifySessionToken(token)).toBe(true);
	});

	it("rejects a token minted for a different secret", async () => {
		const forged = await mintSessionToken("other-secret");
		process.env.MAGPIE_ADMIN_SECRET = "s3cret";
		expect(await verifySessionToken(forged)).toBe(false);
	});

	it("rejects missing/empty tokens", async () => {
		process.env.MAGPIE_ADMIN_SECRET = "s3cret";
		expect(await verifySessionToken(undefined)).toBe(false);
		expect(await verifySessionToken("")).toBe(false);
	});

	it("fails closed: no secret configured ⇒ no token ever verifies", async () => {
		const token = await mintSessionToken("s3cret");
		delete process.env.MAGPIE_ADMIN_SECRET;
		expect(await verifySessionToken(token)).toBe(false);
	});
});

describe("verifyAdminPassword", () => {
	it("accepts the correct password (== secret)", async () => {
		process.env.MAGPIE_ADMIN_SECRET = "correct horse";
		expect(await verifyAdminPassword("correct horse")).toBe(true);
	});

	it("rejects the wrong password", async () => {
		process.env.MAGPIE_ADMIN_SECRET = "correct horse";
		expect(await verifyAdminPassword("battery staple")).toBe(false);
	});

	it("fails closed when no secret is configured", async () => {
		delete process.env.MAGPIE_ADMIN_SECRET;
		expect(await verifyAdminPassword("anything")).toBe(false);
	});
});
