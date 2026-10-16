"use client";

import { useEffect, useState } from "react";
import { proxyUrl } from "@/lib/api-browser";
import { cn } from "@/lib/utils";

type HealthState = "unknown" | "ok" | "degraded" | "down";

export function BackendStatusDot() {
	const [state, setState] = useState<HealthState>("unknown");
	const [db, setDb] = useState<string>("");

	useEffect(() => {
		// Through the same-origin proxy like every other browser call (spec 07): the dot then
		// measures the path the page's data takes, proxy and signing key included.
		const url = proxyUrl("/health");
		let cancelled = false;
		let interval: ReturnType<typeof setInterval> | null = null;

		async function tick() {
			try {
				const res = await fetch(url, {
					signal: AbortSignal.timeout(5_000),
					cache: "no-store",
				});
				if (cancelled) return;
				// 502 is the proxy saying it could not reach the backend at all.
				if (res.status === 502) {
					setState("down");
					return;
				}
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

		// Poll only while the tab is visible. Backgrounded/idle tabs would
		// otherwise ping the free-tier backend every 30s indefinitely, preventing
		// it from ever idling and generating steady unnecessary load (REL-3).
		function start() {
			if (interval !== null) return;
			tick();
			interval = setInterval(tick, 30_000);
		}
		function stop() {
			if (interval !== null) {
				clearInterval(interval);
				interval = null;
			}
		}
		function onVisibility() {
			if (document.visibilityState === "visible") start();
			else stop();
		}

		if (document.visibilityState === "visible") start();
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			cancelled = true;
			stop();
			document.removeEventListener("visibilitychange", onVisibility);
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
