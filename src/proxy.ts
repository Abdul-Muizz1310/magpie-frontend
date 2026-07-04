import { type NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Next.js 16 proxy (formerly `middleware`). Defense-in-depth + UX: redirect
// unauthenticated visitors away from the admin-only editor pages toward /login.
//
// This is NOT the security boundary — every state-changing Server Action
// re-checks authorization server-side via `requireAdmin` (see lib/session.ts),
// so a forged cookie that slips past a page render still cannot mutate. This
// proxy just avoids showing an editor a stranger can't actually submit.

const PROTECTED_PREFIXES = [/^\/sources\/new$/, /^\/sources\/[^/]+\/edit$/];

function isProtected(pathname: string): boolean {
	return PROTECTED_PREFIXES.some((re) => re.test(pathname));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
	const { pathname } = request.nextUrl;
	if (!isProtected(pathname)) return NextResponse.next();

	const token = request.cookies.get(COOKIE_NAME)?.value;
	if (await verifySessionToken(token)) return NextResponse.next();

	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("next", pathname);
	return NextResponse.redirect(loginUrl);
}

export const config = {
	matcher: ["/sources/new", "/sources/:name/edit"],
};
