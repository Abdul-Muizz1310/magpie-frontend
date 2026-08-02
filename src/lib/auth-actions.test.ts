// @vitest-environment node
//
// Exercises the REAL loginAction/logoutAction implementation end-to-end
// (real auth.ts crypto path, real session cookie semantics) instead of the
// module-level `vi.mock("@/lib/auth-actions", ...)` used by component tests
// (src/components/auth/AuthComponents.test.tsx), which stub these functions
// entirely and so never run the actual cookie-setting logic.
//
// Spec cases:
//  1. loginAction fails closed (ok:false, no cookie set) when no admin secret
//     is configured on the server.
//  2. loginAction rejects a wrong password (ok:false, no cookie set) when a
//     secret IS configured.
//  3. loginAction accepts the correct password: returns ok:true and sets a
//     cookie whose value verifies via the real verifySessionToken.
//  4. The cookie set on success carries httpOnly, sameSite=lax, path=/, and
//     maxAge=SESSION_MAX_AGE_S.
//  5. The cookie's `secure` flag follows NODE_ENV (true in production, false
//     otherwise) -- covers both branches of the ternary.
//  6. logoutAction deletes the session cookie by name.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN_SECRET = "test-admin-secret";

type SetCall = { name: string; value: string; options: Record<string, unknown> };
let setCalls: SetCall[];
let deleteCalls: string[];

vi.mock("next/headers", () => ({
	cookies: async () => ({
		set: (name: string, value: string, options: Record<string, unknown>) => {
			setCalls.push({ name, value, options });
		},
		delete: (name: string) => {
			deleteCalls.push(name);
		},
	}),
}));

const { loginAction, logoutAction } = await import("./auth-actions");
const { COOKIE_NAME, SESSION_MAX_AGE_S, verifySessionToken } = await import("./auth");

const ORIGINAL_SECRET = process.env.MAGPIE_ADMIN_SECRET;
const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
	setCalls = [];
	deleteCalls = [];
});

afterEach(() => {
	if (ORIGINAL_SECRET === undefined) delete process.env.MAGPIE_ADMIN_SECRET;
	else process.env.MAGPIE_ADMIN_SECRET = ORIGINAL_SECRET;
	vi.stubEnv("NODE_ENV", ORIGINAL_NODE_ENV ?? "test");
});

describe("loginAction", () => {
	it("fails closed with no cookie set when no admin secret is configured", async () => {
		delete process.env.MAGPIE_ADMIN_SECRET;
		const result = await loginAction("anything");
		expect(result).toEqual({
			ok: false,
			message: "Login is disabled: no admin secret is configured on the server.",
		});
		expect(setCalls).toHaveLength(0);
	});

	it("rejects the wrong password without setting a cookie", async () => {
		process.env.MAGPIE_ADMIN_SECRET = ADMIN_SECRET;
		const result = await loginAction("wrong-password");
		expect(result).toEqual({ ok: false, message: "Invalid password." });
		expect(setCalls).toHaveLength(0);
	});

	it("accepts the correct password, returns ok:true, and sets a verifiable session cookie", async () => {
		process.env.MAGPIE_ADMIN_SECRET = ADMIN_SECRET;
		const result = await loginAction(ADMIN_SECRET);
		expect(result).toEqual({ ok: true });
		expect(setCalls).toHaveLength(1);
		const call = setCalls[0];
		expect(call.name).toBe(COOKIE_NAME);
		expect(await verifySessionToken(call.value)).toBe(true);
	});

	it("sets the cookie with httpOnly, sameSite=lax, path=/, and the configured maxAge", async () => {
		process.env.MAGPIE_ADMIN_SECRET = ADMIN_SECRET;
		await loginAction(ADMIN_SECRET);
		expect(setCalls[0].options).toMatchObject({
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			maxAge: SESSION_MAX_AGE_S,
		});
	});

	it("marks the cookie secure in production", async () => {
		process.env.MAGPIE_ADMIN_SECRET = ADMIN_SECRET;
		vi.stubEnv("NODE_ENV", "production");
		await loginAction(ADMIN_SECRET);
		expect(setCalls[0].options.secure).toBe(true);
	});

	it("marks the cookie non-secure outside production", async () => {
		process.env.MAGPIE_ADMIN_SECRET = ADMIN_SECRET;
		vi.stubEnv("NODE_ENV", "development");
		await loginAction(ADMIN_SECRET);
		expect(setCalls[0].options.secure).toBe(false);
	});
});

describe("logoutAction", () => {
	it("deletes the session cookie by name", async () => {
		await logoutAction();
		expect(deleteCalls).toEqual([COOKIE_NAME]);
	});
});
