import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceEditor } from "@/components/editor/SourceEditor";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { ApiError } from "@/lib/api";
import { getSourceConfig } from "@/lib/data";
import type { SourceDetail } from "@/lib/schemas";

export async function generateMetadata(props: {
	params: Promise<{ name: string }>;
}): Promise<Metadata> {
	const { name } = await props.params;
	return { title: `edit ${name} — magpie` };
}

export default async function EditSourcePage(props: {
	params: Promise<{ name: string }>;
}): Promise<React.JSX.Element> {
	const { name } = await props.params;
	let detail: SourceDetail;
	try {
		detail = await getSourceConfig(name);
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound();
		throw e;
	}

	const readOnly = detail.origin === "file";

	return (
		<PageFrame statusLeft={`magpie.dev ~/sources/${name}/edit`} statusRight={detail.origin}>
			<div className="flex flex-col gap-8">
				<Link
					href={`/sources/${name}`}
					className="flex items-center gap-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					back to {name}
				</Link>

				<section className="flex flex-col gap-3">
					<Prompt kind="comment">magpie source edit {name}</Prompt>
					<h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
						edit <span className="text-accent-emerald">{name}</span>
					</h1>
				</section>

				{readOnly ? (
					<TerminalWindow
						title={`${name}.yaml (read-only)`}
						statusDot="yellow"
						statusLabel="file-origin"
					>
						<div className="flex flex-col gap-3">
							<div className="flex items-center gap-2 font-mono text-sm text-warning">
								<Lock className="h-4 w-4" />
								This source's config lives in the repo — edit{" "}
								<code className="text-accent-emerald">configs/{name}.yaml</code> and deploy.
							</div>
							<p className="font-mono text-xs text-fg-muted">
								File-origin sources heal by opening a GitHub PR (not DB-patching).
							</p>
							<pre className="overflow-x-auto rounded-lg border border-border bg-surface/60 p-3 font-mono text-xs leading-relaxed text-fg-muted">
								{detail.config_yaml}
							</pre>
						</div>
					</TerminalWindow>
				) : (
					<SourceEditor mode="edit" initial={detail} />
				)}
			</div>
		</PageFrame>
	);
}
