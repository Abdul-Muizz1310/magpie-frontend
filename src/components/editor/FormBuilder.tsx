"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ActionDef, FieldDef, SelectorType, SourceConfig } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type Props = {
	value: SourceConfig;
	onChange: (next: SourceConfig) => void;
	fieldErrors?: Record<string, string>;
	disableNameEdit?: boolean;
};

type Updater<T> = (update: (prev: T) => T) => void;

export const DEFAULT_CONFIG: SourceConfig = {
	name: "",
	description: "",
	url: "",
	render: false,
	schedule: "0 */6 * * *",
	rate_limit: { rps: 1 },
	item: {
		container: "",
		container_type: "css",
		fields: [{ name: "title", selector: "", selector_type: "css", attr: null }],
		dedupe_key: "title",
	},
	pagination: { max_pages: 1, next_type: "css" },
	wait_for: null,
	actions: [],
	health: { min_items: 1, max_staleness: "24h" },
};

// ── Reusable atoms ─────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
	return (
		<span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint">{children}</span>
	);
}

function FieldErrorMsg({ error }: { error?: string }) {
	if (!error) return null;
	return <span className="font-mono text-[10px] text-error">{error}</span>;
}

function TextInput({
	value,
	onChange,
	placeholder,
	disabled,
	"data-testid": testId,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	disabled?: boolean;
	"data-testid"?: string;
}) {
	return (
		<input
			type="text"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			disabled={disabled}
			data-testid={testId}
			className={cn(
				"w-full rounded-md border border-border bg-surface/80 px-2.5 py-1.5 font-mono text-sm text-foreground transition-colors focus:border-accent-emerald focus:outline-none",
				disabled && "cursor-not-allowed opacity-60",
			)}
		/>
	);
}

function NumberInput({
	value,
	onChange,
	min,
	max,
}: {
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
}) {
	return (
		<input
			type="number"
			value={value}
			min={min}
			max={max}
			onChange={(e) => {
				const n = Number(e.target.value);
				if (Number.isFinite(n)) onChange(n);
			}}
			className="w-24 rounded-md border border-border bg-surface/80 px-2.5 py-1.5 font-mono text-sm text-foreground focus:border-accent-emerald focus:outline-none"
		/>
	);
}

function SelectorTypeToggle({
	value,
	onChange,
}: {
	value: SelectorType;
	onChange: (v: SelectorType) => void;
}) {
	return (
		<div className="inline-flex rounded-md border border-border bg-surface/60 p-0.5 font-mono text-[10px] uppercase tracking-wider">
			{(["css", "xpath"] as const).map((opt) => (
				<button
					key={opt}
					type="button"
					onClick={() => onChange(opt)}
					className={cn(
						"rounded px-2 py-0.5 transition-colors",
						value === opt
							? "bg-accent-emerald/15 text-accent-emerald"
							: "text-fg-muted hover:text-foreground",
					)}
				>
					{opt}
				</button>
			))}
		</div>
	);
}

function SectionHeader({ children, hint }: { children: React.ReactNode; hint?: string }) {
	return (
		<div className="flex flex-wrap items-baseline gap-3 border-b border-border pb-1">
			<h3 className="font-mono text-xs uppercase tracking-[0.2em] text-accent-emerald">
				{children}
			</h3>
			{hint && <span className="font-mono text-[11px] text-fg-faint">{hint}</span>}
		</div>
	);
}

// ── Sections ───────────────────────────────────────────────────────────────

