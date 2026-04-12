// Stub types — implementation in S4

export type Source = {
	name: string;
	description: string;
	last_run_at: string | null;
	last_status: string | null;
	item_count: number;
	config_sha: string;
};

export type Run = {
	id: number;
	source: string;
	started_at: string;
	ended_at: string | null;
	items_new: number;
	items_updated: number;
	items_removed: number;
	status: string;
	error: string | null;
};

export type Heal = {
	id: number;
	source: string;
	run_id: number | null;
	old_config: Record<string, unknown>;
	new_config: Record<string, unknown>;
	pr_url: string | null;
	created_at: string;
};

export type Health = {
	status: string;
	version: string;
	db: string;
};

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

// Stub functions — implementation in S4
export async function fetchSources(): Promise<Source[]> {
	throw new Error("Not implemented");
}

export async function fetchSource(_name: string): Promise<Source> {
	throw new Error("Not implemented");
}

export async function fetchRuns(_params?: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Run[]> {
	throw new Error("Not implemented");
}

export async function fetchHeals(_params?: {
	source?: string;
	limit?: number;
	offset?: number;
}): Promise<Heal[]> {
	throw new Error("Not implemented");
}

export async function fetchHealth(): Promise<Health> {
	throw new Error("Not implemented");
}
