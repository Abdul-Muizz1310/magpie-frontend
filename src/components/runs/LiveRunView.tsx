"use client";

import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { statusDot } from "@/components/shared/StatusBadge";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { useRunPoll } from "@/hooks/useRunPoll";
import type { Run } from "@/lib/schemas";

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
							<Link href={`/sources/${run.source}`} className="text-accent-emerald hover:underline">
								{run.source}
							</Link>
						</p>
					</div>
				</div>
				<RunStats run={run} />
				{run.error && <ErrorAlert title="scrape error">{run.error}</ErrorAlert>}
			</div>
		</TerminalWindow>
	);
}
