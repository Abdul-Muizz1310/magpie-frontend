import type {
	EnqueueResponse,
	Heal,
	Health,
	Run,
	RunItem,
	ScrapeItem,
	ScrapeResult,
	SourceCrudSummary,
	SourceDetail,
	SourceSummary,
} from "@/lib/schemas";

export const API_URL = "http://localhost:9999";

export const UUID_A = "11111111-1111-4111-8111-111111111111";
export const UUID_B = "22222222-2222-4222-8222-222222222222";
export const UUID_C = "33333333-3333-4333-8333-333333333333";

export function makeSourceSummary(overrides: Partial<SourceSummary> = {}): SourceSummary {
	return {
		name: "hackernews",
		description: "Scrape Hacker News front page",
		last_run_at: "2026-04-10T12:00:00Z",
		last_status: "ok",
		item_count: 30,
		config_sha: "abc123def",
		...overrides,
	};
}

export function makeRun(overrides: Partial<Run> = {}): Run {
	return {
		id: UUID_A,
		source: "hackernews",
		status: "ok",
		started_at: "2026-04-10T12:00:00Z",
		ended_at: "2026-04-10T12:01:00Z",
		duration_ms: 60_000,
		item_count: 30,
		items_new: 5,
		items_updated: 2,
		items_removed: 1,
		error: null,
		job_id: "job-abc",
		...overrides,
	};
}

export function makeHeal(overrides: Partial<Heal> = {}): Heal {
	return {
		id: UUID_B,
		source: "hackernews",
		run_id: UUID_A,
		old_config: { field: "title", selector: "span.old" },
		new_config: { field: "title", selector: "span.new", confidence: 0.92 },
		pr_url: "https://github.com/Abdul-Muizz1310/magpie-backend/pull/1",
		created_at: "2026-04-10T13:00:00Z",
		...overrides,
	};
}

export function makeHealth(overrides: Partial<Health> = {}): Health {
	return { status: "ok", version: "abc123", service: "magpie", db: "ok", ...overrides };
}

export function makeSourceCrudSummary(
	overrides: Partial<SourceCrudSummary> = {},
): SourceCrudSummary {
	return {
		id: UUID_C,
		name: "custom-one",
		description: "Runtime-created scraper",
		origin: "api",
		config_sha: "sha1",
		created_at: "2026-04-10T00:00:00Z",
		updated_at: "2026-04-10T00:00:00Z",
		...overrides,
	};
}

export function makeSourceDetail(overrides: Partial<SourceDetail> = {}): SourceDetail {
	return {
		...makeSourceCrudSummary(),
		config_yaml: "name: custom-one\nurl: https://example.com\n",
		...overrides,
	};
}

export function makeEnqueueResponse(overrides: Partial<EnqueueResponse> = {}): EnqueueResponse {
	return {
		run_id: UUID_A,
		job_id: "job-abc",
		source: "hackernews",
		status: "queued",
		...overrides,
	};
}

export function makeScrapeItem(overrides: Partial<ScrapeItem> = {}): ScrapeItem {
	return {
		stable_id: "item-1",
		url: "https://example.com/a",
		title: "Example post",
		content_text: "Example body text",
		content_hash: "deadbeefcafebabe",
		fetched_at: "2026-04-10T12:00:00Z",
		html_snapshot_url: null,
		...overrides,
	};
}

export function makeScrapeResult(overrides: Partial<ScrapeResult> = {}): ScrapeResult {
	return {
		source: "hackernews",
		scraped_at: "2026-04-10T12:00:00Z",
		run_id: UUID_A,
		items: [makeScrapeItem()],
		...overrides,
	};
}

export function makeRunItem(overrides: Partial<RunItem> = {}): RunItem {
	return {
		id: UUID_B,
		stable_id: "item-1",
		url: "https://example.com/a",
		title: "Example post",
		content_text: "Example body text",
		content_hash: "deadbeefcafebabe",
		first_seen_at: "2026-04-10T11:59:00Z",
		last_seen_at: "2026-04-10T12:00:00Z",
		html_snapshot_url: null,
		...overrides,
	};
}
