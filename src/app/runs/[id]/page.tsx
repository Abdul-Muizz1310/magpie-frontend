import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LiveRunView } from "@/components/runs/LiveRunView";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";

export async function generateMetadata(props: {
	params: Promise<{ id: string }>;
}): Promise<Metadata> {
	const { id } = await props.params;
	return { title: `run ${id.slice(0, 8)} — magpie` };
}

export default async function RunDetailPage(props: {
	params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
	const { id } = await props.params;
	return (
		<PageFrame statusLeft={`magpie.dev ~/runs/${id.slice(0, 8)}`} statusRight="polling…">
			<div className="flex flex-col gap-8">
				<Link
					href="/"
					className="flex items-center gap-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					back
				</Link>
				<section className="flex flex-col gap-3">
					<Prompt kind="comment">tail -f /runs/{id}</Prompt>
					<h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">live run</h1>
					<p className="text-sm text-fg-muted">
						Polling{" "}
						<code className="font-mono text-accent-emerald">/api/runs/{id.slice(0, 8)}</code> with
						exponential backoff until the worker finishes.
					</p>
				</section>
				<LiveRunView runId={id} />
			</div>
		</PageFrame>
	);
}
