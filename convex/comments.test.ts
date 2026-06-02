/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { createAuthedTest } from "./testHelpers.test";

const modules = import.meta.glob("./**/*.ts");

describe("comments on journal entries", () => {
	it("adds a comment and surfaces it in the thread + entry commentCount", async () => {
		const { authed } = await createAuthedTest(modules);
		const entryId = await authed.mutation(api.logEntries.add, {
			content: "Sigga svaf vel",
		});
		await authed.mutation(api.comments.add, {
			targetType: "logEntry",
			targetId: entryId,
			content: "  Gott að heyra!  ",
		});

		const thread = await authed.query(api.comments.list, {
			targetType: "logEntry",
			targetId: entryId,
		});
		expect(thread).toHaveLength(1);
		expect(thread[0].content).toBe("Gott að heyra!"); // trimmed
		expect(thread[0].isMine).toBe(true);
		expect(thread[0].author?.name).toBe("Helga");

		const entry = await authed.query(api.logEntries.get, { id: entryId });
		expect(entry?.commentCount).toBe(1);
	});

	it("rejects empty content", async () => {
		const { authed } = await createAuthedTest(modules);
		const entryId = await authed.mutation(api.logEntries.add, { content: "x" });
		await expect(
			authed.mutation(api.comments.add, {
				targetType: "logEntry",
				targetId: entryId,
				content: "   ",
			}),
		).rejects.toThrow("Athugasemd má ekki vera tóm.");
	});
});

describe("comment edit / delete author guards", () => {
	it("lets the author edit and stamps editedAt", async () => {
		const { authed } = await createAuthedTest(modules);
		const entryId = await authed.mutation(api.logEntries.add, { content: "x" });
		const commentId = await authed.mutation(api.comments.add, {
			targetType: "logEntry",
			targetId: entryId,
			content: "fyrsta",
		});
		await authed.mutation(api.comments.update, {
			id: commentId,
			content: "leiðrétt",
		});
		const thread = await authed.query(api.comments.list, {
			targetType: "logEntry",
			targetId: entryId,
		});
		expect(thread[0].content).toBe("leiðrétt");
		expect(thread[0].editedAt).toBeTypeOf("number");
	});

	it("blocks a non-author from editing or deleting", async () => {
		const { t, authed: helga } = await createAuthedTest(modules);
		const entryId = await helga.mutation(api.logEntries.add, { content: "x" });
		const commentId = await helga.mutation(api.comments.add, {
			targetType: "logEntry",
			targetId: entryId,
			content: "Helga sagði",
		});

		const annaId = await t.run((ctx) =>
			ctx.db.insert("users", { name: "Anna", email: "anna@example.test" }),
		);
		const anna = t.withIdentity({ subject: annaId });
		await expect(
			anna.mutation(api.comments.update, { id: commentId, content: "hakk" }),
		).rejects.toThrow("þínum eigin");
		await expect(
			anna.mutation(api.comments.remove, { id: commentId }),
		).rejects.toThrow("þínum eigin");
	});
});

describe("comments on appointments + cascade delete", () => {
	it("attaches a comment to an appointment and counts it", async () => {
		const { authed } = await createAuthedTest(modules);
		const apptId = await authed.mutation(api.appointments.create, {
			title: "Tannlæknir",
			startTime: Date.now() + 86_400_000,
		});
		await authed.mutation(api.comments.add, {
			targetType: "appointment",
			targetId: apptId,
			content: "Ég sæki hana 13:30",
		});
		const appt = await authed.query(api.appointments.get, { id: apptId });
		expect(appt?.commentCount).toBe(1);
	});

	it("deletes the appointment's comments when the appointment is removed", async () => {
		const { t, authed } = await createAuthedTest(modules);
		const apptId = await authed.mutation(api.appointments.create, {
			title: "Blóðprufa",
			startTime: Date.now() + 86_400_000,
		});
		await authed.mutation(api.comments.add, {
			targetType: "appointment",
			targetId: apptId,
			content: "athugasemd",
		});
		await authed.mutation(api.appointments.remove, { id: apptId });
		const orphans = await t.run((ctx) => ctx.db.query("comments").collect());
		expect(orphans).toHaveLength(0);
	});
});
