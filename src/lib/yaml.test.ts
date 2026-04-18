import { describe, expect, it } from "vitest";
import { parseSourceConfigYaml, stringifySourceConfig, tryParseYaml, YamlError } from "./yaml";

const VALID_YAML = `name: hackernews
description: Scrape HN
url: https://news.ycombinator.com
render: false
schedule: "0 */6 * * *"
rate_limit:
  rps: 1
item:
  container: "tr.athing"
  container_type: css
  fields:
    - { name: title, selector: "span.titleline > a::text", selector_type: css }
  dedupe_key: title
pagination:
  max_pages: 1
  next_type: css
health:
  min_items: 20
  max_staleness: "24h"
`;

describe("parseSourceConfigYaml", () => {
	it("parses a valid YAML into a typed SourceConfig", () => {
		const cfg = parseSourceConfigYaml(VALID_YAML);
		expect(cfg.name).toBe("hackernews");
		expect(cfg.render).toBe(false);
		expect(cfg.item.fields[0].name).toBe("title");
		expect(cfg.item.dedupe_key).toBe("title");
	});

	it("throws YamlError on a non-mapping root", () => {
		expect(() => parseSourceConfigYaml("- just\n- a list")).toThrow(YamlError);
	});

	it("throws YamlError when the schema rejects the shape", () => {
		expect(() => parseSourceConfigYaml("name: X\nurl: not-a-url")).toThrow(YamlError);
	});

	it("throws YamlError on syntactically invalid YAML", () => {
		expect(() => parseSourceConfigYaml(":::not yaml")).toThrow(YamlError);
	});
});

describe("stringifySourceConfig", () => {
	it("round-trips a parsed config", () => {
		const cfg = parseSourceConfigYaml(VALID_YAML);
		const serialized = stringifySourceConfig(cfg);
		const roundtrip = parseSourceConfigYaml(serialized);
		expect(roundtrip).toEqual(cfg);
	});
});

describe("tryParseYaml", () => {
	it("returns ok=true for valid yaml", () => {
		const r = tryParseYaml("a: 1");
		expect(r.ok).toBe(true);
	});
	it("returns ok=false with message for invalid yaml (unterminated flow)", () => {
		// Unclosed flow collection — the yaml lib's strict mode rejects this.
		const r = tryParseYaml("[1, 2, 3");
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
	});
});
