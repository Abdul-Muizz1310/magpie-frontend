"use client";

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";

// Minimal shape any item-like record must satisfy. Both `ScrapeItem` (from
// the sync-scrape endpoint) and `RunItem` (from GET /api/runs/{id}/items and
// GET /sources/{name}/items) conform to this — callers just pass either.
// `data` is optional because `ScrapeItem` (sync scrape) doesn't return it.
export type ScrapedItemLike = {
	stable_id: string;
	url: string;
	title: string;
	content_text: string;
	content_hash: string;
	html_snapshot_url?: string | null;
	data?: Record<string, unknown>;
};

function hasAbsoluteUrl(url: string): boolean {
	return /^(https?:|mailto:|data:)/i.test(url);
}

// Keys that are already rendered through dedicated UI (title link, snapshot,
// URL) — no point repeating them in the "all fields" expansion.
const SURFACED_KEYS = new Set(["title", "url", "link", "href", "html_snapshot_url"]);

function stringifyValue(val: unknown): string {
	if (val === null || val === undefined) return "—";
	if (typeof val === "string") return val;
	if (typeof val === "number" || typeof val === "boolean") return String(val);
	try {
		return JSON.stringify(val, null, 2);
	} catch {
		return String(val);
	}
}

function ItemFieldsTable({ data }: { data: Record<string, unknown> }) {
	const entries = Object.entries(data).filter(([key]) => !SURFACED_KEYS.has(key));
	if (entries.length === 0) {
		return (
			<p className="font-mono text-[11px] italic text-fg-faint">
				(no additional fields — the source config only captures title/url)
			</p>
		);
	}
	return (
		<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-xs">
			{entries.map(([key, val]) => {
				const str = stringifyValue(val);
				const isMultiline = str.includes("\n") || str.length > 80;
				return (
					<div key={key} className="contents">
						<dt className="text-accent-emerald">{key}</dt>
						{isMultiline ? (
							<dd>
								<pre className="whitespace-pre-wrap break-words rounded border border-border bg-surface/60 p-2 text-fg-muted">
									{str}
								</pre>
							</dd>
						) : (
							<dd className="break-words text-fg-muted">{str}</dd>
						)}
					</div>
				);
			})}
		</dl>
	);
}

function ItemRow({ item, idx }: { item: ScrapedItemLike; idx: number }) {
	const [expanded, setExpanded] = useState(false);
	const extraCount = item.data
		? Object.keys(item.data).filter((k) => !SURFACED_KEYS.has(k)).length
		: 0;
	const canExpand = extraCount > 0;
	// Only render a clickable link when we have an absolute URL — a root-relative
	// path would navigate to the magpie domain and 404 instead of the source.
	const linkable = hasAbsoluteUrl(item.url);
	const label = item.title || item.url || item.stable_id;

	return (
		<li className="rounded-lg border border-border bg-surface/40 transition-colors hover:border-border-bright hover:bg-surface/70">
			<div className="flex items-start gap-3 p-3">
				<span className="mt-0.5 shrink-0 font-mono text-[10px] text-fg-faint">
					{String(idx + 1).padStart(2, "0")}
				</span>
				<div className="min-w-0 flex-1">
					{linkable ? (
						<a
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							className="group inline-flex items-start gap-1.5 font-mono text-sm text-foreground hover:text-accent-emerald"
						>
							<span className="truncate">{label}</span>
							<ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-fg-faint group-hover:text-accent-emerald" />
						</a>
					) : (
						<span
							className="block truncate font-mono text-sm text-foreground"
							title={item.url || undefined}
						>
							{label}
						</span>
					)}
					{item.content_text && item.content_text !== item.title && (
						<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-muted">
							{item.content_text}
						</p>
					)}
					<div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[10px] text-fg-faint">
						<span title={`hash: ${item.content_hash}`}>sha: {item.content_hash.slice(0, 8)}</span>
						{item.html_snapshot_url && hasAbsoluteUrl(item.html_snapshot_url) && (
							<a
								href={item.html_snapshot_url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent-teal hover:underline"
							>
								snapshot
							</a>
						)}
						{canExpand && (
							<button
								type="button"
								onClick={() => setExpanded((v) => !v)}
								aria-expanded={expanded}
								aria-controls={`item-${item.stable_id}-fields`}
								className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 text-fg-muted transition-colors hover:border-border-bright hover:text-foreground"
							>
								{expanded ? (
									<ChevronDown className="h-3 w-3" />
								) : (
									<ChevronRight className="h-3 w-3" />
								)}
								{expanded ? "hide fields" : `show fields (${extraCount})`}
							</button>
						)}
					</div>
				</div>
			</div>
			{expanded && canExpand && (
				<div
					id={`item-${item.stable_id}-fields`}
					className="border-t border-border bg-background/40 p-3"
				>
					<ItemFieldsTable data={item.data ?? {}} />
				</div>
			)}
		</li>
	);
}

export function ScrapedItemsList({ items }: { items: ReadonlyArray<ScrapedItemLike> }) {
	if (items.length === 0) {
		return (
			<p className="rounded-lg border border-warning/30 bg-warning/5 p-3 font-mono text-xs text-warning">
				0 items scraped — the source may be broken (healer should kick in).
			</p>
		);
	}
	return (
		<ol className="flex flex-col gap-2">
			{items.map((item, idx) => (
				<ItemRow key={item.stable_id} item={item} idx={idx} />
			))}
		</ol>
	);
}
