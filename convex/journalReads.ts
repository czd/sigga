import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

export type JournalReceipt = {
	userId: Id<"users">;
	name: string | null;
	image: string | null;
	lastSeenTime: number;
};

/**
 * Advance the caller's journal read high-water mark. Called by the Dagbók
 * view with the newest entry's `_creationTime` when the feed renders.
 * Monotonic — never moves backward, so a stale tab can't regress receipts.
 */
export const markSeen = mutation({
	args: { seenThroughTime: v.number() },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db
			.query("journalReads")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.unique();
		if (!existing) {
			await ctx.db.insert("journalReads", {
				userId,
				lastSeenTime: args.seenThroughTime,
			});
			return;
		}
		if (args.seenThroughTime > existing.lastSeenTime) {
			await ctx.db.patch(existing._id, { lastSeenTime: args.seenThroughTime });
		}
	},
});

/**
 * Every family member's read high-water mark. The Dagbók feed maps each
 * user to their "landing entry" (the newest entry with
 * `_creationTime <= lastSeenTime`) to render the Messenger-style "seen by"
 * avatar clusters.
 */
export const receipts = query({
	args: {},
	handler: async (ctx): Promise<JournalReceipt[]> => {
		await requireAuth(ctx);
		const rows = await ctx.db.query("journalReads").collect();
		return Promise.all(
			rows.map(async (row) => {
				const user = await ctx.db.get(row.userId);
				return {
					userId: row.userId,
					name: user?.name ?? null,
					image: user?.image ?? null,
					lastSeenTime: row.lastSeenTime,
				};
			}),
		);
	},
});
