// @vitest-environment node
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import {
	API_URL,
	makeHeal,
	makeHealth,
	makeRun,
	makeSourceCrudSummary,
	makeSourceDetail,
	makeSourceSummary,
} from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";

// Stub the Cache Components runtime primitive before importing data.ts.
vi.mock("next/server", () => ({
	connection: vi.fn(async () => undefined),
}));

const { getHealth, getHeals, getRuns, getSource, getSourceConfig, getSources, listCrudSources } =
	await import("./data");
const { connection } = await import("next/server");
const connectionMock = vi.mocked(connection);

function registerHappyHandlers() {
	server.use(
		http.get(`${API_URL}/sources`, () => HttpResponse.json([makeSourceSummary()])),
		http.get(`${API_URL}/sources/:name`, () => HttpResponse.json(makeSourceSummary())),
		http.get(`${API_URL}/runs`, () => HttpResponse.json([makeRun()])),
		http.get(`${API_URL}/heals`, () => HttpResponse.json([makeHeal()])),
		http.get(`${API_URL}/health`, () => HttpResponse.json(makeHealth())),
		http.get(`${API_URL}/api/sources`, () => HttpResponse.json([makeSourceCrudSummary()])),
		http.get(`${API_URL}/api/sources/:name`, () => HttpResponse.json(makeSourceDetail())),
	);
}

describe("data accessors force runtime via connection()", () => {
	it.each([
		["getSources", () => getSources()],
		["getSource", () => getSource("hackernews")],
		["getSourceConfig", () => getSourceConfig("custom-one")],
		["listCrudSources", () => listCrudSources()],
		["getRuns", () => getRuns({})],
		["getHeals", () => getHeals({})],
		["getHealth", () => getHealth()],
	] as const)("calls connection() before fetching — %s", async (_name, fn) => {
		registerHappyHandlers();
		connectionMock.mockClear();
		await fn();
		expect(connectionMock).toHaveBeenCalled();
	});
});

describe("data accessors return parsed payloads", () => {
	it("getSources hydrates SourceSummary shape from shared handler", async () => {
		registerHappyHandlers();
		const sources = await getSources();
		expect(sources[0].name).toBe("hackernews");
		expect(sources[0].last_status).toBe("ok");
	});

	it("getHeals hydrates Heal shape with structured configs", async () => {
		registerHappyHandlers();
		const heals = await getHeals({});
		expect(heals[0].new_config.confidence).toBe(0.92);
	});
});
