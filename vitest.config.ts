import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: "jsdom",
		pool: "forks",
		setupFiles: ["./test/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}", "test/**/*.test.{ts,tsx}"],
		exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**", "e2e/**"],
		globals: false,
		clearMocks: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"**/*.test.{ts,tsx}",
				"**/*.d.ts",
				// Next.js scaffolds — presentational, covered by build + e2e
				"src/app/**/layout.tsx",
				"src/app/**/loading.tsx",
				"src/app/**/error.tsx",
				"src/app/**/not-found.tsx",
				// Page-level Server Components — async RSCs aren't unit-testable;
				// we cover their pieces (components + data layer + actions) instead.
				"src/app/**/page.tsx",
				// Presentational layout chrome — covered through visual tests of
				// composed pages, not worth per-component unit assertions
				"src/components/terminal/AppNav.tsx",
				"src/components/terminal/PageFrame.tsx",
				"src/components/terminal/StatusBar.tsx",
				// Barrel / re-export only
				"src/lib/utils.ts",
			],
			thresholds: {
				lines: 80,
				statements: 80,
				functions: 70,
				branches: 75,
			},
		},
	},
});
