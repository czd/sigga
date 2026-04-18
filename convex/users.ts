import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";

type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

export const me = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (userId === null) {
			return null;
		}
		return await ctx.db.get(userId);
	},
});

export const list = query({
	args: {},
	handler: async (ctx): Promise<UserSummary[]> => {
		await requireAuth(ctx);
		const users = await ctx.db.query("users").collect();
		return users.map((user) => ({
			_id: user._id,
			name: user.name ?? null,
			email: user.email ?? null,
			image: user.image ?? null,
		}));
	},
});

export const attentionCounts = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		const now = Date.now();
		const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

		const entitlements = await ctx.db
			.query("entitlements")
			.filter((q) =>
				q.or(
					q.eq(q.field("status"), "not_applied"),
					q.eq(q.field("status"), "in_progress"),
				),
			)
			.collect();
		const unownedEntitlements = entitlements.filter((r) => !r.ownerId).length;

		const appointments = await ctx.db
			.query("appointments")
			.withIndex("by_status_and_startTime", (q) =>
				q.eq("status", "upcoming").gte("startTime", now),
			)
			.collect();
		const unassignedDrivers = appointments.filter(
			(a) => a.startTime < sevenDays && !a.driverId,
		).length;

		return {
			dashboard: unownedEntitlements + unassignedDrivers,
			care: 0, // filled by activity.unreadLogCount in the Sidebar
			paperwork: unownedEntitlements,
		};
	},
});
