/// <reference types="vite/client" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// Convex functions need the edge runtime; utilities are fine there too.
		environment: "edge-runtime",
		server: {
			deps: {
				// convex-test reaches into the Convex bundle; inline so vitest
				// doesn't try to externalise it.
				inline: ["convex-test"],
			},
		},
		include: ["convex/**/*.test.ts", "src/**/*.test.ts", "src/**/*.test.tsx"],
		// testHelpers.test.ts lives in convex/ so the Convex bundler's
		// "multi-dot basename" rule skips it (it imports convex-test, a
		// devDependency). Vitest would otherwise fail it as a test file with
		// no test suite.
		exclude: ["**/node_modules/**", "convex/testHelpers.test.ts"],
	},
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,
		},
	},
});
