import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppNav, type AppNavProps } from "./AppNav";
import { StatusBar, type StatusBarProps } from "./StatusBar";

export type PageFrameProps = {
	active?: AppNavProps["active"];
	children: ReactNode;
	statusLeft?: StatusBarProps["left"];
	statusRight?: StatusBarProps["right"];
};

export function PageFrame({ active, children, statusLeft, statusRight }: PageFrameProps) {
	return (
		<div className={cn("flex min-h-screen flex-col bg-grid bg-scanlines")}>
			<AppNav active={active} />
			<main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-8 pb-16 md:px-6 md:pt-10">
				{children}
			</main>
			<StatusBar left={statusLeft} right={statusRight} />
		</div>
	);
}
