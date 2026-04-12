import { fetchHealth, fetchSources } from "@/lib/api";

const YAML_SNIPPET = `# configs/hackernews.yaml
name: hackernews
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
		title: "Define a scraper",
		description: "Write a YAML config — one file per source. No code needed.",
	},
	{
		title: "Scraper runs on schedule",
		description: "GitHub Actions cron triggers the scraper every 6 hours.",
	},
	{
		title: "Site changes, selectors break",
		description: "The scraper returns 0 items where it used to return 20+.",
	},
	{
		title: "Healer fires",
		description: "An LLM analyzes the raw HTML and proposes a new CSS selector.",
	},
	{
		title: "PR opens automatically",
		description: "A GitHub PR appears with the old/new selector diff and reasoning.",
	},
	{
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
		<main className="mx-auto max-w-4xl p-8">
			<h1 className="mb-2 text-2xl font-bold">How Magpie Works</h1>
			<p className="mb-8 text-gray-600">
				YAML-defined scrapers that self-heal via LLM + PR.{" "}
				<a
					href="https://github.com/Abdul-Muizz1310/magpie-backend"
					target="_blank"
					rel="noopener noreferrer"
					className="text-blue-600 hover:underline"
				>
					View source
				</a>
			</p>

			{/* Step cards */}
			<section className="mb-10">
				<h2 className="mb-4 text-lg font-semibold">The self-healing flow</h2>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{STEPS.map((step, i) => (
						<div key={step.title} className="rounded-lg border border-gray-200 p-4">
							<div className="mb-2 flex items-center gap-2">
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
									{i + 1}
								</span>
								<h3 className="text-sm font-semibold">{step.title}</h3>
							</div>
							<p className="text-xs text-gray-600">{step.description}</p>
						</div>
					))}
				</div>
			</section>

			{/* YAML snippet */}
			<section className="mb-10">
				<h2 className="mb-4 text-lg font-semibold">Example: hackernews.yaml</h2>
				<pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
					<code>{YAML_SNIPPET}</code>
				</pre>
			</section>

			{/* Live status */}
			<section>
				<h2 className="mb-4 text-lg font-semibold">Live Status</h2>
				<div className="flex items-center gap-3">
					<span className={`h-3 w-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
					<span className="text-sm">{connected ? "Connected" : "Backend offline"}</span>
					{connected && (
						<span className="text-sm text-gray-500">· {sourceCount} sources configured</span>
					)}
				</div>
			</section>
		</main>
	);
}
