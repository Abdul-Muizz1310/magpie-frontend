"use client";

type Props = {
	value: string;
	onChange: (next: string) => void;
	rows?: number;
	name?: string;
};

export function YamlTextarea({ value, onChange, rows = 22, name }: Props) {
	return (
		<div className="rounded-lg border border-border bg-surface/80 transition-colors focus-within:border-accent-emerald">
			<div className="flex items-center justify-between border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fg-faint">
				<span>yaml</span>
				<span>{value.split("\n").length} lines</span>
			</div>
			<textarea
				name={name}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				spellCheck={false}
				autoComplete="off"
				rows={rows}
				className="block w-full resize-y rounded-b-lg bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
			/>
		</div>
	);
}
