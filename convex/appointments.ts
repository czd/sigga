import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { ensureNextOccurrence } from "./recurringSeries";

const statusValidator = v.union(
	v.literal("upcoming"),
	v.literal("completed"),
	v.literal("cancelled"),
);

type AppointmentDoc = Doc<"appointments">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type AppointmentWithDriver = AppointmentDoc & { driver: UserSummary | null };

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

async function withDriver(
	ctx: QueryCtx,
	appointment: AppointmentDoc,
): Promise<AppointmentWithDriver> {
	return {
		...appointment,
		driver: await resolveUser(ctx, appointment.driverId),
	};
}

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

export const list = query({
	args: {
		status: v.optional(statusValidator),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const limit = args.limit ?? 100;
		const status = args.status;
		if (status) {
			const rows = await ctx.db
				.query("appointments")
				.withIndex("by_status_and_startTime", (q) => q.eq("status", status))
				.order("asc")
				.take(limit);
			return Promise.all(rows.map((row) => withDriver(ctx, row)));
		}
		const rows = await ctx.db
			.query("appointments")
			.withIndex("by_startTime")
			.order("asc")
			.take(limit);
		return Promise.all(rows.map((row) => withDriver(ctx, row)));
	},
});

export const upcoming = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const now = Date.now();
		const rows = await ctx.db
			.query("appointments")
			.withIndex("by_status_and_startTime", (q) =>
				q.eq("status", "upcoming").gte("startTime", now),
			)
			.order("asc")
			.take(args.limit ?? 3);
		return Promise.all(rows.map((row) => withDriver(ctx, row)));
	},
});

export const past = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const now = Date.now();
		const rows = await ctx.db
			.query("appointments")
			.withIndex("by_startTime", (q) => q.lt("startTime", now))
			.order("desc")
			.take(args.limit ?? 50);
		return Promise.all(rows.map((row) => withDriver(ctx, row)));
	},
});

export const get = query({
	args: { id: v.id("appointments") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const appointment = await ctx.db.get(args.id);
		if (!appointment) return null;
		return withDriver(ctx, appointment);
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		startTime: v.number(),
		endTime: v.optional(v.number()),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		driverId: v.optional(v.id("users")),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const now = Date.now();
		return await ctx.db.insert("appointments", {
			title: args.title,
			startTime: args.startTime,
			endTime: args.endTime,
			location: args.location,
			notes: args.notes,
			driverId: args.driverId,
			status: "upcoming",
			createdBy: userId,
			updatedAt: now,
			updatedBy: userId,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("appointments"),
		title: v.optional(v.string()),
		startTime: v.optional(v.number()),
		endTime: v.optional(v.union(v.number(), v.null())),
		location: v.optional(v.union(v.string(), v.null())),
		notes: v.optional(v.union(v.string(), v.null())),
		driverId: v.optional(v.union(v.id("users"), v.null())),
		status: v.optional(statusValidator),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const { id, ...rest } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new ConvexError("Tíminn fannst ekki.");
		}
		const patch: Partial<AppointmentDoc> = {
			updatedAt: Date.now(),
			updatedBy: userId,
		};
		if (rest.title !== undefined) patch.title = rest.title;
		if (rest.startTime !== undefined) patch.startTime = rest.startTime;
		if (rest.endTime !== undefined) {
			patch.endTime = rest.endTime ?? undefined;
		}
		if (rest.location !== undefined) {
			patch.location = rest.location ?? undefined;
		}
		if (rest.notes !== undefined) {
			patch.notes = rest.notes ?? undefined;
		}
		if (rest.driverId !== undefined) {
			patch.driverId = rest.driverId ?? undefined;
		}
		if (rest.status !== undefined) patch.status = rest.status;
		await ctx.db.patch(id, patch);

		const newStatus = rest.status ?? existing.status;
		if (
			existing.seriesId &&
			existing.status === "upcoming" &&
			newStatus !== "upcoming"
		) {
			await ensureNextOccurrence(ctx, existing.seriesId);
		}
	},
});

export const remove = mutation({
	args: { id: v.id("appointments") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;
		const seriesId = existing.seriesId;
		const wasUpcoming = existing.status === "upcoming";
		await ctx.db.delete(args.id);
		if (seriesId && wasUpcoming) {
			await ensureNextOccurrence(ctx, seriesId);
		}
	},
});

export const volunteerToDrive = mutation({
	args: { id: v.id("appointments") },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Tíminn fannst ekki.");
		}
		await ctx.db.patch(args.id, {
			driverId: userId,
			updatedAt: Date.now(),
			updatedBy: userId,
		});
	},
});
