import Link from "next/link";
import { notFound } from "next/navigation";
import type { Run, Source } from "@/lib/api";
import { ApiError, fetchRuns, fetchSource } from "@/lib/api";

function StatusBadge({ status }: { status: string | null }) {
	const colorMap: Record<string, string> = {
		ok: "bg-green-100 text-green-800",
		empty: "bg-yellow-100 text-yellow-800",
		healed: "bg-blue-100 text-blue-800",
		error: "bg-red-100 text-red-800",
		running: "bg-purple-100 text-purple-800",
	};
	const classes = status
		? (colorMap[status] ?? "bg-gray-100 text-gray-800")
		: "bg-gray-100 text-gray-800";
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
		>
			{status ?? "unknown"}
		</span>
	);
}

function RunStatusIcon({ status }: { status: string }) {
	const icon = status === "ok" ? "\u2713" : status === "error" ? "\u2717" : "\u26A0";
	return <span data-testid="run-status-icon">{icon}</span>;
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
		<div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
			<RunStatusIcon status={run.status} />
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{formatDate(run.started_at)}</span>
					<StatusBadge status={run.status} />
					<span className="text-xs text-gray-500">
						{formatDuration(run.started_at, run.ended_at)}
					</span>
				</div>
				<div className="mt-1 text-xs text-gray-600">
					<span>{run.items_new} new</span>
					{run.items_updated > 0 && <span> · {run.items_updated} updated</span>}
					{run.items_removed > 0 && <span> · {run.items_removed} removed</span>}
				</div>
				{run.error && <p className="mt-1 text-xs text-red-600">{run.error}</p>}
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
			<main className="mx-auto max-w-4xl p-8">
				<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
					{error}
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-4xl p-8">
			<Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
				&larr; Back to sources
			</Link>

			<div className="mt-4">
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold">{source.name}</h1>
					<StatusBadge status={source.last_status} />
				</div>
				<p className="mt-1 text-gray-600">{source.description}</p>
				<div className="mt-2 flex gap-4 text-xs text-gray-500">
					<span>{source.item_count} items</span>
					<span>SHA: {source.config_sha}</span>
				</div>
			</div>

			<section className="mt-8">
				<h2 className="mb-4 text-lg font-semibold">Run History</h2>
				{runs.length === 0 ? (
					<p className="text-gray-500">No runs recorded.</p>
				) : (
					<div className="rounded-lg border border-gray-200 p-4">
						{runs.map((run) => (
							<RunRow key={run.id} run={run} />
						))}
					</div>
				)}
			</section>
		</main>
	);
}
