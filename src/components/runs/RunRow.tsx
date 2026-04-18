import Link from "next/link";
import { statusIcon } from "@/components/shared/StatusBadge";
import type { Run } from "@/lib/schemas";

function formatDuration(run: Run): string {
	if (run.duration_ms !== undefined && run.duration_ms > 0) {
		const seconds = Math.floor(run.duration_ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
	}
	if (!run.ended_at) return run.status === "running" ? "in progress" : "—";
	const ms = new Date(run.ended_at).getTime() - new Date(run.started_at).getTime();
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

export function RunRow({ run }: { run: Run }) {
	return (
		<Link
			href={`/runs/${run.id}`}
			className="flex items-start gap-3 border-b border-border py-3 transition-colors last:border-0 hover:bg-surface-hover/60"
		>
			<span data-testid="run-status-icon" className="pt-0.5">
				{statusIcon(run.status)}
			</span>
			<div className="flex-1 min-w-0">
				<div className="flex flex-wrap items-center gap-3">
					<span className="font-mono text-sm text-foreground">{formatDate(run.started_at)}</span>
					<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
						{formatDuration(run)}
					</span>
					<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
						{run.status}
					</span>
				</div>
				<div className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-fg-muted">
					<span className="text-success">{run.items_new} new</span>
					{run.items_updated > 0 && (
						<span className="text-accent-teal">{run.items_updated} updated</span>
					)}
					{run.items_removed > 0 && (
						<span className="text-warning">{run.items_removed} removed</span>
					)}
					{typeof run.item_count === "number" && run.item_count > 0 && (
						<span className="text-fg-faint">{run.item_count} total</span>
					)}
				</div>
				{run.error && (
					<p className="mt-1 rounded border border-error/30 bg-error/5 px-2 py-1 font-mono text-xs text-error">
						{run.error}
					</p>
				)}
			</div>
		</Link>
	);
}
