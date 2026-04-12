import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TerminalWindowProps = {
	title: string;
	statusDot?: "red" | "yellow" | "green" | "emerald" | "off";
	statusLabel?: string;
	children: ReactNode;
	className?: string;
	bodyClassName?: string;
	strong?: boolean;
};

const STATUS_COLOR: Record<NonNullable<TerminalWindowProps["statusDot"]>, string> = {
	red: "bg-error",
	yellow: "bg-warning",
	green: "bg-success",
	emerald: "bg-accent-emerald",
	off: "bg-fg-faint",
};

export function TerminalWindow({
	title,
	statusDot,
	statusLabel,
	children,
	className,
	bodyClassName,
	strong = false,
}: TerminalWindowProps) {
	return (
		<section
			className={cn(
				"min-w-0 overflow-hidden rounded-xl bg-surface backdrop-blur-sm",
				strong ? "terminal-glow-strong" : "terminal-glow",
				className,
			)}
		>
			<header className="flex items-center gap-3 border-b border-border px-4 py-2.5">
				<div className="flex items-center gap-1.5">
					<span className="inline-block h-3 w-3 rounded-full bg-mac-red" />
					<span className="inline-block h-3 w-3 rounded-full bg-mac-yellow" />
					<span className="inline-block h-3 w-3 rounded-full bg-mac-green" />
				</div>
				<div className="flex-1 text-center font-mono text-xs text-fg-muted">{title}</div>
				<div className="flex min-w-[60px] items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-faint">
					{statusDot && statusDot !== "off" && (
						<span
							className={cn(
								"inline-block h-1.5 w-1.5 rounded-full",
								STATUS_COLOR[statusDot],
								statusDot === "emerald" && "pulse-ring",
							)}
						/>
					)}
					{statusLabel && <span>{statusLabel}</span>}
				</div>
			</header>
			<div className={cn("p-5 md:p-6", bodyClassName)}>{children}</div>
		</section>
	);
}
