import { parse as parseYAML, stringify as stringifyYAML } from "yaml";
import { type SourceConfig, SourceConfigSchema } from "./schemas";

export class YamlError extends Error {
	constructor(
		message: string,
		public cause?: unknown,
	) {
		super(message);
		this.name = "YamlError";
	}
}

export function parseSourceConfigYaml(text: string): SourceConfig {
	let data: unknown;
	try {
		data = parseYAML(text);
	} catch (e) {
		throw new YamlError(e instanceof Error ? e.message : "Invalid YAML", e);
	}
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		throw new YamlError("YAML must parse to a mapping (top-level object).");
	}
	const result = SourceConfigSchema.safeParse(data);
	if (!result.success) {
		const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
		throw new YamlError(issues.join("; "), result.error);
	}
	return result.data;
}

export function stringifySourceConfig(config: SourceConfig): string {
	return stringifyYAML(config, { sortMapEntries: false, lineWidth: 0 });
}

export function tryParseYaml(
	text: string,
): { ok: true; data: unknown } | { ok: false; error: string } {
	try {
		return { ok: true, data: parseYAML(text) };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : "Invalid YAML" };
	}
}
