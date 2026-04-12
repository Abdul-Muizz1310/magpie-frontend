import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Kind = "input" | "output" | "comment";

export type PromptProps = {
	kind?: Kind;
	children: ReactNode;
	className?: string;
	cursor?: boolean;
};

export function Prompt({ kind = "input", children, className, cursor = false }: PromptProps) {
	const marker = kind === "input" ? "$" : kind === "output" ? ">" : "//";
	const markerClass =
		kind === "input"
			? "text-fg-faint"
			: kind === "output"
				? "text-accent-emerald"
				: "text-fg-faint italic";
	const textClass =
		kind === "output"
			? "text-foreground font-semibold"
			: kind === "comment"
				? "text-fg-muted italic"
				: "text-fg-muted";

	return (
		<div className={cn("flex items-baseline gap-2.5 font-mono text-sm", className)}>
			<span className={cn("select-none", markerClass)}>{marker}</span>
			<span className={textClass}>{children}</span>
			{cursor && (
				<span className="ml-0.5 inline-block h-3.5 w-1.5 bg-accent-emerald cursor-blink" />
			)}
		</div>
	);
}
