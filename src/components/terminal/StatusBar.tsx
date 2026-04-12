import type { ReactNode } from "react";

export type StatusBarProps = {
	left?: ReactNode;
	right?: ReactNode;
};

export function StatusBar({ left, right }: StatusBarProps) {
	return (
		<footer className="z-30 mt-auto w-full border-t border-border bg-background/85 backdrop-blur-md">
			<div className="mx-auto flex h-8 max-w-[1400px] items-center justify-between gap-4 px-4 font-mono text-[11px] text-fg-muted md:px-6">
				<div className="flex items-center gap-2 truncate">
					<span className="inline-block h-2 w-2 shrink-0 rounded-full bg-success" />
					<span className="truncate">{left}</span>
				</div>
				<div className="flex shrink-0 items-center gap-3">{right}</div>
			</div>
		</footer>
	);
}
