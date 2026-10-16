import { proxyToBackend } from "@/lib/backend-proxy";

// The browser's same-origin route to magpie-backend (spec 07). Each request is signed with a
// fresh platform token and forwarded; the logic lives in `lib/backend-proxy.ts`.
//
// No `dynamic` or `runtime` export: Cache Components rejects both. Node, which the signer's
// `node:crypto` needs, is already its only runtime. The handler reads the request and the
// segment is dynamic, so Next never prerenders it; non-GET methods are never cached; and the
// upstream fetch is `no-store`.

// Long reads (event streams) may run for minutes.
export const maxDuration = 300;

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: Request, { params }: Context): Promise<Response> {
	const { path } = await params;
	return proxyToBackend(request, path);
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
