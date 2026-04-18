import { Activity, AlertTriangle, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import type { RunStatus } from "@/lib/schemas";

const COLOR_MAP: Record<RunStatus, string> = {
	queued: "border-fg-faint/40 bg-fg-faint/10 text-fg-muted",
	running: "border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald",
	ok: "border-success/40 bg-success/10 text-success",
	error: "border-error/40 bg-error/10 text-error",
};

export function statusIcon(status: RunStatus | string | null) {
	switch (status) {
		case "ok":
			return <CheckCircle className="h-4 w-4 text-success" />;
		case "running":
			return <Loader2 className="h-4 w-4 animate-spin text-accent-emerald" />;
		case "queued":
			return <Clock className="h-4 w-4 text-fg-muted" />;
		case "error":
			return <XCircle className="h-4 w-4 text-error" />;
		case "empty":
			return <AlertTriangle className="h-4 w-4 text-warning" />;
		case "healed":
			return <Activity className="h-4 w-4 text-accent-teal" />;
		default:
			return <Clock className="h-4 w-4 text-fg-faint" />;
	}
}

export function statusDot(
	status: RunStatus | string | null,
): "green" | "yellow" | "red" | "emerald" | "off" {
	switch (status) {
		case "ok":
			return "green";
		case "running":
			return "emerald";
		case "error":
			return "red";
		case "queued":
			return "off";
		case "empty":
			return "yellow";
		case "healed":
			return "emerald";
		default:
			return "off";
	}
}

export function StatusBadge({ status }: { status: RunStatus | null }) {
	const classes = status ? COLOR_MAP[status] : "border-fg-faint/40 bg-fg-faint/10 text-fg-faint";
	return (
		<span
			data-testid="status-badge"
			className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${classes}`}
		>
			{statusIcon(status)}
			{status ?? "idle"}
		</span>
	);
}
