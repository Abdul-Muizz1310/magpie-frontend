import Link from "next/link";
import type { Heal } from "@/lib/api";
import { fetchHeals } from "@/lib/api";

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function ConfigDiff({
	oldConfig,
	newConfig,
}: {
	oldConfig: Record<string, unknown>;
	newConfig: Record<string, unknown>;
}) {
	const oldJson = JSON.stringify(oldConfig, null, 2);
	const newJson = JSON.stringify(newConfig, null, 2);

	return (
		<div className="mt-2 grid grid-cols-2 gap-2 text-xs">
			<div className="rounded bg-red-50 p-2">
				<div className="mb-1 font-medium text-red-700">Old</div>
				<pre className="whitespace-pre-wrap text-red-800">{oldJson}</pre>
			</div>
			<div className="rounded bg-green-50 p-2">
				<div className="mb-1 font-medium text-green-700">New</div>
				<pre className="whitespace-pre-wrap text-green-800">{newJson}</pre>
			</div>
		</div>
	);
}

function HealEntry({ heal }: { heal: Heal }) {
	return (
		<div className="border-b border-gray-100 py-4 last:border-0">
			<div className="flex items-center justify-between">
				<Link
					href={`/sources/${heal.source}`}
					className="font-medium text-blue-600 hover:underline"
				>
					{heal.source}
				</Link>
				<span className="text-xs text-gray-500">{formatDate(heal.created_at)}</span>
			</div>

			{heal.run_id !== null && (
				<p className="mt-1 text-xs text-gray-500">Triggered by run #{heal.run_id}</p>
			)}

			<div className="mt-2">
				{heal.pr_url ? (
					<a
						href={heal.pr_url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-blue-600 hover:underline"
					>
						{heal.pr_url.replace("https://github.com/", "")}
					</a>
				) : (
					<span className="text-sm text-yellow-600">PR pending</span>
				)}
			</div>

			<ConfigDiff oldConfig={heal.old_config} newConfig={heal.new_config} />
		</div>
	);
}

export default async function HealsPage(): Promise<React.JSX.Element> {
	let heals: Heal[] = [];
	let error: string | null = null;

	try {
		heals = await fetchHeals();
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to fetch heals";
	}

	if (error) {
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
			<h1 className="mb-6 text-2xl font-bold">Self-Healing History</h1>

			{heals.length === 0 ? (
				<p className="text-gray-500">No heals recorded — all scrapers are healthy.</p>
			) : (
				<div className="rounded-lg border border-gray-200 p-4">
					{heals.map((heal) => (
						<HealEntry key={heal.id} heal={heal} />
					))}
				</div>
			)}
		</main>
	);
}
