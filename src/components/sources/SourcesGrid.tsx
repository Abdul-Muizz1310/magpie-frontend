import Link from "next/link";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { SourceCard } from "@/components/sources/SourceCard";
import { getSources } from "@/lib/data";

export function SourcesGridSkeleton() {
	return (
		<div className="grid gap-4 sm:grid-cols-2" aria-busy>
			{[0, 1, 2, 3].map((i) => (
				<div
					key={i}
					className="h-[140px] animate-pulse rounded-xl border border-border bg-surface/50"
				/>
			))}
		</div>
	);
}

export async function SourcesGrid(): Promise<React.JSX.Element> {
	try {
		const sources = await getSources();
		if (sources.length === 0) {
			return (
				<div className="rounded-xl border border-border bg-surface/40 p-6 font-mono text-sm text-fg-muted">
					No sources configured yet.{" "}
					<Link href="/sources/new" className="text-accent-emerald hover:underline">
						Create one
					</Link>
					.
				</div>
			);
		}
		return (
			<div className="grid gap-4 sm:grid-cols-2">
				{sources.map((source) => (
					<SourceCard key={source.name} source={source} />
				))}
			</div>
		);
	} catch (e) {
		return <ErrorAlert title="Failed to load sources">{(e as Error).message}</ErrorAlert>;
	}
}