function MetadataSection({
	value,
	set,
	errors,
	disableNameEdit,
}: {
	value: SourceConfig;
	set: Updater<SourceConfig>;
	errors: Record<string, string>;
	disableNameEdit: boolean;
}) {
	return (
		<section className="flex flex-col gap-4">
			<SectionHeader hint="who / what">metadata</SectionHeader>
			<div className="grid gap-4 md:grid-cols-2">
				<label className="flex flex-col gap-1">
					<Label>name (slug)</Label>
					<TextInput
						value={value.name}
						onChange={(v) => set((p) => ({ ...p, name: v }))}
						placeholder="hackernews"
						disabled={disableNameEdit}
						data-testid="name-input"
					/>
					<FieldErrorMsg error={errors.name} />
				</label>
				<label className="flex flex-col gap-1">
					<Label>description</Label>
					<TextInput
						value={value.description}
						onChange={(v) => set((p) => ({ ...p, description: v }))}
						placeholder="Scrape Hacker News front page"
					/>
					<FieldErrorMsg error={errors.description} />
				</label>
				<label className="flex flex-col gap-1 md:col-span-2">
					<Label>url</Label>
					<TextInput
						value={value.url}
						onChange={(v) => set((p) => ({ ...p, url: v }))}
						placeholder="https://news.ycombinator.com"
					/>
					<FieldErrorMsg error={errors.url} />
				</label>
			</div>
		</section>
	);
}

