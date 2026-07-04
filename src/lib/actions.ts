"use server";

import { revalidatePath } from "next/cache";
import type { EnqueueResponse, PydanticIssue } from "./api";
import {
	ApiError,
	createSource as apiCreateSource,
	deleteSource as apiDeleteSource,
	enqueueScrape as apiEnqueueScrape,
	scrapeOnce as apiScrapeOnce,
	updateSource as apiUpdateSource,
	type SourceSubmission,
} from "./api";
import type { ScrapeResult, SourceDetail } from "./schemas";
import { requireAdmin } from "./session";

// Server actions return a discriminated-union result so client components
// can render validation errors without throwing across the client boundary.

export type ActionResult<T> =
	| { ok: true; data: T }
	| { ok: false; status: number; message: string; issues?: ReadonlyArray<PydanticIssue> };

function toFailure(error: unknown): ActionResult<never> {
	if (error instanceof ApiError) {
		return { ok: false, status: error.status, message: error.message, issues: error.issues };
	}
	return {
		ok: false,
		status: 0,
		message: error instanceof Error ? error.message : "Unknown error",
	};
}

function invalidateSourceRoutes(name?: string) {
	revalidatePath("/");
	revalidatePath("/heals");
	if (name) {
		revalidatePath(`/sources/${name}`);
		revalidatePath(`/sources/${name}/edit`);
	}
}

// ── Source CRUD ────────────────────────────────────────────────────────────

export async function createSourceAction(
	body: SourceSubmission,
): Promise<ActionResult<SourceDetail>> {
	const auth = await requireAdmin("createSource");
	if (!auth.ok) return auth;
	try {
		const data = await apiCreateSource(body);
		invalidateSourceRoutes(data.name);
		return { ok: true, data };
	} catch (e) {
		return toFailure(e);
	}
}

export async function updateSourceAction(
	name: string,
	body: SourceSubmission,
): Promise<ActionResult<SourceDetail>> {
	const auth = await requireAdmin("updateSource");
	if (!auth.ok) return auth;
	try {
		const data = await apiUpdateSource(name, body);
		invalidateSourceRoutes(name);
		return { ok: true, data };
	} catch (e) {
		return toFailure(e);
	}
}

export async function deleteSourceAction(name: string): Promise<ActionResult<null>> {
	const auth = await requireAdmin("deleteSource");
	if (!auth.ok) return auth;
	try {
		await apiDeleteSource(name);
		invalidateSourceRoutes(name);
		return { ok: true, data: null };
	} catch (e) {
		return toFailure(e);
	}
}

// ── Scrape triggers ────────────────────────────────────────────────────────

export async function enqueueScrapeAction(
	source: string,
	maxItems = 10,
): Promise<ActionResult<EnqueueResponse>> {
	const auth = await requireAdmin("enqueueScrape");
	if (!auth.ok) return auth;
	try {
		const data = await apiEnqueueScrape(source, maxItems);
		invalidateSourceRoutes(source);
		return { ok: true, data };
	} catch (e) {
		return toFailure(e);
	}
}

export async function scrapeOnceAction(
	source: string,
	maxItems = 10,
): Promise<ActionResult<ScrapeResult>> {
	const auth = await requireAdmin("scrapeOnce");
	if (!auth.ok) return auth;
	try {
		const data = await apiScrapeOnce(source, maxItems);
		invalidateSourceRoutes(source);
		return { ok: true, data };
	} catch (e) {
		return toFailure(e);
	}
}
