"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type HealthState = "unknown" | "ok" | "degraded" | "down";

export function BackendStatusDot() {
	const [state, setState] = useState<HealthState>("unknown");
	const [db, setDb] = useState<string>("");

	useEffect(() => {
		const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
		let cancelled = false;

		async function tick() {
			try {
				const res = await fetch(`${base}/health`, {
					signal: AbortSignal.timeout(5_000),
					cache: "no-store",
				});
				if (cancelled) return;
				if (!res.ok) {
					setState("degraded");
					return;
				}
				const body = (await res.json()) as { db?: string; status?: string };
				setDb(body.db ?? "");
				setState(body.db === "ok" ? "ok" : "degraded");
			} catch {
				if (!cancelled) setState("down");
			}
		}

		tick();
		const t = setInterval(tick, 30_000);
		return () => {
			cancelled = true;
			clearInterval(t);
		};
	}, []);

	const color =
		state === "ok"
			? "bg-accent-emerald"
			: state === "degraded"
				? "bg-warning"
				: state === "down"
					? "bg-error"
					: "bg-fg-faint";
	const label =
		state === "ok"
			? "backend ok"
			: state === "degraded"
				? `backend degraded (db=${db || "?"})`
				: state === "down"
					? "backend unreachable"
					: "checking backend…";

	return (
		<span
			className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-faint"
			title={label}
			data-testid="backend-status-dot"
		>
			<span
				className={cn("inline-block h-2 w-2 rounded-full", color, state === "ok" && "pulse-ring")}
			/>
			<span className="hidden sm:inline">
				{state === "ok"
					? "ok"
					: state === "degraded"
						? "degraded"
						: state === "down"
							? "down"
							: "…"}
			</span>
		</span>
	);
}
