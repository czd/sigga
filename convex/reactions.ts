import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type QueryCtx } from "./_generated/server";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

export type ReactionSummary = {
	reactionCount: number;
	reactedByMe: boolean;
	reactorNames: string[];
};

/**
 * Resolve the ❤️ state for a single journal entry: how many people reacted,
 * whether the current caller did, and the reactor display names (for the
 * accessible label / optional names popover). Journal entries only — there
 * are no reactions on appointments.
 */
export async function enrichReactions(
	ctx: QueryCtx,
	logEntryId: Id<"logEntries">,
	currentUserId: Id<"users">,
): Promise<ReactionSummary> {
	const rows = await ctx.db
		.query("reactions")
		.withIndex("by_entry", (q) => q.eq("logEntryId", logEntryId))
		.collect();
	const names = await Promise.all(
		rows.map(async (row) => {
			const user = await ctx.db.get(row.userId);
			return user?.name ?? user?.email ?? "—";
		}),
	);
	return {
		reactionCount: rows.length,
		reactedByMe: rows.some((row) => row.userId === currentUserId),
		reactorNames: names,
	};
}

/**
 * Toggle the current user's ❤️ on a journal entry. One row per person per
 * entry; tapping again removes it. No optimistic UI — the live subscription
 * re-renders (ux-patterns Pattern 14).
 */
export const toggle = mutation({
	args: { logEntryId: v.id("logEntries") },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const entry = await ctx.db.get(args.logEntryId);
		if (!entry) {
			throw new ConvexError("Færslan fannst ekki.");
		}
		const existing = await ctx.db
			.query("reactions")
			.withIndex("by_entry_and_user", (q) =>
				q.eq("logEntryId", args.logEntryId).eq("userId", userId),
			)
			.unique();
		if (existing) {
			await ctx.db.delete(existing._id);
		} else {
			await ctx.db.insert("reactions", {
				logEntryId: args.logEntryId,
				userId,
			});
		}
	},
});
