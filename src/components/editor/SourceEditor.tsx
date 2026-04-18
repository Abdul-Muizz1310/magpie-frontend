"use client";

import { FileCode, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ErrorAlert } from "@/components/shared/ErrorAlert";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { createSourceAction, updateSourceAction } from "@/lib/actions";
import type { PydanticIssue } from "@/lib/api";
import type { SourceConfig, SourceDetail } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { parseSourceConfigYaml, stringifySourceConfig, tryParseYaml } from "@/lib/yaml";
import { DEFAULT_CONFIG, FormBuilder } from "./FormBuilder";
import { YamlTextarea } from "./YamlTextarea";

type Mode = "yaml" | "form";

type Props = {
	initial?: SourceDetail;
	mode: "create" | "edit";
};

function issuesToFieldErrors(
	issues: ReadonlyArray<PydanticIssue> | undefined,
): Record<string, string> {
	const out: Record<string, string> = {};
	if (!issues) return out;
	for (const issue of issues) {
		// loc from FastAPI for a SourceConfig typically looks like:
		//   ["body", "config", "item", "fields", 0, "selector"]
		// or just ["name"] / ["url"]. We want the user-facing dotted path.
		const parts = issue.loc.filter((p) => p !== "body" && p !== "config" && p !== "yaml");
		const key = parts.map((p) => String(p)).join(".");
		if (key) out[key] = issue.msg;
		else out._root = issue.msg;
	}
	return out;
}

export function SourceEditor({ initial, mode }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [submitError, setSubmitError] = useState<{
		title: string;
		message: string;
		issues?: ReadonlyArray<PydanticIssue>;
	} | null>(null);
	const [toggleError, setToggleError] = useState<string | null>(null);
	const [activeMode, setActiveMode] = useState<Mode>(initial ? "yaml" : "form");

	const initialConfig = useMemo<SourceConfig>(() => {
		if (!initial) return DEFAULT_CONFIG;
		try {
			return parseSourceConfigYaml(initial.config_yaml);
		} catch {
			return DEFAULT_CONFIG;
		}
	}, [initial]);

	const [formConfig, setFormConfig] = useState<SourceConfig>(initialConfig);
	const [yamlText, setYamlText] = useState<string>(
		initial?.config_yaml ?? stringifySourceConfig(DEFAULT_CONFIG),
	);

	const fieldErrors = useMemo(() => issuesToFieldErrors(submitError?.issues), [submitError]);

	function switchMode(next: Mode) {
		setToggleError(null);
		if (next === activeMode) return;
		if (next === "yaml") {
			try {
				setYamlText(stringifySourceConfig(formConfig));
				setActiveMode("yaml");
			} catch (e) {
				setToggleError(e instanceof Error ? e.message : "Failed to serialize form to YAML");
			}
			return;
		}
		// form → need to parse YAML
		try {
			const parsed = parseSourceConfigYaml(yamlText);
			setFormConfig(parsed);
			setActiveMode("form");
		} catch (e) {
			setToggleError(
				e instanceof Error
					? e.message
					: "Cannot switch to form: YAML is invalid. Fix it first or start over.",
			);
		}
	}

	function buildSubmission(): { yaml?: string; config?: Record<string, unknown> } {
		if (activeMode === "yaml") {
			return { yaml: yamlText };
		}
		return { config: formConfig as unknown as Record<string, unknown> };
	}

	function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setSubmitError(null);

		// Pre-submit: quick client-side sanity check so obvious mistakes
		// don't require a backend round-trip.
		if (activeMode === "yaml") {
			const pre = tryParseYaml(yamlText);
			if (!pre.ok) {
				setSubmitError({ title: "YAML parse failed", message: pre.error });
				return;
			}
		}

		const body = buildSubmission();
		startTransition(async () => {
			const result =
				mode === "create"
					? await createSourceAction(body)
					: await updateSourceAction(initial?.name ?? "", body);
			if (result.ok) {
				router.push(`/sources/${result.data.name}`);
				router.refresh();
				return;
			}
			// Map known error shapes.
			const title =
				result.status === 409
					? "Conflict"
					: result.status === 422
						? "Validation failed"
						: "Request failed";
			setSubmitError({ title, message: result.message, issues: result.issues });
		});
	}

	return (
		<form onSubmit={onSubmit} className="flex flex-col gap-5">
			<TerminalWindow
				title={mode === "create" ? "new-source.yaml" : `${initial?.name}.yaml`}
				statusDot="emerald"
				statusLabel={activeMode}
			>
				<div className="flex flex-col gap-5">
					<div className="flex items-center justify-between gap-3">
						<div className="inline-flex rounded-md border border-border bg-surface/60 p-0.5 font-mono text-[11px]">
							{[
								{ k: "form" as const, label: "form" },
								{ k: "yaml" as const, label: "yaml" },
							].map((opt) => (
								<button
									key={opt.k}
									type="button"
									onClick={() => switchMode(opt.k)}
									className={cn(
										"rounded px-2.5 py-1 transition-colors",
										activeMode === opt.k
											? "bg-accent-emerald/15 text-accent-emerald"
											: "text-fg-muted hover:text-foreground",
									)}
								>
									{opt.label}
								</button>
							))}
						</div>
						<div className="flex items-center gap-2 font-mono text-[11px] text-fg-faint">
							<FileCode className="h-3.5 w-3.5" />
							SourceConfig schema · SSRF-guarded server-side
						</div>
					</div>

					{toggleError && (
						<div
							role="alert"
							className="rounded-lg border border-warning/30 bg-warning/5 p-3 font-mono text-xs text-warning"
						>
							<strong>Cannot switch mode:</strong> {toggleError}
						</div>
					)}

					{activeMode === "form" ? (
						<FormBuilder
							value={formConfig}
							onChange={setFormConfig}
							fieldErrors={fieldErrors}
							disableNameEdit={mode === "edit"}
						/>
					) : (
						<YamlTextarea value={yamlText} onChange={setYamlText} />
					)}

					{submitError && (
						<ErrorAlert title={submitError.title}>
							<div className="flex flex-col gap-2">
								<span>{submitError.message}</span>
								{submitError.issues && submitError.issues.length > 0 && (
									<ul className="flex flex-col gap-0.5 text-[11px]">
										{submitError.issues.map((issue, idx) => (
											<li key={idx}>
												<span className="text-accent-emerald">
													{issue.loc.filter((p) => p !== "body").join(".") || "(root)"}
												</span>
												: {issue.msg}
											</li>
										))}
									</ul>
								)}
							</div>
						</ErrorAlert>
					)}
				</div>
			</TerminalWindow>

			<div className="flex items-center justify-between gap-3">
				<p className="font-mono text-[11px] text-fg-faint">
					{mode === "create"
						? "On submit, POSTs to /api/sources with origin=api. Heals patch the DB, not GitHub."
						: "On submit, PATCH /api/sources/{name}. File-origin sources are read-only."}
				</p>
				<button
					type="submit"
					disabled={isPending}
					className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/40 bg-accent-emerald/10 px-4 py-2 font-mono text-xs text-accent-emerald transition-colors hover:bg-accent-emerald/20 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isPending ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" />
					) : (
						<Save className="h-3.5 w-3.5" />
					)}
					{mode === "create" ? "create source" : "save changes"}
				</button>
			</div>
		</form>
	);
}
