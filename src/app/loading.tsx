import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";

export default function Loading() {
	return (
		<PageFrame statusLeft="magpie.dev" statusRight="loading…">
			<div className="flex flex-col gap-8">
				<TerminalWindow title="boot.log" statusDot="emerald" statusLabel="booting">
					<div className="flex flex-col gap-2">
						<Prompt kind="input">fetching data…</Prompt>
						<Prompt kind="comment">hold tight.</Prompt>
					</div>
				</TerminalWindow>
			</div>
		</PageFrame>
	);
}
