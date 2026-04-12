import { ExternalLink, GitPullRequest } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import type { Heal } from "@/lib/api";
import { fetchHeals } from "@/lib/api";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function HealEntry({ heal }: { heal: Heal }) {
	const oldJson = JSON.stringify(heal.old_config, null, 2);
	const newJson = JSON.stringify(heal.new_config, null, 2);

	return (
		<TerminalWindow
			title={`heal.${heal.source}.diff`}
			statusDot="emerald"
			statusLabel="healed"
			className="mb-4 last:mb-0"
		>
			<div className="flex flex-col gap-3">
				{/* Header */}
				<div className="flex items-center justify-between">
					<Link
						href={`/sources/${heal.source}`}
						className="font-mono text-sm font-semibold text-accent-emerald hover:underline"
					>
						{heal.source}
					</Link>
					<span className="font-mono text-xs text-fg-faint">{formatDate(heal.created_at)}</span>
				</div>

				{heal.run_id !== null && (
					<p className="font-mono text-xs text-fg-faint">Triggered by run #{heal.run_id}</p>
				)}

				{/* PR link */}
				<div>
					{heal.pr_url ? (
						<a
							href={heal.pr_url}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/30 bg-accent-emerald/5 px-2.5 py-1 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/10"
						>
							<GitPullRequest className="h-3.5 w-3.5" />
							{heal.pr_url.replace("https://github.com/", "")}
							<ExternalLink className="h-3 w-3" />
						</a>
					) : (
						<span className="inline-flex items-center gap-1.5 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1 font-mono text-xs text-warning">
							PR pending
						</span>
					)}
				</div>

				{/* Config diff */}
				<div className="grid grid-cols-2 gap-2">
					<div className="rounded-lg border border-error/20 bg-error/5 p-3">
						<div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-error">
							old config
						</div>
						<pre className="whitespace-pre-wrap font-mono text-xs text-fg-muted">{oldJson}</pre>
					</div>
					<div className="rounded-lg border border-success/20 bg-success/5 p-3">
						<div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-success">
							new config
						</div>
						<pre className="whitespace-pre-wrap font-mono text-xs text-fg-muted">{newJson}</pre>
					</div>
				</div>
			</div>
		</TerminalWindow>
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

	return (
		<PageFrame
			active="heals"
			statusLeft="magpie.dev ~/heals"
			statusRight={`${heals.length} heals · UTF-8`}
		>
			<div className="flex flex-col gap-10">
				<section className="flex flex-col gap-5">
					<Prompt kind="comment">git log --grep=&quot;self-heal&quot; --oneline</Prompt>
					<h1 className="font-mono text-3xl font-bold tracking-tight">
						self-healing <span className="text-accent-emerald">history</span>
					</h1>
					<p className="max-w-xl text-sm leading-relaxed text-fg-muted">
						Every time a scraper breaks and the LLM proposes a fix, it shows up here. Each entry
						links to the GitHub PR where the selector was patched.
					</p>
				</section>

				<section>
					{error ? (
						<div
							role="alert"
							className="rounded-xl border border-error/30 bg-error/5 p-4 font-mono text-sm text-error"
						>
							{error}
						</div>
					) : heals.length === 0 ? (
						<TerminalWindow title="heals.log" statusDot="off" statusLabel="idle">
							<p className="text-sm text-fg-muted">No heals recorded — all scrapers are healthy.</p>
						</TerminalWindow>
					) : (
						heals.map((heal) => <HealEntry key={heal.id} heal={heal} />)
					)}
				</section>
			</div>
		</PageFrame>
	);
}
