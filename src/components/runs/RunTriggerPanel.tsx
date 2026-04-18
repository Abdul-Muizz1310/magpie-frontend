"use client";

import { Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { enqueueScrapeAction } from "@/lib/actions";

type State = { kind: "idle" } | { kind: "enqueuing" } | { kind: "error"; message: string };

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

	const busy = isPending || state.kind === "enqueuing";

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
				</div>
				<p className="font-mono text-[11px] text-fg-faint">
					Hands off to the Procrastinate worker and redirects to the live run view. Scraped items
					appear there once the run finishes.
				</p>
				{state.kind === "error" && (
					<ErrorAlert title="Failed to enqueue">{state.message}</ErrorAlert>
				)}
			</div>
		</TerminalWindow>
	);
}
