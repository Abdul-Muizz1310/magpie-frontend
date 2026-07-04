"use server";

import { cookies } from "next/headers";
import {
	COOKIE_NAME,
	getAdminSecret,
	mintSessionToken,
	SESSION_MAX_AGE_S,
	verifyAdminPassword,
} from "./auth";
import { isAuthenticated } from "./session";

export type LoginResult = { ok: true } | { ok: false; message: string };

/** Client-callable read of the current session state (for nav auth affordance). */
export async function getAuthState(): Promise<boolean> {
	return isAuthenticated();
}

/**
 * Exchange the admin password for a session cookie. Fails closed when no admin
 * secret is configured. On success sets an httpOnly, secure, sameSite=lax
 * cookie holding a stateless HMAC session token.
 */
export async function loginAction(password: string): Promise<LoginResult> {
	const secret = getAdminSecret();
	if (!secret) {
		return {
			ok: false,
			message: "Login is disabled: no admin secret is configured on the server.",
		};
	}
	if (!(await verifyAdminPassword(password))) {
		return { ok: false, message: "Invalid password." };
	}
	const token = await mintSessionToken(secret);
	const store = await cookies();
	store.set(COOKIE_NAME, token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: SESSION_MAX_AGE_S,
	});
	return { ok: true };
}

/** Clear the admin session cookie. */
export async function logoutAction(): Promise<void> {
	const store = await cookies();
	store.delete(COOKIE_NAME);
}
