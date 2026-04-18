"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function Pagination({
	page,
	hasMore,
	paramName = "page",
}: {
	page: number;
	hasMore: boolean;
	paramName?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();

	function go(next: number) {
		const sp = new URLSearchParams(params.toString());
		if (next <= 1) sp.delete(paramName);
		else sp.set(paramName, String(next));
		const qs = sp.toString();
		router.push(qs ? `${pathname}?${qs}` : pathname);
	}

	const prevDisabled = page <= 1;
	const nextDisabled = !hasMore;

	return (
		<nav
			aria-label="pagination"
			className="flex items-center justify-between font-mono text-xs text-fg-muted"
		>
			<button
				type="button"
				onClick={() => go(page - 1)}
				disabled={prevDisabled}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-2.5 py-1 transition-colors",
					prevDisabled
						? "cursor-not-allowed opacity-40"
						: "hover:border-border-bright hover:text-foreground",
				)}
			>
				<ChevronLeft className="h-3.5 w-3.5" />
				prev
			</button>
			<span className="font-mono text-[11px] text-fg-faint">page {page}</span>
			<button
				type="button"
				onClick={() => go(page + 1)}
				disabled={nextDisabled}
				className={cn(
					"inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-2.5 py-1 transition-colors",
					nextDisabled
						? "cursor-not-allowed opacity-40"
						: "hover:border-border-bright hover:text-foreground",
				)}
			>
				next
				<ChevronRight className="h-3.5 w-3.5" />
			</button>
		</nav>
	);
}
