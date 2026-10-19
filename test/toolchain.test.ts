// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * Toolchain invariants that otherwise surface only as an inscrutable build failure (spec 08).
 *
 * `next build` verifies its TypeScript setup by resolving `typescript/lib/typescript.js`.
 * TypeScript 7 is the Go rewrite and ships no such file, so a `^7` bump fails as "you do not
 * have the required package(s) installed" (Dependabot PR #13), which reads as a missing
 * dependency. The constraint is stated here so it fails by name.
 */

const repoRoot = resolve(__dirname, "..");

function read(relativePath: string): string {
	return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

type PackageJson = {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
};

const pkg = JSON.parse(read("package.json")) as PackageJson;

/** Leading major from an npm range like `^5`, `~5.9.3`, `5.x`, `>=5 <6`. */
function majorOf(range: string): number {
	const match = /(\d+)/.exec(range);
	if (!match) throw new Error(`cannot read a major version from ${range}`);
	return Number(match[1]);
}

describe("toolchain compatibility", () => {
	it("reads the major of the range shapes package.json uses", () => {
		expect(majorOf("^5")).toBe(5);
		expect(majorOf("~5.9.3")).toBe(5);
		expect(majorOf("^7.0.2")).toBe(7);
		expect(majorOf(">=20 <21")).toBe(20);
		expect(() => majorOf("latest")).toThrow(/cannot read a major/);
	});

	it("keeps typescript on a major whose lib/typescript.js next build can resolve", () => {
		const range = pkg.devDependencies.typescript;
		expect(range, "typescript must stay a declared devDependency").toBeTruthy();
		expect(
			majorOf(range),
			`typescript ${range} is not consumable by next ${pkg.dependencies.next}: next build ` +
				"resolves typescript/lib/typescript.js, which TypeScript 7+ (the Go rewrite) does not ship.",
		).toBeLessThan(7);
	});

	it("keeps @types/node at or below the Node major ci.yml installs", () => {
		const workflow = read(".github/workflows/ci.yml");
		const pinned = [...workflow.matchAll(/node-version:\s*(\d+)/g)].map((m) => Number(m[1]));
		expect(pinned.length, "ci.yml must pin node-version").toBeGreaterThan(0);
		expect(new Set(pinned).size, `ci.yml pins conflicting node versions: ${pinned}`).toBe(1);
		expect(majorOf(pkg.devDependencies["@types/node"])).toBeLessThanOrEqual(pinned[0]);
	});

	it("tells Dependabot never to propose typescript 7 or later", () => {
		type Ignore = { "dependency-name": string; versions?: string[] };
		type Update = { "package-ecosystem": string; ignore?: Ignore[] };
		const config = parse(read(".github/dependabot.yml")) as { updates: Update[] };
		const npm = config.updates.find((u) => u["package-ecosystem"] === "npm");
		expect(npm, "dependabot.yml must watch npm").toBeDefined();
		const rule = npm?.ignore?.find((i) => i["dependency-name"] === "typescript");
		expect(rule?.versions).toContain(">=7");
	});
});
