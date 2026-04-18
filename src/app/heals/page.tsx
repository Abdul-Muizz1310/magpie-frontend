import type { Metadata } from "next";
import { HealEntry } from "@/components/heals/HealEntry";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { getHeals } from "@/lib/data";
import type { Heal } from "@/lib/schemas";

const PAGE_SIZE = 10;

export const metadata: Metadata = {
	title: "heals — magpie",
	description: "Every LLM-proposed selector fix: PRs, DB patches, and confidence scores.",
};

export default async function HealsPage(props: {
	searchParams: Promise<{ page?: string; source?: string }>;
}): Promise<React.JSX.Element> {
	const { page: pageParam, source } = await props.searchParams;
	const page = Math.max(1, Number(pageParam) || 1);
	const offset = (page - 1) * PAGE_SIZE;

	let heals: Heal[] = [];
	let error: string | null = null;
	try {
		heals = await getHeals({ limit: PAGE_SIZE, offset, source });
	} catch (e) {
		error = e instanceof Error ? e.message : "Failed to fetch heals";
	}

	return (
		<PageFrame
			active="heals"
			statusLeft="magpie.dev ~/heals"
			statusRight={source ? `filter: ${source}` : `page ${page}`}
		>
			<div className="flex flex-col gap-10">
				<section className="flex flex-col gap-5">
					<Prompt kind="comment">git log --grep=&quot;self-heal&quot; --oneline</Prompt>
					<h1 className="font-mono text-3xl font-bold tracking-tight">
						self-healing <span className="text-accent-emerald">history</span>
					</h1>
					<p className="max-w-xl text-sm leading-relaxed text-fg-muted">
						Every time a scraper underflows the min-items threshold, an LLM re-derives the broken
						selector. <span className="text-accent-emerald">file</span>-origin configs get a GitHub
						PR; <span className="text-accent-teal">api</span>-origin configs get patched directly in
						Postgres — same healer, different destination.
					</p>
				</section>

				<section className="flex flex-col gap-4">
					{error ? (
						<ErrorAlert title="Failed to fetch heals">{error}</ErrorAlert>
					) : heals.length === 0 ? (
						<TerminalWindow title="heals.log" statusDot="off" statusLabel="idle">
							<p className="font-mono text-sm text-fg-muted">
								{source
									? `No heals recorded for ${source}.`
									: page > 1
										? "No more heals on this page."
										: "No heals recorded — all scrapers are healthy."}
							</p>
						</TerminalWindow>
					) : (
						heals.map((heal) => <HealEntry key={heal.id} heal={heal} />)
					)}
					<Pagination page={page} hasMore={heals.length >= PAGE_SIZE} />
				</section>
			</div>
		</PageFrame>
	);
}
