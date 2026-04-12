import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { fetchHealth, fetchSources } from "@/lib/api";

export const dynamic = "force-dynamic";

const YAML_SNIPPET = `name: hackernews
url: https://news.ycombinator.com
render: false
schedule: "0 */6 * * *"

item:
  container: "tr.athing"
  fields:
    - { name: title, selector: "span.titleline > a::text" }
    - { name: url, selector: "span.titleline > a::attr(href)" }
  dedupe_key: id

health:
  min_items: 20`;

const STEPS = [
	{
		num: 1,
		title: "Define a scraper",
		description: "Write a YAML config — one file per source. No code needed.",
	},
	{
		num: 2,
		title: "Scraper runs on schedule",
		description: "GitHub Actions cron triggers the scraper every 6 hours.",
	},
	{
		num: 3,
		title: "Site changes, selectors break",
		description: "The scraper returns 0 items where it used to return 20+.",
	},
	{
		num: 4,
		title: "Healer fires",
		description: "An LLM analyzes the raw HTML and proposes a new CSS selector.",
	},
	{
		num: 5,
		title: "PR opens automatically",
		description: "A GitHub PR appears with the old/new selector diff and reasoning.",
	},
	{
		num: 6,
		title: "Human reviews and merges",
		description: "You review the PR, merge it, and the scraper heals itself.",
	},
];

export default async function DemoPage(): Promise<React.JSX.Element> {
	let connected = false;
	let sourceCount = 0;

	try {
		await fetchHealth();
		connected = true;
		const sources = await fetchSources();
		sourceCount = sources.length;
	} catch {
		// Backend offline — degrade gracefully
	}

	return (
		<PageFrame
			active="demo"
			statusLeft="magpie.dev ~/demo"
			statusRight={connected ? `backend ok · ${sourceCount} sources` : "backend offline"}
		>
			<div className="flex flex-col gap-14">
				{/* Hero */}
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
					<p className="max-w-xl text-base leading-relaxed text-fg-muted">
						YAML-defined scrapers that self-heal via LLM + PR.{" "}
						<a
							href="https://github.com/Abdul-Muizz1310/magpie-backend"
							target="_blank"
							rel="noopener noreferrer"
							className="text-accent-emerald hover:underline"
						>
							View source
						</a>
					</p>
				</section>

				{/* Step cards */}
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

				{/* YAML snippet */}
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

				{/* Live status */}
				<section>
					<h2 className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
						Live Status
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
							{connected && <Prompt kind="output">{sourceCount} sources configured</Prompt>}
						</div>
					</TerminalWindow>
				</section>
			</div>
		</PageFrame>
	);
}
