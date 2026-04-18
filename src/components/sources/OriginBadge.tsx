import { Lock, Pencil } from "lucide-react";
import type { SourceOrigin } from "@/lib/schemas";

export function OriginBadge({ origin }: { origin: SourceOrigin }) {
	if (origin === "file") {
		return (
			<span
				className="inline-flex items-center gap-1.5 rounded-full border border-fg-faint/40 bg-fg-faint/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-muted"
				title="Committed YAML — heals via GitHub PR. Edit the file in the repo to change."
			>
				<Lock className="h-3 w-3" />
				file
			</span>
		);
	}
	return (
		<span
			className="inline-flex items-center gap-1.5 rounded-full border border-accent-emerald/30 bg-accent-emerald/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-emerald"
			title="Runtime-editable — heals patch the DB directly."
		>
			<Pencil className="h-3 w-3" />
			api
		</span>
	);
}
