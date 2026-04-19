import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

type EventDoc = Doc<"events">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type EventWithUser = EventDoc & { user: UserSummary | null };
type UsageRow = {
	user: UserSummary;
	totalEvents: number;
	appOpens: number;
	pageViews: number;
	errors: number;
	lastActiveAt: number | null;
	firstSeenAt: number | null;
};

const EVENT_TYPE = v.union(
	v.literal("app_open"),
	v.literal("page_view"),
	v.literal("error"),
	v.literal("unhandled_rejection"),
	v.literal("client_log"),
);

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

function truncate(value: string | undefined, max: number): string | undefined {
	if (value === undefined) return undefined;
	return value.length > max ? value.slice(0, max) : value;
}

async function resolveUser(
	ctx: QueryCtx,
	userId: Id<"users"> | undefined,
): Promise<UserSummary | null> {
	if (!userId) return null;
	const user = await ctx.db.get(userId);
	if (!user) return null;
	return {
		_id: user._id,
		name: user.name ?? null,
		email: user.email ?? null,
		image: user.image ?? null,
	};
}

export const log = mutation({
	args: {
		type: EVENT_TYPE,
		path: v.optional(v.string()),
		message: v.optional(v.string()),
		stack: v.optional(v.string()),
		userAgent: v.optional(v.string()),
		metadata: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		await ctx.db.insert("events", {
			userId,
			type: args.type,
			path: truncate(args.path, 500),
			message: truncate(args.message, 2000),
			stack: truncate(args.stack, 8000),
			userAgent: truncate(args.userAgent, 500),
			metadata: truncate(args.metadata, 4000),
		});
	},
});

export const usage = query({
	args: { sinceDays: v.optional(v.number()) },
	handler: async (ctx, args): Promise<UsageRow[]> => {
		await requireAuth(ctx);
		const days = args.sinceDays ?? 30;
		const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

		const users = await ctx.db.query("users").collect();
		const rows: UsageRow[] = [];

		for (const user of users) {
			const events = await ctx.db
				.query("events")
				.withIndex("by_user_and_time", (q) =>
					q.eq("userId", user._id).gte("_creationTime", sinceMs),
				)
				.collect();

			let appOpens = 0;
			let pageViews = 0;
			let errors = 0;
			let lastActiveAt: number | null = null;
			let firstSeenAt: number | null = null;
			for (const e of events) {
				if (e.type === "app_open") appOpens++;
				else if (e.type === "page_view") pageViews++;
				else if (e.type === "error" || e.type === "unhandled_rejection")
					errors++;
				if (lastActiveAt === null || e._creationTime > lastActiveAt) {
					lastActiveAt = e._creationTime;
				}
				if (firstSeenAt === null || e._creationTime < firstSeenAt) {
					firstSeenAt = e._creationTime;
				}
			}

			rows.push({
				user: {
					_id: user._id,
					name: user.name ?? null,
					email: user.email ?? null,
					image: user.image ?? null,
				},
				totalEvents: events.length,
				appOpens,
				pageViews,
				errors,
				lastActiveAt,
				firstSeenAt,
			});
		}

		rows.sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0));
		return rows;
	},
});

export const recentErrors = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args): Promise<EventWithUser[]> => {
		await requireAuth(ctx);
		const errorEvents = await ctx.db
			.query("events")
			.withIndex("by_type_and_time", (q) => q.eq("type", "error"))
			.order("desc")
			.take(args.limit ?? 50);
		const rejectionEvents = await ctx.db
			.query("events")
			.withIndex("by_type_and_time", (q) => q.eq("type", "unhandled_rejection"))
			.order("desc")
			.take(args.limit ?? 50);
		const combined = [...errorEvents, ...rejectionEvents]
			.sort((a, b) => b._creationTime - a._creationTime)
			.slice(0, args.limit ?? 50);
		return Promise.all(
			combined.map(async (e) => ({
				...e,
				user: await resolveUser(ctx, e.userId),
			})),
		);
	},
});
