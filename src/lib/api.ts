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

// The one typed client for magpie-backend (spec 00). It does not know where the backend is: every
// endpoint is bound to a `Transport` by `createApi` (spec 07). `api-server.ts` binds it to a
// direct, signed transport; `api-browser.ts` to the same-origin proxy. This module imports
// neither, so client bundles that use it never reach the signing code.

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
	// The proxy's own errors (spec 07) and the backend's token rejection.
	if (typeof b.error === "string") return { message: b.error };
	return { message: "Request failed" };
}

// ── Transport ──────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

/** What the client hands a transport: the request minus where it goes. */
export type TransportInit = {
	method: HttpMethod;
	headers: Record<string, string>;
	body?: string;
	signal: AbortSignal;
};

/** Sends a backend request for `path` (starting with `/`, query included). */
export type Transport = (path: string, init: TransportInit) => Promise<Response>;

// ── Core request helpers ───────────────────────────────────────────────────

type RequestInit = {
	method?: HttpMethod;
	body?: unknown;
	signal?: AbortSignal;
};

export const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Build the signal for an outbound request. The timeout ALWAYS applies, even
 * when a caller passes its own signal (e.g. the poll loop's AbortController):
 * we combine both with `AbortSignal.any` so a hung fetch still rejects after the
 * timeout and the caller's catch/backoff path can recover. Previously a
 * caller-supplied signal replaced the timeout entirely (REL-1), so a stalled
 * connection left the awaited promise unsettled and the view stuck forever.
 */
export function buildRequestSignal(
	callerSignal: AbortSignal | undefined,
	timeoutMs: number = REQUEST_TIMEOUT_MS,
): AbortSignal {
	const timeout = AbortSignal.timeout(timeoutMs);
	return callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;
}

async function rawRequest(
	transport: Transport,
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const { method = "GET", body, signal } = init;
	const headers: Record<string, string> = {};
	if (body !== undefined) headers["Content-Type"] = "application/json";
	return transport(path, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: buildRequestSignal(signal),
	});
}

async function failure(res: Response): Promise<ApiError> {
	let message = res.statusText;
	let issues: PydanticIssue[] | undefined;
	try {
		const parsed = parseErrorBody(await res.json());
		message = parsed.message;
		issues = parsed.issues;
	} catch {
		// keep statusText
	}
	return new ApiError(res.status, message, issues);
}

async function requestJson<T>(
	transport: Transport,
	path: string,
	schema: z.ZodType<T>,
	init: RequestInit = {},
): Promise<T> {
	const res = await rawRequest(transport, path, init);
	if (!res.ok) throw await failure(res);
	const data = await res.json();
	return schema.parse(data);
}

async function requestVoid(
	transport: Transport,
	path: string,
	init: RequestInit = {},
): Promise<void> {
	const res = await rawRequest(transport, path, init);
	if (!res.ok) throw await failure(res);
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

export type SourceSubmission = { yaml?: string; config?: Record<string, unknown> };

/** Every backend endpoint, bound to one transport. */
export function createApi(transport: Transport) {
	const json = <T>(path: string, schema: z.ZodType<T>, init?: RequestInit) =>
		requestJson(transport, path, schema, init);

	return {
		// ── Viewer (dashboard) ─────────────────────────────────────────────────────

		async fetchSources(): Promise<SourceSummary[]> {
			return json("/sources", z.array(SourceSummarySchema));
		},

		async fetchSource(name: string): Promise<SourceSummary> {
			return json(`/sources/${encodeURIComponent(name)}`, SourceSummarySchema);
		},

		async fetchRuns(params?: { source?: string; limit?: number; offset?: number }): Promise<Run[]> {
			return json(`/runs${buildQuery(params)}`, z.array(RunSchema));
		},

		async fetchHeals(params?: {
			source?: string;
			limit?: number;
			offset?: number;
		}): Promise<Heal[]> {
			return json(`/heals${buildQuery(params)}`, z.array(HealSchema));
		},

		async fetchHealth(): Promise<Health> {
			return json("/health", HealthSchema);
		},

		// ── Async scrape / job queue ───────────────────────────────────────────────

		async scrapeOnce(source: string, maxItems = 10, signal?: AbortSignal): Promise<ScrapeResult> {
			return json(`/api/scrape/${encodeURIComponent(source)}/once`, ScrapeResultSchema, {
				method: "POST",
				body: { max_items: maxItems },
				signal,
			});
		},

		async scrapeBatch(sources: string[], maxItemsPerSource = 10): Promise<ScrapeBatchResponse> {
			return json("/api/scrape/batch", ScrapeBatchResponseSchema, {
				method: "POST",
				body: { sources, max_items_per_source: maxItemsPerSource },
			});
		},

		async enqueueScrape(source: string, maxItems = 10): Promise<EnqueueResponse> {
			return json(`/api/scrape/${encodeURIComponent(source)}/enqueue`, EnqueueResponseSchema, {
				method: "POST",
				body: { max_items: maxItems },
			});
		},

		async fetchRun(runId: string, signal?: AbortSignal): Promise<Run> {
			return json(`/api/runs/${encodeURIComponent(runId)}`, RunSchema, { signal });
		},

		async fetchRunItems(
			runId: string,
			params?: { limit?: number; offset?: number },
		): Promise<RunItem[]> {
			return json(
				`/api/runs/${encodeURIComponent(runId)}/items${buildQuery(params)}`,
				z.array(RunItemSchema),
			);
		},

		async fetchSourceItems(
			name: string,
			params?: { limit?: number; offset?: number },
		): Promise<RunItem[]> {
			return json(
				`/sources/${encodeURIComponent(name)}/items${buildQuery(params)}`,
				z.array(RunItemSchema),
			);
		},

		// ── Custom source CRUD (/api/sources) ──────────────────────────────────────

		async listSourcesCrud(origin?: "file" | "api"): Promise<SourceCrudSummary[]> {
			const qs = origin ? `?origin=${origin}` : "";
			return json(`/api/sources${qs}`, z.array(SourceCrudSummarySchema));
		},

		async getSourceDetail(name: string): Promise<SourceDetail> {
			return json(`/api/sources/${encodeURIComponent(name)}`, SourceDetailSchema);
		},

		async createSource(body: SourceSubmission): Promise<SourceDetail> {
			return json("/api/sources", SourceDetailSchema, { method: "POST", body });
		},

		async updateSource(name: string, body: SourceSubmission): Promise<SourceDetail> {
			return json(`/api/sources/${encodeURIComponent(name)}`, SourceDetailSchema, {
				method: "PATCH",
				body,
			});
		},

		async deleteSource(name: string): Promise<void> {
			await requestVoid(transport, `/api/sources/${encodeURIComponent(name)}`, {
				method: "DELETE",
			});
		},
	};
}

export type BackendApi = ReturnType<typeof createApi>;

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
