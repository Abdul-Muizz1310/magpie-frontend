"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { PageFrame } from "@/components/terminal/PageFrame";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<PageFrame statusLeft="magpie.dev ~/error" statusRight="something broke">
			<div className="flex flex-col gap-8">
				<TerminalWindow title="error.log" statusDot="red" statusLabel="fatal" strong>
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<AlertTriangle className="h-5 w-5 text-error" />
							<h1 className="font-mono text-lg font-semibold text-foreground">
								Something went sideways.
							</h1>
						</div>
						<pre className="whitespace-pre-wrap rounded-lg border border-error/30 bg-error/5 p-3 font-mono text-xs text-error">
							{error.message || "Unknown error"}
						</pre>
						{error.digest && (
							<p className="font-mono text-xs text-fg-faint">digest: {error.digest}</p>
						)}
						<button
							type="button"
							onClick={reset}
							className="inline-flex items-center gap-1.5 self-start rounded-md border border-accent-emerald/30 bg-accent-emerald/5 px-3 py-1.5 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/10"
						>
							<RotateCcw className="h-3.5 w-3.5" />
							retry
						</button>
					</div>
				</TerminalWindow>
			</div>
		</PageFrame>
	);
}
