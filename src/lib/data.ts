import { connection } from "next/server";
import { serverApi } from "./api-server";
import type {
	Heal,
	Health,
	Run,
	RunItem,
	SourceCrudSummary,
	SourceDetail,
	SourceSummary,
} from "./schemas";

// All backend-facing reads are request-time dynamic. `connection()` tells
// Cache Components the data must be fetched per request (no build-time
// prerender). Mutations in `actions.ts` call `revalidatePath` on the affected
// routes so subsequent requests re-render with fresh data. Every call goes through `serverApi`:
// straight to the backend with a fresh platform token (spec 07).

export async function getSources(): Promise<SourceSummary[]> {
	await connection();
	return serverApi.fetchSources();
}

export async function getSource(name: string): Promise<SourceSummary> {
	await connection();
	return serverApi.fetchSource(name);
}

export async function getSourceConfig(name: string): Promise<SourceDetail> {
	await connection();
	return serverApi.getSourceDetail(name);
}

export async function listCrudSources(origin?: "file" | "api"): Promise<SourceCrudSummary[]> {
	await connection();
	return serverApi.listSourcesCrud(origin);
}

export async function getRuns(params: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Run[]> {
	await connection();
	return serverApi.fetchRuns(params);
}

export async function getHeals(params: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Heal[]> {
	await connection();
	return serverApi.fetchHeals(params);
}

export async function getHealth(): Promise<Health> {
	await connection();
	return serverApi.fetchHealth();
}

export async function getSourceItems(
	name: string,
	params: { limit?: number; offset?: number } = {},
): Promise<RunItem[]> {
	await connection();
	return serverApi.fetchSourceItems(name, params);
}
