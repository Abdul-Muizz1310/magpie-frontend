import { ArrowLeft, Database, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HealEntry } from "@/components/heals/HealEntry";
import { RunRow } from "@/components/runs/RunRow";
import { RunTriggerPanel } from "@/components/runs/RunTriggerPanel";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge, statusDot } from "@/components/shared/StatusBadge";
import { DeleteSourceButton } from "@/components/sources/DeleteSourceButton";
import { OriginBadge } from "@/components/sources/OriginBadge";
import { PageFrame } from "@/components/terminal/PageFrame";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { ApiError } from "@/lib/api";
import { getHeals, getRuns, getSource, getSourceConfig } from "@/lib/data";
import type { Heal, Run, SourceDetail, SourceSummary } from "@/lib/schemas";

const PAGE_SIZE = 10;

export async function generateMetadata(props: {
	params: Promise<{ name: string }>;
}): Promise<Metadata> {
	const { name } = await props.params;
	return {
		title: `${name} — magpie`,
		description: `Run history, heal attempts, and config for the ${name} scraper.`,
	};
}

export default async function SourceDetailPage(props: {
	params: Promise<{ name: string }>;
	searchParams: Promise<{ page?: string }>;
}): Promise<React.JSX.Element> {
	const { name } = await props.params;
	const { page: pageParam } = await props.searchParams;
	const page = Math.max(1, Number(pageParam) || 1);
	const offset = (page - 1) * PAGE_SIZE;

	let source: SourceSummary;
	let detail: SourceDetail | null;
	let runs: Run[];
	let heals: Heal[];
	try {
		[source, detail, runs, heals] = await Promise.all([
			getSource(name),
			getSourceConfig(name).catch((e: unknown) => {
				if (e instanceof ApiError && e.status === 404) return null;
				throw e;
			}),
			getRuns({ source: name, limit: PAGE_SIZE, offset }),
			getHeals({ source: name, limit: 5 }),
		]);
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound();
		return (
			<PageFrame statusLeft={`magpie.dev ~/sources/${name}`}>
				<ErrorAlert title="Failed to load source">{(e as Error).message}</ErrorAlert>
			</PageFrame>
		);
	}

	const canEdit = detail?.origin === "api";

	return (
		<PageFrame
			active="home"
			statusLeft={`magpie.dev ~/sources/${source.name}`}
			statusRight={`${source.item_count} items · ${source.config_sha.slice(0, 7)}`}
		>
			<div className="flex flex-col gap-10">
				<Link
					href="/"
					className="flex items-center gap-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					back to sources
				</Link>

				{/* Header */}
				<div className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center gap-3">
						<h1 className="font-mono text-2xl font-bold text-foreground">{source.name}</h1>
						<StatusBadge status={source.last_status} />
						{detail && <OriginBadge origin={detail.origin} />}
					</div>
					<p className="text-sm leading-relaxed text-fg-muted">{source.description}</p>
					<div className="flex flex-wrap items-center gap-4 font-mono text-xs text-fg-faint">
						<Link
							href={`/sources/${name}/items`}
							className="inline-flex items-center gap-1.5 rounded-md border border-accent-teal/30 bg-accent-teal/5 px-2.5 py-1 text-accent-teal transition-colors hover:bg-accent-teal/10"
						>
							<Database className="h-3.5 w-3.5" />
							{source.item_count} items
						</Link>
						<span>
							last run: <RelativeTime iso={source.last_run_at} />
						</span>
						<span>
							sha: <span className="text-accent-emerald">{source.config_sha.slice(0, 7)}</span>
						</span>
						{canEdit && detail && (
							<div className="ml-auto flex items-center gap-2">
								<Link
									href={`/sources/${name}/edit`}
									className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/30 bg-accent-emerald/5 px-2.5 py-1 text-accent-emerald transition-colors hover:bg-accent-emerald/10"
								>
									<Pencil className="h-3.5 w-3.5" />
									edit
								</Link>
								<DeleteSourceButton source={name} />
							</div>
						)}
						{detail?.origin === "file" && (
							<Link
								href={`/sources/${name}/edit`}
								className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-fg-muted transition-colors hover:border-border-bright hover:text-foreground"
							>
								view config
							</Link>
						)}
					</div>
				</div>

				{/* Trigger panel */}
				<RunTriggerPanel source={source.name} />

				{/* Run timeline */}
				<div className="flex flex-col gap-3">
					<TerminalWindow
						title={`runs.${source.name}.log`}
						statusDot={runs.length > 0 ? statusDot(runs[0]?.status ?? null) : "off"}
						statusLabel={`${runs.length} on this page`}
					>
						{runs.length === 0 ? (
							<p className="font-mono text-sm text-fg-muted">No runs recorded yet.</p>
						) : (
							<div>
								{runs.map((run) => (
									<RunRow key={run.id} run={run} />
								))}
							</div>
						)}
					</TerminalWindow>
					<Pagination page={page} hasMore={runs.length >= PAGE_SIZE} />
				</div>

				{/* Heal history (recent 5) */}
				{heals.length > 0 && (
					<section className="flex flex-col gap-4">
						<div className="flex items-baseline justify-between">
							<h2 className="font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
								Recent heals
							</h2>
							<Link
								href={`/heals?source=${name}`}
								className="font-mono text-[11px] text-fg-muted hover:text-accent-emerald"
							>
								view all →
							</Link>
						</div>
						{heals.slice(0, 3).map((heal) => (
							<HealEntry key={heal.id} heal={heal} />
						))}
					</section>
				)}

				{/* Config preview */}
				{detail && (
					<TerminalWindow
						title={`${source.name}.yaml`}
						statusDot="emerald"
						statusLabel={detail.origin}
					>
						<pre className="overflow-x-auto font-mono text-xs leading-relaxed text-fg-muted">
							{detail.config_yaml}
						</pre>
					</TerminalWindow>
				)}
			</div>
		</PageFrame>
	);
}
