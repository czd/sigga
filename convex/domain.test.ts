/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createAuthedTest } from "./testHelpers.test";

const modules = import.meta.glob("./**/*.ts");

// ---- entitlements.claim ---------------------------------------------------

describe("entitlements.claim", () => {
	it("takes ownership when the entitlement has no owner", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		const entitlementId = await authed.run(async (ctx) => {
			return await ctx.db.insert("entitlements", {
				title: "Örorkubætur",
				status: "not_applied",
				updatedAt: Date.now(),
				updatedBy: userId,
			});
		});

		await authed.mutation(api.entitlements.claim, { id: entitlementId });

		const after = await authed.run((ctx) => ctx.db.get(entitlementId));
		expect(after?.ownerId).toBe(userId);
	});

	it("is a no-op when the caller is already the owner", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		const entitlementId = await authed.run(async (ctx) => {
			return await ctx.db.insert("entitlements", {
				title: "Örorkubætur",
				status: "in_progress",
				ownerId: userId,
				updatedAt: 1,
				updatedBy: userId,
			});
		});

		await authed.mutation(api.entitlements.claim, { id: entitlementId });

		const after = await authed.run((ctx) => ctx.db.get(entitlementId));
		// updatedAt must not bump on the no-op branch.
		expect(after?.updatedAt).toBe(1);
		expect(after?.ownerId).toBe(userId);
	});

	it("rejects when someone else already owns it", async () => {
		const { userId: helgaId, authed: asHelga } =
			await createAuthedTest(modules);
		// Second user owns the row.
		const annaId = (await asHelga.run(async (ctx) => {
			return await ctx.db.insert("users", {
				name: "Anna",
				email: "anna@example.test",
			});
		})) as Id<"users">;
		const entitlementId = await asHelga.run(async (ctx) => {
			return await ctx.db.insert("entitlements", {
				title: "Heimilishjálp",
				status: "in_progress",
				ownerId: annaId,
				updatedAt: Date.now(),
				updatedBy: annaId,
			});
		});

		await expect(
			asHelga.mutation(api.entitlements.claim, { id: entitlementId }),
		).rejects.toThrow("Réttindi eru þegar í umsjón annars.");

		// Ownership unchanged.
		const after = await asHelga.run((ctx) => ctx.db.get(entitlementId));
		expect(after?.ownerId).toBe(annaId);
		// Silence unused-var warning — helgaId is here to document intent.
		expect(helgaId).not.toBe(annaId);
	});
});

// ---- logEntries.update (author-only) --------------------------------------

describe("logEntries.update", () => {
	it("lets the author edit their own entry", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		const entryId = await authed.run(async (ctx) => {
			return await ctx.db.insert("logEntries", {
				content: "Gaf lyf.",
				authorId: userId,
			});
		});

		await authed.mutation(api.logEntries.update, {
			id: entryId,
			content: "Gaf lyf og vatn.",
		});

		const after = await authed.run((ctx) => ctx.db.get(entryId));
		expect(after?.content).toBe("Gaf lyf og vatn.");
		expect(after?.editedAt).toBeGreaterThan(0);
	});

	it("rejects edits from anyone who isn't the author", async () => {
		const { userId: helgaId, authed: asHelga } =
			await createAuthedTest(modules);
		const annaId = (await asHelga.run(async (ctx) => {
			return await ctx.db.insert("users", {
				name: "Anna",
				email: "anna@example.test",
			});
		})) as Id<"users">;
		const entryId = await asHelga.run(async (ctx) => {
			return await ctx.db.insert("logEntries", {
				content: "Anna wrote this.",
				authorId: annaId,
			});
		});

		await expect(
			asHelga.mutation(api.logEntries.update, {
				id: entryId,
				content: "Helga hacked this.",
			}),
		).rejects.toThrow("Þú getur aðeins breytt þínum eigin færslum.");
		expect(helgaId).not.toBe(annaId);
	});

	it("rejects empty content", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		const entryId = await authed.run(async (ctx) => {
			return await ctx.db.insert("logEntries", {
				content: "Original.",
				authorId: userId,
			});
		});

		await expect(
			authed.mutation(api.logEntries.update, {
				id: entryId,
				content: "   ",
			}),
		).rejects.toThrow("Færslan má ekki vera tóm.");
	});
});

// ---- recurringSeries.ensureNextOccurrences --------------------------------

describe("recurringSeries.ensureNextOccurrences", () => {
	it("creates exactly one upcoming appointment per active series", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		await authed.run(async (ctx) => {
			// Active Mon/Wed/Fri series
			await ctx.db.insert("recurringSeries", {
				title: "Virkni og vellíðan",
				daysOfWeek: [1, 3, 5],
				timeOfDay: "10:00",
				isActive: true,
				createdBy: userId,
				updatedAt: Date.now(),
				updatedBy: userId,
			});
			// Paused series — must not materialise.
			await ctx.db.insert("recurringSeries", {
				title: "Paused",
				daysOfWeek: [2],
				timeOfDay: "09:00",
				isActive: false,
				createdBy: userId,
				updatedAt: Date.now(),
				updatedBy: userId,
			});
		});

		await authed.mutation(internal.recurringSeries.ensureNextOccurrences, {});

		const appts = await authed.run((ctx) =>
			ctx.db.query("appointments").collect(),
		);
		expect(appts).toHaveLength(1);
		expect(appts[0].title).toBe("Virkni og vellíðan");
		expect(appts[0].status).toBe("upcoming");
		expect(appts[0].startTime).toBeGreaterThan(Date.now());
	});

	it("is idempotent — running twice does not double-materialise", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		await authed.run(async (ctx) => {
			await ctx.db.insert("recurringSeries", {
				title: "Kaffi",
				daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
				timeOfDay: "08:00",
				isActive: true,
				createdBy: userId,
				updatedAt: Date.now(),
				updatedBy: userId,
			});
		});

		await authed.mutation(internal.recurringSeries.ensureNextOccurrences, {});
		await authed.mutation(internal.recurringSeries.ensureNextOccurrences, {});

		const appts = await authed.run((ctx) =>
			ctx.db.query("appointments").collect(),
		);
		expect(appts).toHaveLength(1);
	});
});

// ---- backup.weeklyExport --------------------------------------------------

describe("backup.weeklyExport", () => {
	it("snapshots every app table and records a backups row", async () => {
		const { userId, authed } = await createAuthedTest(modules);
		await authed.run(async (ctx) => {
			await ctx.db.insert("contacts", {
				category: "family",
				name: "Sigga",
			});
			await ctx.db.insert("logEntries", {
				content: "seed",
				authorId: userId,
			});
		});

		const result = await authed.action(internal.backup.weeklyExport, {});
		expect(result.size).toBeGreaterThan(0);

		const rows = await authed.run((ctx) => ctx.db.query("backups").collect());
		expect(rows).toHaveLength(1);
		expect(rows[0].storageId).toBe(result.storageId);
	});

	it("keeps only the 4 most recent backups", async () => {
		const { authed } = await createAuthedTest(modules);
		for (let i = 0; i < 6; i++) {
			await authed.action(internal.backup.weeklyExport, {});
		}
		const rows = await authed.run((ctx) => ctx.db.query("backups").collect());
		expect(rows).toHaveLength(4);
	});
});
