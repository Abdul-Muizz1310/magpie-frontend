import { ExternalLink, GitPullRequest, HardDrive } from "lucide-react";
import Link from "next/link";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import type { Heal } from "@/lib/schemas";
import { HealDiff } from "./HealDiff";

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function HealEntry({ heal }: { heal: Heal }) {
	return (
		<TerminalWindow
			title={`heal.${heal.source}.diff`}
			statusDot="emerald"
			statusLabel="healed"
			className="mb-4 last:mb-0"
		>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<Link
						href={`/sources/${heal.source}`}
						className="font-mono text-sm font-semibold text-accent-emerald hover:underline"
					>
						{heal.source}
					</Link>
					<span className="font-mono text-xs text-fg-faint">{formatDate(heal.created_at)}</span>
				</div>
				{heal.run_id && (
					<p className="font-mono text-[11px] text-fg-faint">
						triggered by run{" "}
						<Link href={`/runs/${heal.run_id}`} className="text-accent-emerald hover:underline">
							{heal.run_id.slice(0, 8)}
						</Link>
					</p>
				)}
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
						<span
							className="inline-flex items-center gap-1.5 rounded-md border border-accent-teal/30 bg-accent-teal/5 px-2.5 py-1 font-mono text-xs text-accent-teal"
							title="api-origin source — healed directly in Postgres, no PR needed"
						>
							<HardDrive className="h-3.5 w-3.5" />
							db-patched
						</span>
					)}
				</div>
				<HealDiff oldConfig={heal.old_config} newConfig={heal.new_config} />
			</div>
		</TerminalWindow>
	);
}
