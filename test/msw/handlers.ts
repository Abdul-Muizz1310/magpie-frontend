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
export const happyHandlers = () => [
	http.get(`${API_URL}/sources`, () => HttpResponse.json([makeSourceSummary()])),
	http.get(`${API_URL}/sources/:name`, ({ params }) =>
		HttpResponse.json(makeSourceSummary({ name: String(params.name) })),
	),
	http.get(`${API_URL}/runs`, () => HttpResponse.json([makeRun()])),
	http.get(`${API_URL}/heals`, () => HttpResponse.json([makeHeal()])),
	http.get(`${API_URL}/health`, () => HttpResponse.json(makeHealth())),
	http.post(`${API_URL}/api/scrape/:source/once`, ({ params }) =>
		HttpResponse.json(makeScrapeResult({ source: String(params.source) })),
	),
	http.post(`${API_URL}/api/scrape/:source/enqueue`, ({ params }) =>
		HttpResponse.json(
			makeEnqueueResponse({ source: String(params.source) }),
			{ status: 202 },
		),
	),
	http.post(`${API_URL}/api/scrape/batch`, () =>
		HttpResponse.json({ runs: [makeScrapeResult()], failed: [] }),
	),
	http.get(`${API_URL}/api/runs/:id`, ({ params }) =>
		HttpResponse.json(makeRun({ id: String(params.id) })),
	),
	http.get(`${API_URL}/api/sources`, () => HttpResponse.json([makeSourceCrudSummary()])),
	http.get(`${API_URL}/api/sources/:name`, ({ params }) =>
		HttpResponse.json(makeSourceDetail({ name: String(params.name) })),
	),
	http.post(`${API_URL}/api/sources`, () =>
		HttpResponse.json(makeSourceDetail(), { status: 201 }),
	),
	http.patch(`${API_URL}/api/sources/:name`, ({ params }) =>
		HttpResponse.json(makeSourceDetail({ name: String(params.name) })),
	),
	http.delete(`${API_URL}/api/sources/:name`, () => new HttpResponse(null, { status: 204 })),
];
