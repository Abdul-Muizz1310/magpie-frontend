import { z } from "zod/v4";

function getBaseUrl(): string {
	return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

// ── Schemas ────────────────────────────────────────────────────────────────

const SourceSchema = z.object({
	name: z.string(),
	description: z.string(),
	last_run_at: z.string().nullable(),
	last_status: z.string().nullable(),
	item_count: z.number(),
	config_sha: z.string(),
});

const RunSchema = z.object({
	id: z.number(),
	source: z.string(),
	started_at: z.string(),
	ended_at: z.string().nullable(),
	items_new: z.number(),
	items_updated: z.number(),
	items_removed: z.number(),
	status: z.string(),
	error: z.string().nullable(),
});

const HealSchema = z.object({
	id: z.number(),
	source: z.string(),
	run_id: z.number().nullable(),
	old_config: z.record(z.string(), z.unknown()),
	new_config: z.record(z.string(), z.unknown()),
	pr_url: z.string().nullable(),
	created_at: z.string(),
});

const HealthSchema = z.object({
	status: z.string(),
	version: z.string(),
	db: z.string(),
});

// ── Types ──────────────────────────────────────────────────────────────────

export type Source = z.infer<typeof SourceSchema>;
export type Run = z.infer<typeof RunSchema>;
export type Heal = z.infer<typeof HealSchema>;
export type Health = z.infer<typeof HealthSchema>;

// ── Error ──────────────────────────────────────────────────────────────────

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function request<T>(path: string, schema: z.ZodType<T>): Promise<T> {
	const res = await fetch(`${getBaseUrl()}${path}`);
	if (!res.ok) {
		let message = res.statusText;
		try {
			const body = await res.json();
			message = body.detail ?? body.message ?? message;
		} catch {
			// ignore parse failure on error responses
		}
		throw new ApiError(res.status, message);
	}
	const data = await res.json();
	return schema.parse(data);
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

// ── Public API ─────────────────────────────────────────────────────────────

export async function fetchSources(): Promise<Source[]> {
	return request("/sources", z.array(SourceSchema));
}

export async function fetchSource(name: string): Promise<Source> {
	return request(`/sources/${name}`, SourceSchema);
}

export async function fetchRuns(params?: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Run[]> {
	const qs = buildQuery(params);
	return request(`/runs${qs}`, z.array(RunSchema));
}

export async function fetchHeals(params?: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Heal[]> {
	const qs = buildQuery(params);
	return request(`/heals${qs}`, z.array(HealSchema));
}

export async function fetchHealth(): Promise<Health> {
	return request("/health", HealthSchema);
}
