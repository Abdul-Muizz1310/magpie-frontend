import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScrapedItemsList } from "@/components/runs/ScrapedItemsList";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { Pagination } from "@/components/shared/Pagination";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { ApiError } from "@/lib/api";
import { getSource, getSourceItems } from "@/lib/data";

const PAGE_SIZE = 50;

export async function generateMetadata(props: {
	params: Promise<{ name: string }>;
}): Promise<Metadata> {
	const { name } = await props.params;
	return {
		title: `${name} items — magpie`,
		description: `Every persisted item scraped from ${name}, with full captured fields.`,
	};
}

export default async function SourceItemsPage(props: {
	params: Promise<{ name: string }>;
	searchParams: Promise<{ page?: string }>;
}): Promise<React.JSX.Element> {
	const { name } = await props.params;
	const { page: pageParam } = await props.searchParams;
	const page = Math.max(1, Number(pageParam) || 1);
	const offset = (page - 1) * PAGE_SIZE;

	try {
		const [source, items] = await Promise.all([
			getSource(name),
			getSourceItems(name, { limit: PAGE_SIZE, offset }),
		]);
		return (
			<PageFrame
				active="home"
				statusLeft={`magpie.dev ~/sources/${source.name}/items`}
				statusRight={`page ${page} · ${items.length} on this page`}
			>
				<div className="flex flex-col gap-8">
					<Link
						href={`/sources/${source.name}`}
						className="flex items-center gap-1.5 font-mono text-xs text-fg-muted transition-colors hover:text-foreground"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						back to {source.name}
					</Link>
					<section className="flex flex-col gap-3">
						<Prompt kind="comment">magpie items --source {source.name}</Prompt>
						<h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
							{source.name} <span className="text-accent-emerald">items</span>
						</h1>
						<p className="max-w-2xl text-sm leading-relaxed text-fg-muted">
							Everything magpie currently holds for this scraper, newest first. Expand any row to
							see every field the source config captures (not just title + URL).
						</p>
					</section>
					<div className="flex flex-col gap-3">
						<TerminalWindow
							title={`items.${source.name}.log`}
							statusDot={items.length > 0 ? "emerald" : "off"}
							statusLabel={`${source.item_count} total`}
						>
							<ScrapedItemsList items={items} />
						</TerminalWindow>
						<Pagination page={page} hasMore={items.length >= PAGE_SIZE} />
					</div>
				</div>
			</PageFrame>
		);
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound();
		return (
			<PageFrame statusLeft={`magpie.dev ~/sources/${name}/items`}>
				<ErrorAlert title="Failed to load items">{(e as Error).message}</ErrorAlert>
			</PageFrame>
		);
	}
}
