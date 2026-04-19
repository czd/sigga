/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// CLAUDE.md contract:
//   "Every mutation AND every data-returning query calls requireAuth(ctx)
//    and throws ConvexError('Ekki innskráður') if null."
//
// Documented exceptions (soft-return instead of throw):
//   - users.me → null for unauthenticated callers
//   - events.isAdmin → false for unauthenticated callers
//
// This file's job is to exercise every public entrypoint without an
// identity and confirm we get the expected throw (or the documented
// soft-return).

const modules = import.meta.glob("./**/*.ts");

type Case = {
	label: string;
	// Runs the query/mutation without an identity and returns a promise.
	// Rejections are expected for the throw group; the soft-return group
	// resolves to a specific value.
	run: (t: ReturnType<typeof convexTest>) => Promise<unknown>;
};

// Scope note:
//   Argument validators fire *before* handlers, so mutations whose only args
//   are `id`/`storageId` can't be called with a fake ID — validation rejects
//   before the auth guard runs. To keep these tests fast and hermetic, we
//   test at least one query and (where applicable) one mutation per module
//   that doesn't require a pre-existing ID. The cross-module requireAuth
//   pattern is enforced by the shared helper, so proving it fires for each
//   *module*'s entrypoints is sufficient; we don't need to enumerate every
//   overload within a module.

const THROWING_QUERIES: Case[] = [
	{
		label: "appointments.upcoming",
		run: (t) => t.query(api.appointments.upcoming, {}),
	},
	{
		label: "appointments.past",
		run: (t) => t.query(api.appointments.past, {}),
	},
	{
		label: "appointments.byWeek",
		run: (t) => t.query(api.appointments.byWeek, { weekStartMs: 0 }),
	},
	{
		label: "appointments.byRange",
		run: (t) =>
			t.query(api.appointments.byRange, { startMs: 0, endMs: 86_400_000 }),
	},
	{
		label: "contacts.list",
		run: (t) => t.query(api.contacts.list, {}),
	},
	{
		label: "documents.list",
		run: (t) => t.query(api.documents.list, {}),
	},
	{
		label: "entitlements.list",
		run: (t) => t.query(api.entitlements.list, {}),
	},
	{
		label: "logEntries.recent",
		run: (t) => t.query(api.logEntries.recent, {}),
	},
	{
		label: "logEntries.list",
		run: (t) =>
			t.query(api.logEntries.list, {
				paginationOpts: { numItems: 20, cursor: null },
			}),
	},
	{
		label: "medications.list",
		run: (t) => t.query(api.medications.list, {}),
	},
	{
		label: "recurringSeries.list",
		run: (t) => t.query(api.recurringSeries.list, {}),
	},
	{
		label: "users.list",
		run: (t) => t.query(api.users.list, {}),
	},
	{
		label: "users.attentionCounts",
		run: (t) => t.query(api.users.attentionCounts, {}),
	},
	{
		label: "activity.unreadLogCount",
		run: (t) => t.query(api.activity.unreadLogCount, { cursorMs: 0 }),
	},
	{
		label: "events.usage",
		run: (t) => t.query(api.events.usage, {}),
	},
	{
		label: "events.recentErrors",
		run: (t) => t.query(api.events.recentErrors, {}),
	},
];

const THROWING_MUTATIONS: Case[] = [
	{
		label: "appointments.create",
		run: (t) =>
			t.mutation(api.appointments.create, { title: "x", startTime: 0 }),
	},
	{
		label: "contacts.create",
		run: (t) =>
			t.mutation(api.contacts.create, { category: "other", name: "x" }),
	},
	{
		label: "documents.generateUploadUrl",
		run: (t) => t.mutation(api.documents.generateUploadUrl, {}),
	},
	{
		label: "entitlements.create",
		run: (t) =>
			t.mutation(api.entitlements.create, {
				title: "x",
				status: "not_applied",
			}),
	},
	{
		label: "logEntries.add",
		run: (t) => t.mutation(api.logEntries.add, { content: "x" }),
	},
	{
		label: "medications.create",
		run: (t) =>
			t.mutation(api.medications.create, {
				name: "x",
				dose: "x",
				schedule: "x",
			}),
	},
	{
		label: "recurringSeries.create",
		run: (t) =>
			t.mutation(api.recurringSeries.create, {
				title: "x",
				daysOfWeek: [1],
				timeOfDay: "09:00",
			}),
	},
	{
		label: "events.log",
		run: (t) => t.mutation(api.events.log, { type: "app_open" }),
	},
];

describe("auth guards — throwing entrypoints reject unauthenticated callers", () => {
	for (const c of THROWING_QUERIES) {
		it(`query ${c.label}`, async () => {
			const t = convexTest(schema, modules);
			await expect(c.run(t)).rejects.toThrow("Ekki innskráður");
		});
	}

	for (const c of THROWING_MUTATIONS) {
		it(`mutation ${c.label}`, async () => {
			const t = convexTest(schema, modules);
			await expect(c.run(t)).rejects.toThrow("Ekki innskráður");
		});
	}
});

describe("soft-return auth exceptions (documented in CLAUDE.md)", () => {
	it("users.me returns null for unauthenticated callers", async () => {
		const t = convexTest(schema, modules);
		await expect(t.query(api.users.me, {})).resolves.toBeNull();
	});

	it("events.isAdmin returns false for unauthenticated callers", async () => {
		const t = convexTest(schema, modules);
		await expect(t.query(api.events.isAdmin, {})).resolves.toBe(false);
	});
});
