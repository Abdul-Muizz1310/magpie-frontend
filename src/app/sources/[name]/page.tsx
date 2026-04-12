import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageFrame } from "@/components/terminal/PageFrame";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import type { Run, Source } from "@/lib/api";
import { ApiError, fetchRuns, fetchSource } from "@/lib/api";

export const dynamic = "force-dynamic";

function RunStatusIcon({ status }: { status: string }) {
	switch (status) {
		case "ok":
			return (
				<span data-testid="run-status-icon">
					<CheckCircle className="h-4 w-4 text-success" />
				</span>
			);
		case "error":
			return (
				<span data-testid="run-status-icon">
					<XCircle className="h-4 w-4 text-error" />
				</span>
			);
		case "running":
			return (
				<span data-testid="run-status-icon">
					<Loader2 className="h-4 w-4 animate-spin text-accent-emerald" />
				</span>
			);
		default:
			return (
				<span data-testid="run-status-icon">
					<AlertTriangle className="h-4 w-4 text-warning" />
				</span>
			);
	}
}

function formatDuration(start: string, end: string | null): string {
	if (!end) return "In progress";
	const ms = new Date(end).getTime() - new Date(start).getTime();
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function RunRow({ run }: { run: Run }) {
	return (
		<div className="flex items-start gap-3 border-b border-border py-3 last:border-0">
			<RunStatusIcon status={run.status} />
			<div className="flex-1">
				<div className="flex items-center gap-3">
					<span className="font-mono text-sm text-foreground">{formatDate(run.started_at)}</span>
					<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
						{formatDuration(run.started_at, run.ended_at)}
					</span>
				</div>
				<div className="mt-1 flex gap-3 font-mono text-xs text-fg-muted">
					<span className="text-success">{run.items_new} new</span>
					{run.items_updated > 0 && (
						<span className="text-accent-teal">{run.items_updated} updated</span>
					)}
					{run.items_removed > 0 && (
						<span className="text-warning">{run.items_removed} removed</span>
					)}
				</div>
				{run.error && (
					<p className="mt-1 rounded border border-error/30 bg-error/5 px-2 py-1 font-mono text-xs text-error">
						{run.error}
					</p>
				)}
			</div>
		</div>
	);
}

export default async function SourceDetailPage(props: {
	params: Promise<{ name: string }>;
}): Promise<React.JSX.Element> {
	const { name } = await props.params;

	let source: Source;
	let runs: Run[] = [];
	let error: string | null = null;

	try {
		source = await fetchSource(name);
		runs = await fetchRuns({ source: name });
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) {
			notFound();
		}
		error = e instanceof Error ? e.message : "Failed to load source";
		return (
			<PageFrame statusLeft={`magpie.dev ~/sources/${name}`}>
				<div
					role="alert"
					className="rounded-xl border border-error/30 bg-error/5 p-4 font-mono text-sm text-error"
				>
					{error}
				</div>
			</PageFrame>
		);
	}

	return (
		<PageFrame
			active="home"
			statusLeft={`magpie.dev ~/sources/${source.name}`}
			statusRight={`${runs.length} runs · ${source.item_count} items`}
		>
			<div className="flex flex-col gap-10">
				{/* Back link */}
				<Link
					href="/"
					className="flex items-center gap-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					back to sources
				</Link>

				{/* Source header */}
				<div>
					<div className="flex items-center gap-3">
						<h1 className="font-mono text-2xl font-bold text-foreground">{source.name}</h1>
						<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
							{source.last_status ?? "idle"}
						</span>
					</div>
					<p className="mt-2 text-sm leading-relaxed text-fg-muted">{source.description}</p>
					<div className="mt-2 flex gap-4 font-mono text-xs text-fg-faint">
						<span>{source.item_count} items</span>
						<span>
							sha: <span className="text-accent-emerald">{source.config_sha.slice(0, 7)}</span>
						</span>
					</div>
				</div>

				{/* Run timeline */}
				<TerminalWindow
					title={`runs.${source.name}.log`}
					statusDot={runs.length > 0 ? "emerald" : "off"}
					statusLabel={`${runs.length} runs`}
				>
					{runs.length === 0 ? (
						<div className="flex items-center gap-2 text-fg-muted">
							<Clock className="h-4 w-4" />
							<span className="text-sm">No runs recorded.</span>
						</div>
					) : (
						<div>
							{runs.map((run) => (
								<RunRow key={run.id} run={run} />
							))}
						</div>
					)}
				</TerminalWindow>
			</div>
		</PageFrame>
	);
}
