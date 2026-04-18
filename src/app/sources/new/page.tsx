import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SourceEditor } from "@/components/editor/SourceEditor";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";

export const metadata: Metadata = {
	title: "new source — magpie",
	description: "Define a new YAML scraper. Form builder or raw YAML.",
};

export default function NewSourcePage() {
	return (
		<PageFrame active="new" statusLeft="magpie.dev ~/sources/new" statusRight="ready">
			<div className="flex flex-col gap-8">
				<Link
					href="/"
					className="flex items-center gap-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					back to sources
				</Link>
				<section className="flex flex-col gap-3">
					<Prompt kind="comment">magpie source create --from-form</Prompt>
					<h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
						new <span className="text-accent-emerald">source</span>
					</h1>
					<p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
						Define a scraper the way you prefer: the form builder walks through every{" "}
						<code className="font-mono text-accent-emerald">SourceConfig</code> field, or drop a raw
						YAML block. Both paths hit{" "}
						<code className="font-mono text-accent-emerald">POST /api/sources</code> with the same
						server-side validation.
					</p>
				</section>
				<SourceEditor mode="create" />
			</div>
		</PageFrame>
	);
}
