"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSourceAction } from "@/lib/actions";

export function DeleteSourceButton({ source }: { source: string }) {
	const router = useRouter();
	const [confirming, setConfirming] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	function onDelete() {
		setError(null);
		startTransition(async () => {
			const result = await deleteSourceAction(source);
			if (result.ok) {
				router.push("/");
				router.refresh();
			} else {
				setError(result.message);
				// Keep confirming=true so the error is visible next to the buttons
				// — collapsing back to the single "delete" trigger would hide it.
			}
		});
	}

	if (!confirming) {
		return (
			<button
				type="button"
				onClick={() => setConfirming(true)}
				className="inline-flex items-center gap-1.5 rounded-md border border-error/30 bg-error/5 px-2.5 py-1 font-mono text-xs text-error transition-colors hover:bg-error/10"
			>
				<Trash2 className="h-3.5 w-3.5" />
				delete
			</button>
		);
	}

	return (
		<div className="flex flex-col gap-2 rounded-md border border-error/30 bg-error/5 p-2 font-mono text-xs">
			<span className="text-error">delete {source}? this cannot be undone.</span>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={onDelete}
					disabled={isPending}
					className="inline-flex items-center gap-1.5 rounded-md border border-error/40 bg-error/10 px-2.5 py-1 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
				>
					{isPending ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Trash2 className="h-3.5 w-3.5" />
					)}
					confirm
				</button>
				<button
					type="button"
					onClick={() => setConfirming(false)}
					disabled={isPending}
					className="rounded-md border border-border bg-surface px-2.5 py-1 text-fg-muted transition-colors hover:text-foreground disabled:opacity-50"
				>
					cancel
				</button>
			</div>
			{error && <span className="text-error">{error}</span>}
		</div>
	);
}
