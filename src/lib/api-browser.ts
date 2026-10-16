import { createApi, type Transport } from "./api";

// The backend client for browser code (spec 07). It calls the same-origin proxy route
// `/api/backend/...`, which signs and forwards each request; the browser holds no token, no key
// and not even the backend's URL. This module must stay free of server-only imports.

export const BACKEND_PROXY_PREFIX = "/api/backend";

/** The proxy URL for a backend path such as `/health` or `/api/runs/1?limit=5`. */
export function proxyUrl(path: string): string {
	return `${BACKEND_PROXY_PREFIX}${path}`;
}

const proxyTransport: Transport = (path, init) => fetch(proxyUrl(path), init);

export const browserApi = createApi(proxyTransport);
