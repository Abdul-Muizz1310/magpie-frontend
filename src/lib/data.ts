import { connection } from "next/server";
import {
	fetchHeals as apiFetchHeals,
	fetchHealth as apiFetchHealth,
	fetchRuns as apiFetchRuns,
	fetchSource as apiFetchSource,
	fetchSources as apiFetchSources,
	getSourceDetail as apiGetSourceDetail,
	listSourcesCrud as apiListSourcesCrud,
} from "./api";
import type { Heal, Health, Run, SourceCrudSummary, SourceDetail, SourceSummary } from "./schemas";

// All backend-facing reads are request-time dynamic. `connection()` tells
// Cache Components the data must be fetched per request (no build-time
// prerender). Mutations in `actions.ts` call `revalidatePath` on the affected
// routes so subsequent requests re-render with fresh data.

export async function getSources(): Promise<SourceSummary[]> {
	await connection();
	return apiFetchSources();
}

export async function getSource(name: string): Promise<SourceSummary> {
	await connection();
	return apiFetchSource(name);
}

export async function getSourceConfig(name: string): Promise<SourceDetail> {
	await connection();
	return apiGetSourceDetail(name);
}

export async function listCrudSources(origin?: "file" | "api"): Promise<SourceCrudSummary[]> {
	await connection();
	return apiListSourcesCrud(origin);
}

export async function getRuns(params: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Run[]> {
	await connection();
	return apiFetchRuns(params);
}

export async function getHeals(params: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Heal[]> {
	await connection();
	return apiFetchHeals(params);
}

export async function getHealth(): Promise<Health> {
	await connection();
	return apiFetchHealth();
}
