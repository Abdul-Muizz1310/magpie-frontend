import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function ErrorAlert({ children, title }: { children: ReactNode; title?: string }) {
	return (
		<div
			role="alert"
			className="flex gap-3 rounded-xl border border-error/30 bg-error/5 p-4 font-mono text-sm text-error"
		>
			<AlertCircle className="h-5 w-5 shrink-0" />
			<div className="flex flex-col gap-1">
				{title && <div className="font-semibold">{title}</div>}
				<div className="text-fg-muted">{children}</div>
			</div>
		</div>
	);
}
