"use client";

import { Loader2, Send, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { enqueueScrapeAction, scrapeOnceAction } from "@/lib/actions";
import type { ScrapeResult } from "@/lib/schemas";
import { ScrapedItemsList } from "./ScrapedItemsList";

type State =
	| { kind: "idle" }
	| { kind: "enqueuing" }
	| { kind: "scraping" }
	| { kind: "scraped"; result: ScrapeResult }
	| { kind: "error"; message: string };

export function RunTriggerPanel({ source }: { source: string }) {
	const [maxItems, setMaxItems] = useState(10);
	const [state, setState] = useState<State>({ kind: "idle" });
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	function handleEnqueue() {
		setState({ kind: "enqueuing" });
		startTransition(async () => {
			const result = await enqueueScrapeAction(source, maxItems);
			if (result.ok) {
				router.push(`/runs/${result.data.run_id}`);
			} else {
				setState({ kind: "error", message: result.message });
			}
		});
	}

	function handleScrapeNow() {
		setState({ kind: "scraping" });
		startTransition(async () => {
			const result = await scrapeOnceAction(source, maxItems);
			if (result.ok) {
				setState({ kind: "scraped", result: result.data });
			} else {
				setState({ kind: "error", message: result.message });
			}
		});
	}

	const busy = isPending || state.kind === "enqueuing" || state.kind === "scraping";

	return (
		<TerminalWindow title={`trigger.${source}`} statusDot="emerald" statusLabel="ready">
			<div className="flex flex-col gap-4">
				<div className="flex flex-wrap items-end gap-3">
					<label className="flex flex-col gap-1">
						<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
							max items
						</span>
						<input
							type="number"
							min={1}
							max={100}
							value={maxItems}
							onChange={(e) => setMaxItems(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
							className="w-24 rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-sm text-foreground focus:border-accent-emerald focus:outline-none"
						/>
					</label>
					<button
						type="button"
						onClick={handleEnqueue}
						disabled={busy}
						className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/40 bg-accent-emerald/10 px-3 py-1.5 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/20 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{state.kind === "enqueuing" ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Send className="h-3.5 w-3.5" />
						)}
						enqueue run
					</button>
					<button
						type="button"
						onClick={handleScrapeNow}
						disabled={busy}
						className="inline-flex items-center gap-1.5 rounded-md border border-accent-teal/40 bg-accent-teal/10 px-3 py-1.5 font-mono text-xs text-accent-teal transition-colors hover:bg-accent-teal/20 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{state.kind === "scraping" ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Zap className="h-3.5 w-3.5" />
						)}
						scrape now
					</button>
				</div>
				<p className="font-mono text-[11px] text-fg-faint">
					<span className="text-accent-emerald">enqueue run</span> hands off to the Procrastinate
					worker and redirects to the live run view.{" "}
					<span className="text-accent-teal">scrape now</span> runs synchronously and shows the
					scraped items inline below.
				</p>
				{state.kind === "error" && (
					<ErrorAlert title="Scrape trigger failed">{state.message}</ErrorAlert>
				)}
				{state.kind === "scraped" && (
					<div className="flex flex-col gap-2">
						<div className="font-mono text-[10px] uppercase tracking-wider text-accent-teal">
							scraped {state.result.items.length} items · run {state.result.run_id.slice(0, 8)}
						</div>
						<ScrapedItemsList items={state.result.items} />
					</div>
				)}
			</div>
		</TerminalWindow>
	);
}
