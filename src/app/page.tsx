import Link from "next/link";
import type { Source } from "@/lib/api";
import { fetchSources } from "@/lib/api";

function StatusBadge({ status }: { status: string | null }) {
	const colorMap: Record<string, string> = {
		ok: "bg-green-100 text-green-800",
		empty: "bg-yellow-100 text-yellow-800",
		healed: "bg-blue-100 text-blue-800",
		error: "bg-red-100 text-red-800",
	};
	const classes = status
		? (colorMap[status] ?? "bg-gray-100 text-gray-800")
		: "bg-gray-100 text-gray-800";

	return (
		<span
			data-testid="status-badge"
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
		>
			{status ?? "unknown"}
		</span>
	);
}

function formatRelativeTime(iso: string | null): string {
	if (!iso) return "Never";
	const diff = Date.now() - new Date(iso).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

function SourceCard({ source }: { source: Source }) {
	return (
		<Link
			href={`/sources/${source.name}`}
			className="block rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-400"
		>
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">{source.name}</h2>
				<StatusBadge status={source.last_status} />
			</div>
			<p className="mt-1 text-sm text-gray-600">{source.description}</p>
			<div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
				<span>{source.item_count} items</span>
				<span>{formatRelativeTime(source.last_run_at)}</span>
			</div>
		</Link>
	);
}

export default async function Home(): Promise<React.JSX.Element> {
	let sources: Source[] = [];
	let error: string | null = null;

	try {
		sources = await fetchSources();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to fetch sources";
	}

	if (error) {
		return (
			<main className="flex flex-1 items-center justify-center p-8">
				<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
					{error}
				</div>
			</main>
		);
	}

	if (sources.length === 0) {
		return (
			<main className="flex flex-1 items-center justify-center p-8">
				<p className="text-gray-500">No sources configured.</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-4xl p-8">
			<h1 className="mb-6 text-2xl font-bold">Sources</h1>
			<div className="grid gap-4 sm:grid-cols-2">
				{sources.map((source) => (
					<SourceCard key={source.name} source={source} />
				))}
			</div>
		</main>
	);
}
