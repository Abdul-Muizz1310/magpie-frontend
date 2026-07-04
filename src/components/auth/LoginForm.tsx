"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { loginAction } from "@/lib/auth-actions";

export function LoginForm({ next }: { next: string }) {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		startTransition(async () => {
			const result = await loginAction(password);
			if (result.ok) {
				router.push(next);
				router.refresh();
			} else {
				setError(result.message);
			}
		});
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-4">
			<label className="flex flex-col gap-1.5">
				<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
					admin password
				</span>
				<input
					type="password"
					name="password"
					autoComplete="current-password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground focus:border-accent-emerald focus:outline-none"
				/>
			</label>
			<button
				type="submit"
				disabled={isPending || password.length === 0}
				className="inline-flex items-center justify-center gap-1.5 rounded-md border border-accent-emerald/40 bg-accent-emerald/10 px-4 py-2 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/20 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isPending ? (
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
				) : (
					<KeyRound className="h-3.5 w-3.5" />
				)}
				sign in
			</button>
			{error && <ErrorAlert title="Sign-in failed">{error}</ErrorAlert>}
		</form>
	);
}
