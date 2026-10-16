import "server-only";

import { createApi, type Transport } from "./api";
import { getBaseUrl } from "./env";
import { mintPlatformToken, PLATFORM_TOKEN_HEADER } from "./platform-token";

// The backend client for server code: RSC pages, `data.ts`, Server Actions (spec 07). It calls
// the backend directly, never through the app's own proxy route, with a token minted for this
// one request. The URL and the token are both resolved before the fetch, so a bad backend URL or
// a missing or malformed key rejects with `ConfigError` and nothing is sent: there is no
// unsigned path.

const signedTransport: Transport = async (path, init) => {
	const url = `${getBaseUrl()}${path}`;
	const token = mintPlatformToken();
	return fetch(url, {
		...init,
		headers: { ...init.headers, [PLATFORM_TOKEN_HEADER]: token },
		cache: "no-store",
	});
};

export const serverApi = createApi(signedTransport);
