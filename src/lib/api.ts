import { z } from "zod/v4";
import type {
	EnqueueResponse,
	Heal,
	Health,
	Run,
	RunItem,
	ScrapeBatchResponse,
	ScrapeResult,
	SourceCrudSummary,
	SourceDetail,
	SourceSummary,
} from "./schemas";
import {
	EnqueueResponseSchema,
	HealSchema,
	HealthSchema,
	RunItemSchema,
	RunSchema,
	ScrapeBatchResponseSchema,
	ScrapeResultSchema,
	SourceCrudSummarySchema,
	SourceDetailSchema,
	SourceSummarySchema,
} from "./schemas";

export function getBaseUrl(): string {
	return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

// ── Error shape ────────────────────────────────────────────────────────────

export type PydanticIssue = { loc: ReadonlyArray<string | number>; msg: string; type: string };

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public issues?: ReadonlyArray<PydanticIssue>,
	) {
		super(message);
		this.name = "ApiError";
	}
}

function parseErrorBody(body: unknown): { message: string; issues?: PydanticIssue[] } {
	if (typeof body !== "object" || body === null) {
		return { message: "Request failed" };
	}
	const b = body as Record<string, unknown>;
	const detail = b.detail;
	if (Array.isArray(detail)) {
		const issues = detail
			.filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
			.map((d) => ({
				loc: Array.isArray(d.loc) ? (d.loc as (string | number)[]) : [],
				msg: typeof d.msg === "string" ? d.msg : "invalid",
				type: typeof d.type === "string" ? d.type : "unknown",
			}));
		return {
			message: issues.map((i) => `${i.loc.join(".")}: ${i.msg}`).join("; ") || "Validation failed",
			issues,
		};
	}
	if (typeof detail === "string") return { message: detail };
	if (typeof b.message === "string") return { message: b.message };
	return { message: "Request failed" };
}

// ── Core request helpers ───────────────────────────────────────────────────

type RequestInit = {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: unknown;
	signal?: AbortSignal;
};

async function rawRequest(path: string, init: RequestInit = {}): Promise<Response> {
	const { method = "GET", body, signal } = init;
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	return fetch(`${getBaseUrl()}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: signal ?? AbortSignal.timeout(45_000),
	});
}

async function requestJson<T>(
	path: string,
	schema: z.ZodType<T>,
	init: RequestInit = {},
): Promise<T> {
	const res = await rawRequest(path, init);
	if (!res.ok) {
		let message = res.statusText;
		let issues: PydanticIssue[] | undefined;
		try {
			const body = await res.json();
			const parsed = parseErrorBody(body);
			message = parsed.message;
			issues = parsed.issues;
		} catch {
			// keep statusText
		}
		throw new ApiError(res.status, message, issues);
	}
	const data = await res.json();
	return schema.parse(data);
}

async function requestVoid(path: string, init: RequestInit = {}): Promise<void> {
	const res = await rawRequest(path, init);
	if (!res.ok) {
		let message = res.statusText;
		let issues: PydanticIssue[] | undefined;
		try {
			const body = await res.json();
			const parsed = parseErrorBody(body);
			message = parsed.message;
			issues = parsed.issues;
		} catch {
			/* noop */
		}
		throw new ApiError(res.status, message, issues);
	}
}

function buildQuery(params?: Record<string, string | number | undefined>): string {
	if (!params) return "";
	const entries = Object.entries(params).filter(
		(entry): entry is [string, string | number] => entry[1] !== undefined,
	);
	if (entries.length === 0) return "";
	const qs = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
	return `?${qs.toString()}`;
}

// ── Viewer (dashboard) ─────────────────────────────────────────────────────

export async function fetchSources(): Promise<SourceSummary[]> {
	return requestJson("/sources", z.array(SourceSummarySchema));
}

export async function fetchSource(name: string): Promise<SourceSummary> {
	return requestJson(`/sources/${encodeURIComponent(name)}`, SourceSummarySchema);
}

export async function fetchRuns(params?: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Run[]> {
	return requestJson(`/runs${buildQuery(params)}`, z.array(RunSchema));
}

export async function fetchHeals(params?: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Heal[]> {
	return requestJson(`/heals${buildQuery(params)}`, z.array(HealSchema));
}

export async function fetchHealth(): Promise<Health> {
	return requestJson("/health", HealthSchema);
}

// ── Async scrape / job queue ───────────────────────────────────────────────

export async function scrapeOnce(
	source: string,
	maxItems = 10,
	signal?: AbortSignal,
): Promise<ScrapeResult> {
	return requestJson(`/api/scrape/${encodeURIComponent(source)}/once`, ScrapeResultSchema, {
		method: "POST",
		body: { max_items: maxItems },
		signal,
	});
}

export async function scrapeBatch(
	sources: string[],
	maxItemsPerSource = 10,
): Promise<ScrapeBatchResponse> {
	return requestJson("/api/scrape/batch", ScrapeBatchResponseSchema, {
		method: "POST",
		body: { sources, max_items_per_source: maxItemsPerSource },
	});
}

export async function enqueueScrape(source: string, maxItems = 10): Promise<EnqueueResponse> {
	return requestJson(`/api/scrape/${encodeURIComponent(source)}/enqueue`, EnqueueResponseSchema, {
		method: "POST",
		body: { max_items: maxItems },
	});
}

export async function fetchRun(runId: string, signal?: AbortSignal): Promise<Run> {
	return requestJson(`/api/runs/${encodeURIComponent(runId)}`, RunSchema, { signal });
}

export async function fetchRunItems(
	runId: string,
	params?: { limit?: number; offset?: number },
): Promise<RunItem[]> {
	return requestJson(
		`/api/runs/${encodeURIComponent(runId)}/items${buildQuery(params)}`,
		z.array(RunItemSchema),
	);
}

export async function fetchSourceItems(
	name: string,
	params?: { limit?: number; offset?: number },
): Promise<RunItem[]> {
	return requestJson(
		`/sources/${encodeURIComponent(name)}/items${buildQuery(params)}`,
		z.array(RunItemSchema),
	);
}

// ── Custom source CRUD (/api/sources) ──────────────────────────────────────

export async function listSourcesCrud(origin?: "file" | "api"): Promise<SourceCrudSummary[]> {
	const qs = origin ? `?origin=${origin}` : "";
	return requestJson(`/api/sources${qs}`, z.array(SourceCrudSummarySchema));
}

export async function getSourceDetail(name: string): Promise<SourceDetail> {
	return requestJson(`/api/sources/${encodeURIComponent(name)}`, SourceDetailSchema);
}

export type SourceSubmission = { yaml?: string; config?: Record<string, unknown> };

export async function createSource(body: SourceSubmission): Promise<SourceDetail> {
	return requestJson("/api/sources", SourceDetailSchema, { method: "POST", body });
}

export async function updateSource(name: string, body: SourceSubmission): Promise<SourceDetail> {
	return requestJson(`/api/sources/${encodeURIComponent(name)}`, SourceDetailSchema, {
		method: "PATCH",
		body,
	});
}

export async function deleteSource(name: string): Promise<void> {
	await requestVoid(`/api/sources/${encodeURIComponent(name)}`, { method: "DELETE" });
}

// Re-export types for callers
export type {
	EnqueueResponse,
	Heal,
	Health,
	Run,
	RunItem,
	ScrapeBatchResponse,
	ScrapeFailure,
	ScrapeItem,
	ScrapeResult,
	SourceCrudSummary,
	SourceDetail,
	SourceSummary,
} from "./schemas";