function ExecutionSection({
	value,
	set,
	errors,
}: {
	value: SourceConfig;
	set: Updater<SourceConfig>;
	errors: Record<string, string>;
}) {
	return (
		<section className="flex flex-col gap-4">
			<SectionHeader hint="scrapy for static, playwright for JS">execution</SectionHeader>
			<div className="grid gap-4 md:grid-cols-3">
				<label className="flex flex-col gap-1">
					<Label>render mode</Label>
					<div className="inline-flex rounded-md border border-border bg-surface/60 p-0.5 font-mono text-[11px]">
						{(
							[
								{ k: false, label: "static" },
								{ k: true, label: "js (playwright)" },
							] as const
						).map((opt) => (
							<button
								key={String(opt.k)}
								type="button"
								onClick={() => set((p) => ({ ...p, render: opt.k }))}
								className={cn(
									"rounded px-2 py-1 transition-colors",
									value.render === opt.k
										? "bg-accent-emerald/15 text-accent-emerald"
										: "text-fg-muted hover:text-foreground",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</label>
				<label className="flex flex-col gap-1">
					<Label>schedule (cron)</Label>
					<TextInput
						value={value.schedule}
						onChange={(v) => set((p) => ({ ...p, schedule: v }))}
						placeholder="0 */6 * * *"
					/>
					<FieldErrorMsg error={errors.schedule} />
				</label>
				<label className="flex flex-col gap-1">
					<Label>rate limit (rps)</Label>
					<NumberInput
						value={value.rate_limit.rps}
						onChange={(v) => set((p) => ({ ...p, rate_limit: { rps: Math.max(1, v) } }))}
						min={1}
					/>
				</label>
			</div>
			{value.render && (
				<div className="grid gap-4 md:grid-cols-2">
					<label className="flex flex-col gap-1">
						<Label>wait_for selector (optional)</Label>
						<TextInput
							value={value.wait_for ?? ""}
							onChange={(v) => set((p) => ({ ...p, wait_for: v || null }))}
							placeholder='section[data-test="homepage-section-0"]'
						/>
					</label>
					<ActionsEditor value={value.actions} set={set} />
				</div>
			)}
		</section>
	);
}

function ActionsEditor({
	value,
	set,
}: {
	value: ReadonlyArray<ActionDef>;
	set: Updater<SourceConfig>;
}) {
	function update(idx: number, patch: Partial<ActionDef>) {
		set((p) => ({
			...p,
			actions: p.actions.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
		}));
	}
	function remove(idx: number) {
		set((p) => ({ ...p, actions: p.actions.filter((_, i) => i !== idx) }));
	}
	function add() {
		set((p) => ({ ...p, actions: [...p.actions, { type: "wait", ms: 1000 }] }));
	}
	return (
		<div className="flex flex-col gap-2">
			<Label>actions</Label>
			<div className="flex flex-col gap-2">
				{value.map((action, idx) => (
					<div
						key={idx}
						className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface/40 p-2"
					>
						<select
							value={action.type}
							onChange={(e) => update(idx, { type: e.target.value as ActionDef["type"] })}
							className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground"
						>
							<option value="wait">wait</option>
							<option value="click">click</option>
							<option value="scroll">scroll</option>
							<option value="type">type</option>
						</select>
						{action.type === "wait" && (
							<input
								type="number"
								min={0}
								value={action.ms ?? 0}
								onChange={(e) => update(idx, { ms: Number(e.target.value) })}
								placeholder="ms"
								className="w-24 rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground"
							/>
						)}
						{(action.type === "click" || action.type === "type") && (
							<input
								type="text"
								value={action.selector ?? ""}
								onChange={(e) => update(idx, { selector: e.target.value })}
								placeholder="selector"
								className="min-w-[180px] flex-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground"
							/>
						)}
						{action.type === "type" && (
							<input
								type="text"
								value={action.text ?? ""}
								onChange={(e) => update(idx, { text: e.target.value })}
								placeholder="text to type"
								className="min-w-[120px] flex-1 rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-foreground"
							/>
						)}
						<button
							type="button"
							onClick={() => remove(idx)}
							className="ml-auto text-fg-faint transition-colors hover:text-error"
							aria-label={`remove action ${idx + 1}`}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={add}
					className="inline-flex w-fit items-center gap-1 rounded-md border border-border bg-surface/60 px-2.5 py-1 font-mono text-[11px] text-fg-muted transition-colors hover:border-border-bright hover:text-foreground"
				>
					<Plus className="h-3 w-3" /> action
				</button>
			</div>
		</div>
	);
}

function ItemSection({
	value,
	set,
	errors,
}: {
	value: SourceConfig;
	set: Updater<SourceConfig>;
	errors: Record<string, string>;
}) {
	const fieldNames = value.item.fields.map((f) => f.name).filter(Boolean);

	function updateField(idx: number, patch: Partial<FieldDef>) {
		set((p) => ({
			...p,
			item: {
				...p.item,
				fields: p.item.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
			},
		}));
	}
	function removeField(idx: number) {
		set((p) => ({
			...p,
			item: { ...p.item, fields: p.item.fields.filter((_, i) => i !== idx) },
		}));
	}
	function addField() {
		set((p) => ({
			...p,
			item: {
				...p.item,
				fields: [
					...p.item.fields,
					{
						name: `field_${p.item.fields.length + 1}`,
						selector: "",
						selector_type: "css",
						attr: null,
					},
				],
			},
		}));
	}

	return (
		<section className="flex flex-col gap-4">
			<SectionHeader hint="the rows you want to extract">item</SectionHeader>
			<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
				<label className="flex flex-col gap-1">
					<Label>container selector</Label>
					<TextInput
						value={value.item.container}
						onChange={(v) => set((p) => ({ ...p, item: { ...p.item, container: v } }))}
						placeholder="tr.athing"
					/>
					<FieldErrorMsg error={errors["item.container"]} />
				</label>
				<label className="flex flex-col gap-1">
					<Label>type</Label>
					<SelectorTypeToggle
						value={value.item.container_type}
						onChange={(v) => set((p) => ({ ...p, item: { ...p.item, container_type: v } }))}
					/>
				</label>
			</div>

			<div className="flex flex-col gap-2">
				<Label>fields</Label>
				{value.item.fields.map((field, idx) => (
					<div
						key={idx}
						className="grid gap-2 rounded-md border border-border bg-surface/40 p-3 md:grid-cols-[140px_minmax(0,1fr)_auto_140px_auto]"
					>
						<TextInput
							value={field.name}
							onChange={(v) => updateField(idx, { name: v })}
							placeholder="title"
						/>
						<TextInput
							value={field.selector}
							onChange={(v) => updateField(idx, { selector: v })}
							placeholder="span.titleline > a::text"
						/>
						<SelectorTypeToggle
							value={field.selector_type}
							onChange={(v) => updateField(idx, { selector_type: v })}
						/>
						<TextInput
							value={field.attr ?? ""}
							onChange={(v) => updateField(idx, { attr: v || null })}
							placeholder="attr (optional)"
						/>
						<button
							type="button"
							onClick={() => removeField(idx)}
							className="text-fg-faint transition-colors hover:text-error"
							aria-label={`remove field ${field.name}`}
							disabled={value.item.fields.length <= 1}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={addField}
					className="inline-flex w-fit items-center gap-1 rounded-md border border-border bg-surface/60 px-2.5 py-1 font-mono text-[11px] text-fg-muted transition-colors hover:border-border-bright hover:text-foreground"
				>
					<Plus className="h-3 w-3" /> field
				</button>
				<FieldErrorMsg error={errors["item.fields"]} />
			</div>

			<label className="flex flex-col gap-1">
				<Label>dedupe key (must match a field name)</Label>
				<select
					value={value.item.dedupe_key}
					onChange={(e) => set((p) => ({ ...p, item: { ...p.item, dedupe_key: e.target.value } }))}
					className="w-full rounded-md border border-border bg-surface px-2.5 py-1.5 font-mono text-sm text-foreground focus:border-accent-emerald focus:outline-none md:w-auto"
				>
					{fieldNames.length === 0 && <option value="">(define a field first)</option>}
					{fieldNames.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>
				<FieldErrorMsg error={errors["item.dedupe_key"]} />
			</label>
		</section>
	);
}

function PaginationSection({ value, set }: { value: SourceConfig; set: Updater<SourceConfig> }) {
	return (
		<section className="flex flex-col gap-4">
			<SectionHeader hint="walk through multiple pages">pagination</SectionHeader>
			<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
				<label className="flex flex-col gap-1">
					<Label>next-page selector</Label>
					<TextInput
						value={value.pagination.next ?? ""}
						onChange={(v) =>
							set((p) => ({ ...p, pagination: { ...p.pagination, next: v || null } }))
						}
						placeholder="a.morelink::attr(href)"
					/>
				</label>
				<label className="flex flex-col gap-1">
					<Label>type</Label>
					<SelectorTypeToggle
						value={value.pagination.next_type}
						onChange={(v) => set((p) => ({ ...p, pagination: { ...p.pagination, next_type: v } }))}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<Label>max pages</Label>
					<NumberInput
						value={value.pagination.max_pages}
						onChange={(v) =>
							set((p) => ({ ...p, pagination: { ...p.pagination, max_pages: Math.max(1, v) } }))
						}
						min={1}
					/>
				</label>
			</div>
		</section>
	);
}

function HealthSection({ value, set }: { value: SourceConfig; set: Updater<SourceConfig> }) {
	return (
		<section className="flex flex-col gap-4">
			<SectionHeader hint="below these thresholds, the healer fires">health</SectionHeader>
			<div className="grid gap-4 md:grid-cols-2">
				<label className="flex flex-col gap-1">
					<Label>min items per run</Label>
					<NumberInput
						value={value.health.min_items}
						onChange={(v) =>
							set((p) => ({ ...p, health: { ...p.health, min_items: Math.max(0, v) } }))
						}
						min={0}
					/>
				</label>
				<label className="flex flex-col gap-1">
					<Label>max staleness</Label>
					<TextInput
						value={value.health.max_staleness}
						onChange={(v) => set((p) => ({ ...p, health: { ...p.health, max_staleness: v } }))}
						placeholder="24h"
					/>
				</label>
			</div>
		</section>
	);
}

// ── Main ───────────────────────────────────────────────────────────────────

export function FormBuilder({ value, onChange, fieldErrors = {}, disableNameEdit = false }: Props) {
	const set: Updater<SourceConfig> = (update) => onChange(update(value));
	return (
		<div
			className="flex flex-col gap-8 rounded-lg border border-border bg-surface/60 p-5"
			data-testid="form-builder"
		>
			<MetadataSection
				value={value}
				set={set}
				errors={fieldErrors}
				disableNameEdit={disableNameEdit}
			/>
			<ExecutionSection value={value} set={set} errors={fieldErrors} />
			<ItemSection value={value} set={set} errors={fieldErrors} />
			<PaginationSection value={value} set={set} />
			<HealthSection value={value} set={set} />
		</div>
	);
}
