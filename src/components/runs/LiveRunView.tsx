"use client";

import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { statusDot } from "@/components/shared/StatusBadge";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { useRunPoll } from "@/hooks/useRunPoll";
import { fetchRunItems } from "@/lib/api";
import type { Run, RunItem } from "@/lib/schemas";
import { ScrapedItemsList } from "./ScrapedItemsList";

function RunStats({ run }: { run: Run }) {
	return (
		<div className="flex flex-wrap gap-4 font-mono text-xs">
			<span className="text-success">{run.items_new} new</span>
			{run.items_updated > 0 && (
				<span className="text-accent-teal">{run.items_updated} updated</span>
			)}
			{run.items_removed > 0 && <span className="text-warning">{run.items_removed} removed</span>}
			{typeof run.item_count === "number" && run.item_count > 0 && (
				<span className="text-fg-muted">{run.item_count} total</span>
			)}
			{typeof run.duration_ms === "number" && run.duration_ms > 0 && (
				<span className="text-fg-faint">{(run.duration_ms / 1000).toFixed(1)}s</span>
			)}
		</div>
	);
}

type ItemsState =
	| { kind: "loading" }
	| { kind: "done"; items: RunItem[] }
	| { kind: "error"; message: string };

function ItemsSection({ runId }: { runId: string }) {
	const [state, setState] = useState<ItemsState>({ kind: "loading" });

	useEffect(() => {
		let cancelled = false;
		setState({ kind: "loading" });
		fetchRunItems(runId, { limit: 100 })
			.then((items) => {
				if (!cancelled) setState({ kind: "done", items });
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setState({
						kind: "error",
						message: err instanceof Error ? err.message : "Failed to load items",
					});
				}
			});
		return () => {
			cancelled = true;
		};
	}, [runId]);

	if (state.kind === "loading") {
		return (
			<div className="flex items-center gap-2 font-mono text-xs text-fg-muted">
				<Loader2 className="h-3.5 w-3.5 animate-spin" />
				loading items…
			</div>
		);
	}
	if (state.kind === "error") {
		return <ErrorAlert title="Failed to load items">{state.message}</ErrorAlert>;
	}
	return (
		<div className="flex flex-col gap-2">
			<div className="font-mono text-[10px] uppercase tracking-wider text-accent-emerald">
				items ({state.items.length})
			</div>
			<ScrapedItemsList items={state.items} />
		</div>
	);
}

export function LiveRunView({ runId }: { runId: string }) {
	const state = useRunPoll(runId);

	if (state.kind === "idle" || state.kind === "loading") {
		const run = state.kind === "loading" ? state.run : undefined;
		const label = run?.status ?? "queued";
		return (
			<TerminalWindow
				title={`run.${runId.slice(0, 8)}.log`}
				statusDot={statusDot(label)}
				statusLabel={label}
				strong
			>
				<div className="flex flex-col gap-4">
					<div className="flex items-center gap-3">
						<Loader2 className="h-5 w-5 animate-spin text-accent-emerald" />
						<div>
							<Prompt kind="output">
								{run?.status === "running"
									? "scraping in progress…"
									: "queued — waiting for worker…"}
							</Prompt>
							{run && (
								<p className="font-mono text-[11px] text-fg-faint">
									source:{" "}
									<Link
										href={`/sources/${run.source}`}
										className="text-accent-emerald hover:underline"
									>
										{run.source}
									</Link>
								</p>
							)}
						</div>
					</div>
					{run && <RunStats run={run} />}
				</div>
			</TerminalWindow>
		);
	}

	if (state.kind === "error") {
		return (
			<TerminalWindow title={`run.${runId.slice(0, 8)}.log`} statusDot="red" statusLabel="error">
				<ErrorAlert title={`Run polling failed${state.status ? ` (${state.status})` : ""}`}>
					{state.message}
				</ErrorAlert>
			</TerminalWindow>
		);
	}

	const { run } = state;
	const Icon = run.status === "ok" ? CheckCircle : AlertTriangle;
	const iconClass = run.status === "ok" ? "text-success" : "text-error";

	return (
		<div className="flex flex-col gap-5">
			<TerminalWindow
				title={`run.${runId.slice(0, 8)}.log`}
				statusDot={statusDot(run.status)}
				statusLabel={run.status}
				strong
			>
				<div className="flex flex-col gap-4">
					<div className="flex items-center gap-3">
						<Icon className={`h-5 w-5 ${iconClass}`} />
						<div>
							<Prompt kind="output">
								run finished with status{" "}
								<span className={run.status === "ok" ? "text-success" : "text-error"}>
									{run.status}
								</span>
							</Prompt>
							<p className="font-mono text-[11px] text-fg-faint">
								source:{" "}
								<Link
									href={`/sources/${run.source}`}
									className="text-accent-emerald hover:underline"
								>
									{run.source}
								</Link>
							</p>
						</div>
					</div>
					<RunStats run={run} />
					{run.error && <ErrorAlert title="scrape error">{run.error}</ErrorAlert>}
				</div>
			</TerminalWindow>

			{run.status === "ok" && (
				<TerminalWindow title={`items.${run.source}.log`} statusDot="emerald" statusLabel="scraped">
					<ItemsSection runId={runId} />
				</TerminalWindow>
			)}
		</div>
	);
}
