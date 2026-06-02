/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { createAuthedTest } from "./testHelpers.test";

const modules = import.meta.glob("./**/*.ts");

describe("journalReads.markSeen", () => {
	it("records a high-water mark and exposes it via receipts", async () => {
		const { authed, userId } = await createAuthedTest(modules);
		await authed.mutation(api.journalReads.markSeen, { seenThroughTime: 1000 });
		const receipts = await authed.query(api.journalReads.receipts, {});
		expect(receipts).toHaveLength(1);
		expect(receipts[0].userId).toBe(userId);
		expect(receipts[0].lastSeenTime).toBe(1000);
		expect(receipts[0].name).toBe("Helga");
	});

	it("is monotonic — a smaller seenThroughTime never regresses it", async () => {
		const { authed } = await createAuthedTest(modules);
		await authed.mutation(api.journalReads.markSeen, { seenThroughTime: 5000 });
		await authed.mutation(api.journalReads.markSeen, { seenThroughTime: 2000 });
		const receipts = await authed.query(api.journalReads.receipts, {});
		expect(receipts[0].lastSeenTime).toBe(5000);
	});

	it("advances forward on a newer seenThroughTime", async () => {
		const { authed } = await createAuthedTest(modules);
		await authed.mutation(api.journalReads.markSeen, { seenThroughTime: 1000 });
		await authed.mutation(api.journalReads.markSeen, { seenThroughTime: 9000 });
		const receipts = await authed.query(api.journalReads.receipts, {});
		expect(receipts[0].lastSeenTime).toBe(9000);
	});

	it("rejects unauthenticated callers", async () => {
		const { t } = await createAuthedTest(modules);
		await expect(
			t.mutation(api.journalReads.markSeen, { seenThroughTime: 1 }),
		).rejects.toThrow("Ekki innskráður");
		await expect(t.query(api.journalReads.receipts, {})).rejects.toThrow(
			"Ekki innskráður",
		);
	});
});
