import Link from "next/link";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { StatusBadge, statusDot } from "@/components/shared/StatusBadge";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import type { SourceSummary } from "@/lib/schemas";

export function SourceCard({ source }: { source: SourceSummary }) {
	return (
		<Link href={`/sources/${source.name}`} className="block">
			<TerminalWindow
				title={`${source.name}.yaml`}
				statusDot={statusDot(source.last_status)}
				statusLabel={source.last_status ?? "idle"}
				className="transition-colors hover:border-border-bright"
			>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-2">
						<h2 className="truncate font-mono text-base font-semibold text-foreground">
							{source.name}
						</h2>
						<StatusBadge status={source.last_status} />
					</div>
					<p className="line-clamp-2 text-sm leading-relaxed text-fg-muted">
						{source.description || <span className="text-fg-faint italic">no description</span>}
					</p>
					<div className="flex items-center gap-4 font-mono text-xs text-fg-faint">
						<span>{source.item_count} items</span>
						<RelativeTime iso={source.last_run_at} />
						<span className="ml-auto text-accent-emerald">{source.config_sha.slice(0, 7)}</span>
					</div>
				</div>
			</TerminalWindow>
		</Link>
	);
}
