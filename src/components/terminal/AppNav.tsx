import { Bird } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { BackendStatusDot } from "@/components/shared/BackendStatusDot";

export type AppNavProps = {
	active?: "home" | "heals" | "demo" | "new";
};

export function AppNav({ active }: AppNavProps) {
	const linkClass = (tab: AppNavProps["active"]) =>
		tab === active
			? "relative text-foreground after:absolute after:-bottom-[19px] after:left-0 after:h-[2px] after:w-full after:bg-accent-emerald after:shadow-[0_0_8px_rgb(52_211_153_/_0.6)]"
			: "transition-colors hover:text-foreground";

	return (
		<nav className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-6 px-4 md:px-6">
				<Link href="/" className="flex items-center gap-2 font-mono">
					<span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-accent-emerald">
						<Bird className="h-3.5 w-3.5" strokeWidth={2.25} />
					</span>
					<span className="text-sm font-semibold tracking-tight text-foreground">
						magpie
						<span className="ml-1 text-accent-emerald">.dev</span>
					</span>
				</Link>
				<div className="flex items-center gap-5 font-mono text-xs text-fg-muted">
					<Link href="/" className={linkClass("home")}>
						sources
					</Link>
					<Link href="/sources/new" className={linkClass("new")}>
						new
					</Link>
					<Link href="/heals" className={linkClass("heals")}>
						heals
					</Link>
					<Link href="/demo" className={linkClass("demo")}>
						demo
					</Link>
					<a
						href="https://github.com/Abdul-Muizz1310/magpie-backend"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors hover:text-foreground"
					>
						github
					</a>
					<a
						href="https://magpie-backend-izzu.onrender.com/docs"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors hover:text-foreground"
					>
						api
					</a>
					<Suspense fallback={null}>
						<BackendStatusDot />
					</Suspense>
				</div>
			</div>
		</nav>
	);
}
