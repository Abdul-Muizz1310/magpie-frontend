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
		exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
		globals: false,
		clearMocks: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"**/*.test.{ts,tsx}",
				"**/*.d.ts",
				// Root layout: <html>/fonts/metadata shell that jsdom can't meaningfully
				// exercise. Everything else — including page.tsx composition logic,
				// error/not-found/loading boundaries — is covered by route-level tests.
				"src/app/**/layout.tsx",
				// Presentational nav/status chrome — pure composition, exercised
				// incidentally when route-level tests render PageFrame.
				"src/components/terminal/AppNav.tsx",
				"src/components/terminal/PageFrame.tsx",
				"src/components/terminal/StatusBar.tsx",
				// The Next.js proxy (middleware) runs only in the Next runtime; its
				// core logic (verifySessionToken) is covered via lib/auth.test.ts.
				"src/proxy.ts",
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
