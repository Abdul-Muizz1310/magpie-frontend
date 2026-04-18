import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { SourceCard } from "@/components/sources/SourceCard";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { getSources } from "@/lib/data";

async function SourcesGrid(): Promise<React.JSX.Element> {
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

function SourcesGridSkeleton() {
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

export default function Home() {
	return (
		<PageFrame active="home" statusLeft="magpie.dev ~/sources" statusRight="UTF-8">
			<div className="flex flex-col gap-14">
				<section className="flex flex-col gap-7">
					<div className="flex flex-col gap-3">
						<Prompt kind="comment">scrape run --all — sources self-heal automatically</Prompt>
						<Prompt kind="input">watch selectors fix themselves</Prompt>
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
						a selector breaks, an LLM re-derives it and either opens a PR (for file-origin configs)
						or patches Postgres directly (for api-origin configs). You review, you merge, or you
						just let it run.
					</p>
					<div className="flex flex-wrap gap-3">
						<Link
							href="/sources/new"
							className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/40 bg-accent-emerald/10 px-3 py-1.5 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/20"
						>
							<Plus className="h-3.5 w-3.5" />
							new source
						</Link>
						<Link
							href="/demo"
							className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-border-bright"
						>
							how it works
						</Link>
					</div>
				</section>

				<section>
					<h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
						Configured Sources
					</h2>
					<Suspense fallback={<SourcesGridSkeleton />}>
						<SourcesGrid />
					</Suspense>
				</section>

				<section>
					<div className="grid gap-4 md:grid-cols-3">
						<div className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-emerald">
								YAML → Spider
							</div>
							<div className="font-mono text-sm font-semibold text-foreground">config-driven</div>
							<p className="mt-2 text-sm leading-relaxed text-fg-muted">
								One YAML file per source. Scrapy for static, Playwright for JS-rendered. CSS or
								XPath selectors — both first-class.
							</p>
						</div>
						<div className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-emerald">
								LLM + PR + DB patch
							</div>
							<div className="font-mono text-sm font-semibold text-foreground">self-healing</div>
							<p className="mt-2 text-sm leading-relaxed text-fg-muted">
								When selectors break, an LLM re-derives them. File-origin sources get a GitHub PR.
								Api-origin sources get patched in Postgres on the fly.
							</p>
						</div>
						<div className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface">
							<div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-accent-emerald">
								async queue
							</div>
							<div className="font-mono text-sm font-semibold text-foreground">
								procrastinate-backed
							</div>
							<p className="mt-2 text-sm leading-relaxed text-fg-muted">
								Runs are queued on Postgres — no Redis, no external worker. Content-addressed dedup
								means reruns produce diffs, not dumps.
							</p>
						</div>
					</div>
				</section>
			</div>
		</PageFrame>
	);
}
