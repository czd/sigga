import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

type LogItem = {
	kind: "log";
	id: Id<"logEntries">;
	ts: number;
	authorName: string;
	preview: string;
};
type AppointmentItem = {
	kind: "appointment";
	id: Id<"appointments">;
	ts: number;
	title: string;
	startTime: number;
	createdByName: string;
};
type DocumentItem = {
	kind: "document";
	id: Id<"documents">;
	ts: number;
	fileName: string;
	addedByName: string;
};
type EntitlementItem = {
	kind: "entitlement_status";
	id: Id<"entitlements">;
	ts: number;
	title: string;
	newStatus: string;
	updatedByName: string;
};
type ActivityItem = LogItem | AppointmentItem | DocumentItem | EntitlementItem;

export const sinceLastVisit = query({
	args: { cursorMs: v.number(), limit: v.optional(v.number()) },
	handler: async (ctx, { cursorMs, limit = 20 }): Promise<ActivityItem[]> => {
		await requireAuth(ctx);

		const logs = await ctx.db
			.query("logEntries")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();
		const appointments = await ctx.db
			.query("appointments")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();
		const documents = await ctx.db
			.query("documents")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();
		const entitlements = await ctx.db
			.query("entitlements")
			.filter((q) => q.gt(q.field("updatedAt"), cursorMs))
			.collect();

		async function nameOf(userId: Id<"users"> | undefined): Promise<string> {
			if (!userId) return "—";
			const user = await ctx.db.get(userId);
			return user?.name ?? user?.email ?? "—";
		}

		const logItems: LogItem[] = await Promise.all(
			logs.map(async (l) => ({
				kind: "log" as const,
				id: l._id,
				ts: l._creationTime,
				authorName: await nameOf(l.authorId),
				preview: l.content.slice(0, 80),
			})),
		);

		const appointmentItems: AppointmentItem[] = await Promise.all(
			appointments.map(async (a) => ({
				kind: "appointment" as const,
				id: a._id,
				ts: a._creationTime,
				title: a.title,
				startTime: a.startTime,
				createdByName: await nameOf(a.createdBy),
			})),
		);

		const documentItems: DocumentItem[] = await Promise.all(
			documents.map(async (d) => ({
				kind: "document" as const,
				id: d._id,
				ts: d._creationTime,
				fileName: d.fileName,
				addedByName: await nameOf(d.addedBy),
			})),
		);

		const entitlementItems: EntitlementItem[] = await Promise.all(
			entitlements.map(async (e) => ({
				kind: "entitlement_status" as const,
				id: e._id,
				ts: e.updatedAt,
				title: e.title,
				newStatus: e.status,
				updatedByName: await nameOf(e.updatedBy),
			})),
		);

		const all: ActivityItem[] = [
			...logItems,
			...appointmentItems,
			...documentItems,
			...entitlementItems,
		];
		return all.sort((a, b) => b.ts - a.ts).slice(0, limit);
	},
});

export const unreadLogCount = query({
	args: { cursorMs: v.number() },
	handler: async (ctx, { cursorMs }): Promise<number> => {
		await requireAuth(ctx);
		const rows = await ctx.db
			.query("logEntries")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();
		return rows.length;
	},
});
