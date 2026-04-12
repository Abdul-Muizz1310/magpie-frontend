import { Activity, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import type { Source } from "@/lib/api";
import { fetchSources } from "@/lib/api";

export const dynamic = "force-dynamic";

function statusIcon(status: string | null) {
	switch (status) {
		case "ok":
			return <CheckCircle className="h-4 w-4 text-success" />;
		case "empty":
			return <AlertTriangle className="h-4 w-4 text-warning" />;
		case "healed":
			return <Activity className="h-4 w-4 text-accent-teal" />;
		case "error":
			return <XCircle className="h-4 w-4 text-error" />;
		default:
			return <Clock className="h-4 w-4 text-fg-faint" />;
	}
}

function statusDot(status: string | null): "green" | "yellow" | "red" | "emerald" | "off" {
	switch (status) {
		case "ok":
			return "green";
		case "empty":
			return "yellow";
		case "healed":
			return "emerald";
		case "error":
			return "red";
		default:
			return "off";
	}
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

function StatusBadge({ status }: { status: string | null }) {
	const colorMap: Record<string, string> = {
		ok: "border-success/40 bg-success/10 text-success",
		empty: "border-warning/40 bg-warning/10 text-warning",
		healed: "border-accent-teal/40 bg-accent-teal/10 text-accent-teal",
		error: "border-error/40 bg-error/10 text-error",
	};
	const classes = status
		? (colorMap[status] ?? "border-fg-faint/40 bg-fg-faint/10 text-fg-faint")
		: "border-fg-faint/40 bg-fg-faint/10 text-fg-faint";

	return (
		<span
			data-testid="status-badge"
			className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${classes}`}
		>
			{statusIcon(status)}
			{status ?? "unknown"}
		</span>
	);
}

function SourceCard({ source }: { source: Source }) {
	return (
		<Link href={`/sources/${source.name}`} className="block">
			<TerminalWindow
				title={`${source.name}.yaml`}
				statusDot={statusDot(source.last_status)}
				statusLabel={source.last_status ?? "idle"}
				className="transition-colors hover:border-border-bright"
			>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<h2 className="font-mono text-base font-semibold text-foreground">{source.name}</h2>
						<StatusBadge status={source.last_status} />
					</div>
					<p className="text-sm leading-relaxed text-fg-muted">{source.description}</p>
					<div className="flex items-center gap-4 font-mono text-xs text-fg-faint">
						<span>{source.item_count} items</span>
						<span>{formatRelativeTime(source.last_run_at)}</span>
					</div>
				</div>
			</TerminalWindow>
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

	return (
		<PageFrame
			active="home"
			statusLeft="magpie.dev ~/sources"
			statusRight={`${sources.length} configs · UTF-8`}
		>
			<div className="flex flex-col gap-14">
				{/* Hero */}
				<section className="flex flex-col gap-7">
					<div className="flex flex-col gap-3">
						<Prompt kind="comment">scrape run --all — 4 configs loaded</Prompt>
						<Prompt kind="input">watch selectors heal themselves</Prompt>
					</div>
					<h1 className="font-mono text-4xl font-bold leading-tight tracking-tight md:text-5xl">
						collect everything,
						<br />
						<span className="relative inline-block text-accent-emerald">
							heal
							<span className="absolute -bottom-1 left-0 h-[3px] w-full bg-accent-emerald shadow-[0_0_12px_rgb(52_211_153_/_0.8)]" />
						</span>{" "}
						automatically.
					</h1>
					<p className="max-w-xl text-base leading-relaxed text-fg-muted">
						magpie is a config-driven scraping framework. Define a scraper in 20 lines of YAML. When
						a selector breaks, an LLM patches it and opens a PR. You review, you merge, you move on.
					</p>
				</section>

				{/* Sources grid */}
				<section>
					<h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
						Configured Sources
					</h2>

					{error ? (
						<div
							role="alert"
							className="rounded-xl border border-error/30 bg-error/5 p-4 font-mono text-sm text-error"
						>
							{error}
						</div>
					) : sources.length === 0 ? (
						<p className="text-fg-muted">No sources configured.</p>
					) : (
						<div className="grid gap-4 sm:grid-cols-2">
							{sources.map((source) => (
								<SourceCard key={source.name} source={source} />
							))}
						</div>
					)}
				</section>

				{/* Feature cards */}
				<section>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-emerald">
								YAML → Spider
							</div>
							<div className="font-mono text-sm font-semibold text-foreground">config-driven</div>
							<p className="mt-2 text-sm leading-relaxed text-fg-muted">
								One YAML file per source. Scrapy for static, Playwright for JS-rendered. No code per
								site.
							</p>
						</div>
						<div className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-emerald">
								LLM + PR
							</div>
							<div className="font-mono text-sm font-semibold text-foreground">self-healing</div>
							<p className="mt-2 text-sm leading-relaxed text-fg-muted">
								When selectors break, an LLM re-derives them from raw HTML and opens a GitHub PR
								with the fix.
							</p>
						</div>
						<div className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-emerald">
								SHA-256
							</div>
							<div className="font-mono text-sm font-semibold text-foreground">
								content-addressed
							</div>
							<p className="mt-2 text-sm leading-relaxed text-fg-muted">
								Items are hashed and deduped. Nightly runs produce diffs, not full dumps.
							</p>
						</div>
					</div>
				</section>
			</div>
		</PageFrame>
	);
}
