/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("seed.seedPreview", () => {
	it("seeds an empty backend with a login code, members, and content", async () => {
		const t = convexTest(schema, modules);

		const result = await t.mutation(internal.seed.seedPreview, {});
		expect(result).toEqual({ seeded: true, code: "demo-2468" });

		const { users, codes, entries, appts, reads } = await t.run(
			async (ctx) => ({
				users: await ctx.db.query("users").collect(),
				codes: await ctx.db.query("accessCodes").collect(),
				entries: await ctx.db.query("logEntries").collect(),
				appts: await ctx.db.query("appointments").collect(),
				reads: await ctx.db.query("journalReads").collect(),
			}),
		);

		expect(users).toHaveLength(2);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toMatchObject({ code: "demo-2468", isActive: true });
		expect(entries.length).toBeGreaterThanOrEqual(3);
		expect(appts).toHaveLength(1);
		// Read-receipt state for both sample members → "seen by" renders.
		expect(reads).toHaveLength(2);
	});

	it("refuses on a non-empty backend (prod-safety) and is idempotent", async () => {
		const t = convexTest(schema, modules);
		await t.run((ctx) => ctx.db.insert("users", { name: "Existing" }));

		const result = await t.mutation(internal.seed.seedPreview, {});
		expect(result).toEqual({ seeded: false, reason: "backend not empty" });

		const codes = await t.run((ctx) => ctx.db.query("accessCodes").collect());
		expect(codes).toHaveLength(0);
	});
});
