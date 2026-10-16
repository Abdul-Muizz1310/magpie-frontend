import { http, HttpResponse } from "msw";
import {
	API_URL,
	makeEnqueueResponse,
	makeHeal,
	makeHealth,
	makeRun,
	makeScrapeResult,
	makeSourceCrudSummary,
	makeSourceDetail,
	makeSourceSummary,
} from "./fixtures";

// Handler factories — pass `...happyHandlers()` to `server.use()` when a test
// needs the full happy-path surface (e.g. a component that renders a view
// making several unrelated requests). Individual tests typically only need one
// or two of these, which they can cherry-pick or override.
//
// `base` is where the code under test calls: the backend (`API_URL`) for server-side code, the
// same-origin proxy (`PROXY_PATH`) for browser-side code (spec 07).
export const happyHandlers = (base: string = API_URL) => [
	http.get(`${base}/sources`, () => HttpResponse.json([makeSourceSummary()])),
	http.get(`${base}/sources/:name`, ({ params }) =>
		HttpResponse.json(makeSourceSummary({ name: String(params.name) })),
	),
	http.get(`${base}/runs`, () => HttpResponse.json([makeRun()])),
	http.get(`${base}/heals`, () => HttpResponse.json([makeHeal()])),
	http.get(`${base}/health`, () => HttpResponse.json(makeHealth())),
	http.post(`${base}/api/scrape/:source/once`, ({ params }) =>
		HttpResponse.json(makeScrapeResult({ source: String(params.source) })),
	),
	http.post(`${base}/api/scrape/:source/enqueue`, ({ params }) =>
		HttpResponse.json(
			makeEnqueueResponse({ source: String(params.source) }),
			{ status: 202 },
		),
	),
	http.post(`${base}/api/scrape/batch`, () =>
		HttpResponse.json({ runs: [makeScrapeResult()], failed: [] }),
	),
	http.get(`${base}/api/runs/:id`, ({ params }) =>
		HttpResponse.json(makeRun({ id: String(params.id) })),
	),
	http.get(`${base}/api/sources`, () => HttpResponse.json([makeSourceCrudSummary()])),
	http.get(`${base}/api/sources/:name`, ({ params }) =>
		HttpResponse.json(makeSourceDetail({ name: String(params.name) })),
	),
	http.post(`${base}/api/sources`, () =>
		HttpResponse.json(makeSourceDetail(), { status: 201 }),
	),
	http.patch(`${base}/api/sources/:name`, ({ params }) =>
		HttpResponse.json(makeSourceDetail({ name: String(params.name) })),
	),
	http.delete(`${base}/api/sources/:name`, () => new HttpResponse(null, { status: 204 })),
];
