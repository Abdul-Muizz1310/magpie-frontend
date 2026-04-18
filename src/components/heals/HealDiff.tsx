import type { HealConfig } from "@/lib/schemas";

function displaySelector(config: HealConfig): string {
	if (typeof config.selector === "string") return config.selector;
	return JSON.stringify(config, null, 2);
}

function displayField(config: HealConfig): string {
	return typeof config.field === "string" ? config.field : "selector";
}

export function HealDiff({
	oldConfig,
	newConfig,
}: {
	oldConfig: HealConfig;
	newConfig: HealConfig;
}) {
	const field = displayField(newConfig) || displayField(oldConfig);
	return (
		<div className="flex flex-col gap-2">
			<div className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">
				field: <span className="text-accent-emerald">{field}</span>
				{newConfig.selector_type && (
					<span className="ml-2">
						type: <span className="text-accent-teal">{newConfig.selector_type}</span>
					</span>
				)}
				{typeof newConfig.confidence === "number" && (
					<span className="ml-2">
						confidence:{" "}
						<span className="text-accent-emerald">{(newConfig.confidence * 100).toFixed(0)}%</span>
					</span>
				)}
			</div>
			<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
				<div className="rounded-lg border border-error/20 bg-error/5 p-3">
					<div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-error">
						old selector
					</div>
					<pre className="whitespace-pre-wrap break-words font-mono text-xs text-fg-muted">
						{displaySelector(oldConfig)}
					</pre>
				</div>
				<div className="rounded-lg border border-success/20 bg-success/5 p-3">
					<div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-success">
						new selector
					</div>
					<pre className="whitespace-pre-wrap break-words font-mono text-xs text-fg-muted">
						{displaySelector(newConfig)}
					</pre>
				</div>
			</div>
			{typeof newConfig.reasoning === "string" && newConfig.reasoning && (
				<div className="rounded-lg border border-border bg-surface/40 p-3">
					<div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-faint">
						reasoning
					</div>
					<p className="font-mono text-xs leading-relaxed text-fg-muted">{newConfig.reasoning}</p>
				</div>
			)}
		</div>
	);
}
