import { z } from "zod/v4";

// ── Primitives ─────────────────────────────────────────────────────────────

export const SourceSlug = z
	.string()
	.min(1)
	.max(64)
	.regex(/^[a-z0-9-]+$/, "lowercase letters, digits, hyphens only");

export const RunStatusSchema = z.enum(["queued", "running", "ok", "error"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const SourceOriginSchema = z.enum(["file", "api"]);
export type SourceOrigin = z.infer<typeof SourceOriginSchema>;

export const SelectorTypeSchema = z.enum(["css", "xpath"]);
export type SelectorType = z.infer<typeof SelectorTypeSchema>;

// ── Viewer shapes (dashboards) ─────────────────────────────────────────────

export const SourceSummarySchema = z.object({
	name: z.string(),
	description: z.string(),
	last_run_at: z.string().nullable(),
	last_status: RunStatusSchema.nullable(),
	item_count: z.number(),
	config_sha: z.string(),
});
export type SourceSummary = z.infer<typeof SourceSummarySchema>;

export const RunSchema = z.object({
	id: z.string(),
	source: z.string(),
	status: RunStatusSchema,
	started_at: z.string(),
	ended_at: z.string().nullable(),
	duration_ms: z.number().optional(),
	item_count: z.number().optional(),
	items_new: z.number(),
	items_updated: z.number(),
	items_removed: z.number(),
	error: z.string().nullable(),
	job_id: z.string().nullable().optional(),
});
export type Run = z.infer<typeof RunSchema>;

export const HealConfigSchema = z
	.object({
		field: z.string().optional(),
		selector: z.string().optional(),
		selector_type: SelectorTypeSchema.optional(),
		confidence: z.number().optional(),
		reasoning: z.string().optional(),
		sample_values: z.array(z.unknown()).optional(),
	})
	.passthrough();
export type HealConfig = z.infer<typeof HealConfigSchema>;

export const HealSchema = z.object({
	id: z.string(),
	source: z.string(),
	run_id: z.string().nullable(),
	old_config: HealConfigSchema,
	new_config: HealConfigSchema,
	pr_url: z.string().nullable(),
	created_at: z.string(),
});
export type Heal = z.infer<typeof HealSchema>;

export const HealthSchema = z.object({
	status: z.string(),
	version: z.string().optional(),
	service: z.string().optional(),
	db: z.string(),
});
export type Health = z.infer<typeof HealthSchema>;

// ── CRUD shapes ────────────────────────────────────────────────────────────

export const SourceCrudSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	origin: SourceOriginSchema,
	config_sha: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
});
export type SourceCrudSummary = z.infer<typeof SourceCrudSummarySchema>;

export const SourceDetailSchema = SourceCrudSummarySchema.extend({
	config_yaml: z.string(),
});
export type SourceDetail = z.infer<typeof SourceDetailSchema>;

// ── Jobs / async scrape ────────────────────────────────────────────────────

export const EnqueueResponseSchema = z.object({
	run_id: z.string(),
	job_id: z.string().nullable(),
	source: z.string(),
	status: z.literal("queued"),
});
export type EnqueueResponse = z.infer<typeof EnqueueResponseSchema>;

export const ScrapeItemSchema = z.object({
	stable_id: z.string(),
	url: z.string(),
	title: z.string(),
	content_text: z.string(),
	content_hash: z.string(),
	fetched_at: z.string(),
	html_snapshot_url: z.string().nullable().optional(),
});
export type ScrapeItem = z.infer<typeof ScrapeItemSchema>;

export const ScrapeResultSchema = z.object({
	source: z.string(),
	scraped_at: z.string(),
	run_id: z.string(),
	items: z.array(ScrapeItemSchema),
});
export type ScrapeResult = z.infer<typeof ScrapeResultSchema>;

// Persisted item from the `items` table, scoped to a run's time window by
// GET /api/runs/{id}/items. Similar to ScrapeItem but without the min_length
// guards — data in the DB may have been scraped before a config change that
// added a url/title field.
export const RunItemSchema = z.object({
	id: z.string(),
	stable_id: z.string(),
	url: z.string(),
	title: z.string(),
	content_text: z.string(),
	content_hash: z.string(),
	first_seen_at: z.string(),
	last_seen_at: z.string(),
	html_snapshot_url: z.string().nullable().optional(),
});
export type RunItem = z.infer<typeof RunItemSchema>;

export const ScrapeFailureSchema = z.object({
	source: z.string(),
	error: z.string(),
});
export type ScrapeFailure = z.infer<typeof ScrapeFailureSchema>;

export const ScrapeBatchResponseSchema = z.object({
	runs: z.array(ScrapeResultSchema),
	failed: z.array(ScrapeFailureSchema),
});
export type ScrapeBatchResponse = z.infer<typeof ScrapeBatchResponseSchema>;

// ── SourceConfig (the full YAML schema, mirrors backend config/schema.py) ──

export const FieldDefSchema = z.object({
	name: z.string().min(1),
	selector: z.string().min(1),
	selector_type: SelectorTypeSchema.default("css"),
	attr: z.string().nullable().optional(),
});
export type FieldDef = z.infer<typeof FieldDefSchema>;

export const ItemDefSchema = z.object({
	container: z.string().min(1),
	container_type: SelectorTypeSchema.default("css"),
	fields: z.array(FieldDefSchema).min(1),
	dedupe_key: z.string().min(1),
});
export type ItemDef = z.infer<typeof ItemDefSchema>;

export const PaginationDefSchema = z.object({
	next: z.string().nullable().optional(),
	next_type: SelectorTypeSchema.default("css"),
	max_pages: z.number().int().min(1).default(1),
});
export type PaginationDef = z.infer<typeof PaginationDefSchema>;

export const ActionDefSchema = z.object({
	type: z.enum(["click", "wait", "scroll", "type"]),
	selector: z.string().nullable().optional(),
	ms: z.number().int().nullable().optional(),
	text: z.string().nullable().optional(),
});
export type ActionDef = z.infer<typeof ActionDefSchema>;

export const HealthDefSchema = z.object({
	min_items: z.number().int().min(0).default(1),
	max_staleness: z.string().default("24h"),
});
export type HealthDef = z.infer<typeof HealthDefSchema>;

export const RateLimitDefSchema = z.object({
	rps: z.number().int().min(1).default(1),
});
export type RateLimitDef = z.infer<typeof RateLimitDefSchema>;

export const SourceConfigSchema = z.object({
	name: SourceSlug,
	description: z.string().default(""),
	url: z.string().url(),
	render: z.boolean().default(false),
	schedule: z.string().min(1),
	rate_limit: RateLimitDefSchema.default({ rps: 1 }),
	item: ItemDefSchema,
	pagination: PaginationDefSchema.default({ max_pages: 1, next_type: "css" }),
	wait_for: z.string().nullable().optional(),
	actions: z.array(ActionDefSchema).default([]),
	health: HealthDefSchema.default({ min_items: 1, max_staleness: "24h" }),
});
export type SourceConfig = z.infer<typeof SourceConfigSchema>;
