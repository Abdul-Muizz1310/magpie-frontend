"use client";

import { useEffect, useState } from "react";

function formatRelative(iso: string | null): string {
	if (!iso) return "never";
	const diff = Date.now() - new Date(iso).getTime();
	if (diff < 0) return "just now";
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return `${seconds}s ago`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

export function RelativeTime({ iso }: { iso: string | null }) {
	const [, tick] = useState(0);
	useEffect(() => {
		const t = setInterval(() => tick((n) => n + 1), 30_000);
		return () => clearInterval(t);
	}, []);
	return (
		<time dateTime={iso ?? undefined} title={iso ?? "never"} suppressHydrationWarning>
			{formatRelative(iso)}
		</time>
	);
}
