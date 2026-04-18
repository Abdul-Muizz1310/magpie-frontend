import { ExternalLink } from "lucide-react";

// Minimal shape any item-like record must satisfy. Both `ScrapeItem` (from
// the sync-scrape endpoint) and `RunItem` (from GET /api/runs/{id}/items)
// conform to this — callers just pass either.
export type ScrapedItemLike = {
	stable_id: string;
	url: string;
	title: string;
	content_text: string;
	content_hash: string;
	html_snapshot_url?: string | null;
};

function hasAbsoluteUrl(url: string): boolean {
	return /^(https?:|mailto:|data:)/i.test(url);
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
			{items.map((item, idx) => {
				// Only render a clickable link when we have an absolute URL — if the
				// scraper stored a root-relative path (e.g. "/papers/<id>") and the
				// backend couldn't resolve it, rendering it as <a href> would
				// navigate to our own domain and 404. Fall back to plain text.
				const linkable = hasAbsoluteUrl(item.url);
				const label = item.title || item.url || item.stable_id;
				return (
					<li
						key={item.stable_id}
						className="rounded-lg border border-border bg-surface/40 p-3 transition-colors hover:border-border-bright hover:bg-surface/70"
					>
						<div className="flex items-start gap-3">
							<span className="mt-0.5 shrink-0 font-mono text-[10px] text-fg-faint">
								{String(idx + 1).padStart(2, "0")}
							</span>
							<div className="flex-1 min-w-0">
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
								<div className="mt-1.5 flex gap-3 font-mono text-[10px] text-fg-faint">
									<span title={`hash: ${item.content_hash}`}>
										sha: {item.content_hash.slice(0, 8)}
									</span>
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
								</div>
							</div>
						</div>
					</li>
				);
			})}
		</ol>
	);
}
