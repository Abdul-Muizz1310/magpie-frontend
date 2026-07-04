"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getAuthState, logoutAction } from "@/lib/auth-actions";

// Client component (mirrors BackendStatusDot): resolves the httpOnly session
// state via a server action on mount, so the shared nav chrome stays fully
// client-renderable (no async server component inside PageFrame).
export function AuthNavControl(): React.JSX.Element | null {
	const router = useRouter();
	const [authed, setAuthed] = useState<boolean | null>(null);
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		let cancelled = false;
		getAuthState()
			.then((v) => {
				if (!cancelled) setAuthed(v);
			})
			.catch(() => {
				if (!cancelled) setAuthed(false);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (authed === null) return null; // resolving

	if (!authed) {
		return (
			<Link href="/login" className="transition-colors hover:text-foreground">
				login
			</Link>
		);
	}

	return (
		<button
			type="button"
			disabled={isPending}
			onClick={() =>
				startTransition(async () => {
					await logoutAction();
					setAuthed(false);
					router.push("/");
					router.refresh();
				})
			}
			className="inline-flex items-center gap-1 transition-colors hover:text-foreground disabled:opacity-50"
		>
			<LogOut className="h-3.5 w-3.5" />
			logout
		</button>
	);
}
