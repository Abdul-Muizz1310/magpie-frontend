import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";

export default function NotFound() {
	return (
		<PageFrame statusLeft="magpie.dev ~/404" statusRight="not found">
			<div className="flex flex-col gap-8">
				<TerminalWindow title="404.log" statusDot="yellow" statusLabel="missing">
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-3">
							<FileQuestion className="h-5 w-5 text-warning" />
							<h1 className="font-mono text-lg font-semibold text-foreground">
								This page isn't in the index.
							</h1>
						</div>
						<Prompt kind="comment">cat /pages/$REQUEST — No such file or directory</Prompt>
						<Link
							href="/"
							className="self-start rounded-md border border-accent-emerald/30 bg-accent-emerald/5 px-3 py-1.5 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/10"
						>
							cd ~ (back to sources)
						</Link>
					</div>
				</TerminalWindow>
			</div>
		</PageFrame>
	);
}
