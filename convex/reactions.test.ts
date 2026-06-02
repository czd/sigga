/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { createAuthedTest } from "./testHelpers.test";

const modules = import.meta.glob("./**/*.ts");

describe("reactions.toggle", () => {
	it("adds the heart on first toggle, removes it on second", async () => {
		const { t, authed } = await createAuthedTest(modules);
		const entryId = await authed.mutation(api.logEntries.add, {
			content: "Sigga borðaði vel í dag",
		});

		await authed.mutation(api.reactions.toggle, { logEntryId: entryId });
		let entry = await authed.query(api.logEntries.get, { id: entryId });
		expect(entry?.reactionCount).toBe(1);
		expect(entry?.reactedByMe).toBe(true);
		expect(entry?.reactorNames).toContain("Helga");

		await authed.mutation(api.reactions.toggle, { logEntryId: entryId });
		entry = await authed.query(api.logEntries.get, { id: entryId });
		expect(entry?.reactionCount).toBe(0);
		expect(entry?.reactedByMe).toBe(false);

		// No orphan rows left behind.
		const rows = await t.run((ctx) => ctx.db.query("reactions").collect());
		expect(rows).toHaveLength(0);
	});

	it("counts other people's hearts without marking reactedByMe", async () => {
		const { t, authed: helga } = await createAuthedTest(modules);
		const entryId = await helga.mutation(api.logEntries.add, {
			content: "Tannlæknir á morgun",
		});

		const annaId = await t.run((ctx) =>
			ctx.db.insert("users", { name: "Anna", email: "anna@example.test" }),
		);
		const anna = t.withIdentity({ subject: annaId });
		await anna.mutation(api.reactions.toggle, { logEntryId: entryId });

		const fromHelga = await helga.query(api.logEntries.get, { id: entryId });
		expect(fromHelga?.reactionCount).toBe(1);
		expect(fromHelga?.reactedByMe).toBe(false);
		expect(fromHelga?.reactorNames).toEqual(["Anna"]);
	});

	it("rejects a heart on a missing entry", async () => {
		const { t, authed } = await createAuthedTest(modules);
		// Create then delete a real id so the validator passes but the doc is gone.
		const entryId = await authed.mutation(api.logEntries.add, { content: "x" });
		await t.run((ctx) => ctx.db.delete(entryId));
		await expect(
			authed.mutation(api.reactions.toggle, { logEntryId: entryId }),
		).rejects.toThrow("Færslan fannst ekki.");
	});

	it("rejects unauthenticated callers", async () => {
		const { t, authed } = await createAuthedTest(modules);
		const entryId = await authed.mutation(api.logEntries.add, { content: "x" });
		await expect(
			t.mutation(api.reactions.toggle, { logEntryId: entryId }),
		).rejects.toThrow("Ekki innskráður");
	});
});
