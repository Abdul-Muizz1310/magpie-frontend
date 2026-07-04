import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import type { RunStatus } from "@/lib/schemas";
import { assertNever } from "@/lib/utils";

const COLOR_MAP: Record<RunStatus, string> = {
	queued: "border-fg-faint/40 bg-fg-faint/10 text-fg-muted",
	running: "border-accent-emerald/40 bg-accent-emerald/10 text-accent-emerald",
	ok: "border-success/40 bg-success/10 text-success",
	error: "border-error/40 bg-error/10 text-error",
};

// `status` is the Zod-validated RunStatus (or null when a source has never run).
// Switches are exhaustive over the closed enum: adding a member to
// RunStatusSchema without handling it here is a compile error (assertNever), and
// an out-of-enum value at runtime fails loudly rather than silently rendering a
// generic icon.
export function statusIcon(status: RunStatus | null) {
	if (status === null) return <Clock className="h-4 w-4 text-fg-faint" />;
	switch (status) {
		case "ok":
			return <CheckCircle className="h-4 w-4 text-success" />;
		case "running":
			return <Loader2 className="h-4 w-4 animate-spin text-accent-emerald" />;
		case "queued":
			return <Clock className="h-4 w-4 text-fg-muted" />;
		case "error":
			return <XCircle className="h-4 w-4 text-error" />;
		default:
			return assertNever(status);
	}
}

export function statusDot(status: RunStatus | null): "green" | "red" | "emerald" | "off" {
	if (status === null) return "off";
	switch (status) {
		case "ok":
			return "green";
		case "running":
			return "emerald";
		case "error":
			return "red";
		case "queued":
			return "off";
		default:
			return assertNever(status);
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
