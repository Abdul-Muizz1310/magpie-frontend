import type { Metadata } from "next";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { getHealth, getSources } from "@/lib/data";

export const metadata: Metadata = {
	title: "demo — magpie",
	description: "How magpie's config-driven, self-healing, async-queued scraping works.",
};

const YAML_SNIPPET = `name: hackernews
url: https://news.ycombinator.com
render: false
schedule: "0 */6 * * *"

item:
  container: "tr.athing"
  fields:
    - { name: title, selector: "span.titleline > a::text" }
    - { name: url, selector: "span.titleline > a::attr(href)" }
    - { name: id, selector: "::attr(id)" }
  dedupe_key: id

health:
  min_items: 20
  max_staleness: "24h"`;

const STEPS = [
	{
		num: 1,
		title: "Define a scraper",
		description:
			"Write a YAML config — or use the form builder at /sources/new. Both hit the same Pydantic-validated endpoint.",
	},
	{
		num: 2,
		title: "Run it — sync or async",
		description:
			"POST /api/scrape/{src}/once for immediate results, or /enqueue to defer to the Procrastinate worker.",
	},
	{
		num: 3,
		title: "Content-addressed dedup",
		description:
			"Items are SHA-256 hashed. Re-runs produce diffs (new/updated/removed), not dumps. Reappeared items are tracked.",
	},
	{
		num: 4,
		title: "Healer fires on underflow",
		description:
			"If item_count < health.min_items, an LLM analyzes the raw HTML and proposes a new CSS or XPath selector.",
	},
	{
		num: 5,
		title: "Dual-mode patch",
		description:
			"File-origin sources get a GitHub PR labeled scrape:self-heal. Api-origin sources get patched in Postgres, instantly.",
	},
	{
		num: 6,
		title: "Every attempt is logged",
		description:
			"See /heals for confidence scores, reasoning, and links to the PR or the db-patched diff.",
	},
];

export default async function DemoPage(): Promise<React.JSX.Element> {
	let connected = false;
	let sourceCount = 0;
	let version = "";
	let db = "";

	try {
		const health = await getHealth();
		connected = health.db === "ok";
		version = health.version ?? "";
		db = health.db;
		const sources = await getSources();
		sourceCount = sources.length;
	} catch {
		// graceful offline
	}

	return (
		<PageFrame
			active="demo"
			statusLeft="magpie.dev ~/demo"
			statusRight={connected ? `backend ok · ${sourceCount} sources` : "backend offline"}
		>
			<div className="flex flex-col gap-14">
				<section className="flex flex-col gap-5">
					<Prompt kind="comment">demo run --interactive</Prompt>
					<h1 className="font-mono text-4xl font-bold tracking-tight md:text-5xl">
						how{" "}
						<span className="relative inline-block text-accent-emerald">
							magpie
							<span className="absolute -bottom-1 left-0 h-[3px] w-full bg-accent-emerald shadow-[0_0_12px_rgb(52_211_153_/_0.8)]" />
						</span>{" "}
						works.
					</h1>
					<p className="max-w-2xl text-base leading-relaxed text-fg-muted">
						YAML-defined scrapers that self-heal via LLM. Async job queue on Postgres. Dual-mode
						healing (PR for file-origin, DB patch for runtime). Content-addressed dedup.{" "}
						<a
							href="https://github.com/Abdul-Muizz1310/magpie-backend"
							target="_blank"
							rel="noopener noreferrer"
							className="text-accent-emerald hover:underline"
						>
							view source
						</a>
					</p>
				</section>

				<section>
					<h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
						The self-healing flow
					</h2>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{STEPS.map((step) => (
							<div
								key={step.title}
								className="rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-border-bright hover:bg-surface"
							>
								<div className="mb-2 flex items-center gap-2">
									<span className="flex h-6 w-6 items-center justify-center rounded-full border border-accent-emerald/30 bg-accent-emerald/10 font-mono text-xs font-bold text-accent-emerald">
										{step.num}
									</span>
									<h3 className="font-mono text-sm font-semibold text-foreground">{step.title}</h3>
								</div>
								<p className="text-xs leading-relaxed text-fg-muted">{step.description}</p>
							</div>
						))}
					</div>
				</section>

				<section>
					<h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
						Example: hackernews.yaml
					</h2>
					<TerminalWindow title="configs/hackernews.yaml" statusDot="green" statusLabel="valid">
						<pre className="overflow-x-auto font-mono text-sm leading-relaxed text-fg-muted">
							<code>{YAML_SNIPPET}</code>
						</pre>
					</TerminalWindow>
				</section>

				<section>
					<h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
						Live status
					</h2>
					<TerminalWindow
						title="health.check"
						statusDot={connected ? "emerald" : "red"}
						statusLabel={connected ? "ok" : "down"}
					>
						<div className="flex flex-col gap-2">
							<Prompt kind={connected ? "output" : "comment"}>
								{connected ? "Connected" : "Backend offline"}
							</Prompt>
							{connected && (
								<>
									<Prompt kind="output">{sourceCount} sources configured</Prompt>
									<Prompt kind="output">db: {db}</Prompt>
									{version && <Prompt kind="output">version: {version}</Prompt>}
								</>
							)}
						</div>
					</TerminalWindow>
				</section>
			</div>
		</PageFrame>
	);
}
