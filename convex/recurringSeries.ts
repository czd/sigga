import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";

type SeriesDoc = Doc<"recurringSeries">;

/**
 * Compute the next moment strictly after `now` that matches the pattern.
 * Iceland is UTC+0 year-round, so UTC math is correct and DST-free.
 * Mirrors `computeNextStartTime` in src/lib/formatRecurrence.ts (kept
 * local here so convex/ bundles without reaching across the repo).
 */
function computeNextStartTime(params: {
	daysOfWeek: readonly number[];
	timeOfDay: string;
	now: number;
}): number {
	const [hhStr, mmStr] = params.timeOfDay.split(":");
	const hh = Number(hhStr);
	const mm = Number(mmStr);
	const days = Array.from(new Set(params.daysOfWeek)).sort((a, b) => a - b);
	const nowDate = new Date(params.now);
	for (let i = 0; i < 8; i++) {
		const candidate = Date.UTC(
			nowDate.getUTCFullYear(),
			nowDate.getUTCMonth(),
			nowDate.getUTCDate() + i,
			hh,
			mm,
			0,
			0,
		);
		const dow = new Date(candidate).getUTCDay();
		if (days.includes(dow) && candidate > params.now) {
			return candidate;
		}
	}
	throw new ConvexError("Gat ekki reiknað næsta tíma.");
}

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

function validateDays(days: readonly number[]): number[] {
	if (days.length === 0) {
		throw new ConvexError("Veldu að minnsta kosti einn dag.");
	}
	const unique = Array.from(new Set(days));
	for (const d of unique) {
		if (!Number.isInteger(d) || d < 0 || d > 6) {
			throw new ConvexError("Ógildur dagur.");
		}
	}
	return unique.sort((a, b) => a - b);
}

function validateTimeOfDay(timeOfDay: string): string {
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) {
		throw new ConvexError("Ógildur tími. Notaðu HH:mm.");
	}
	return timeOfDay;
}

function validateDuration(duration: number | undefined): number | undefined {
	if (duration === undefined) return undefined;
	if (!Number.isFinite(duration) || duration < 1 || duration > 24 * 60) {
		throw new ConvexError("Ógild lengd.");
	}
	return Math.floor(duration);
}

/**
 * Invariant enforcer. If the series is active and has no upcoming appointment
 * row, compute and insert the next one. Idempotent: running twice is a no-op
 * on the second call.
 */
export async function ensureNextOccurrence(
	ctx: MutationCtx,
	seriesId: Id<"recurringSeries">,
): Promise<Id<"appointments"> | null> {
	const series = await ctx.db.get(seriesId);
	if (!series?.isActive) return null;

	const now = Date.now();
	const existing = await ctx.db
		.query("appointments")
		.withIndex("by_series_and_startTime", (q) =>
			q.eq("seriesId", seriesId).gte("startTime", now),
		)
		.collect();
	if (existing.some((row) => row.status === "upcoming")) return null;

	const startTime = computeNextStartTime({
		daysOfWeek: series.daysOfWeek,
		timeOfDay: series.timeOfDay,
		now,
	});
	const endTime =
		series.durationMinutes !== undefined
			? startTime + series.durationMinutes * 60_000
			: undefined;

	return await ctx.db.insert("appointments", {
		title: series.title,
		startTime,
		endTime,
		location: series.location,
		notes: series.notes,
		driverId: undefined,
		status: "upcoming",
		seriesId: series._id,
		createdBy: series.createdBy,
		updatedAt: now,
		updatedBy: series.createdBy,
	});
}

async function deleteUpcomingOccurrence(
	ctx: MutationCtx,
	seriesId: Id<"recurringSeries">,
): Promise<void> {
	const now = Date.now();
	const rows = await ctx.db
		.query("appointments")
		.withIndex("by_series_and_startTime", (q) =>
			q.eq("seriesId", seriesId).gte("startTime", now),
		)
		.collect();
	for (const row of rows) {
		if (row.status === "upcoming") {
			await ctx.db.delete(row._id);
		}
	}
}

export const list = query({
	args: {},
	handler: async (ctx): Promise<SeriesDoc[]> => {
		await requireAuth(ctx);
		const rows = await ctx.db.query("recurringSeries").collect();
		return rows.sort((a, b) => a.title.localeCompare(b.title, "is"));
	},
});

export const get = query({
	args: { id: v.id("recurringSeries") },
	handler: async (ctx, args): Promise<SeriesDoc | null> => {
		await requireAuth(ctx);
		return await ctx.db.get(args.id);
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		daysOfWeek: v.array(v.number()),
		timeOfDay: v.string(),
		durationMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<Id<"recurringSeries">> => {
		const userId = await requireAuth(ctx);
		const title = args.title.trim();
		if (title.length === 0) {
			throw new ConvexError("Heiti má ekki vera tómt.");
		}
		const days = validateDays(args.daysOfWeek);
		const timeOfDay = validateTimeOfDay(args.timeOfDay);
		const durationMinutes = validateDuration(args.durationMinutes);

		const now = Date.now();
		const id = await ctx.db.insert("recurringSeries", {
			title,
			location: args.location?.trim() || undefined,
			notes: args.notes?.trim() || undefined,
			daysOfWeek: days,
			timeOfDay,
			durationMinutes,
			isActive: true,
			createdBy: userId,
			updatedAt: now,
			updatedBy: userId,
		});
		await ensureNextOccurrence(ctx, id);
		return id;
	},
});

export const update = mutation({
	args: {
		id: v.id("recurringSeries"),
		title: v.optional(v.string()),
		location: v.optional(v.union(v.string(), v.null())),
		notes: v.optional(v.union(v.string(), v.null())),
		daysOfWeek: v.optional(v.array(v.number())),
		timeOfDay: v.optional(v.string()),
		durationMinutes: v.optional(v.union(v.number(), v.null())),
	},
	handler: async (ctx, args): Promise<void> => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Regluleg tímasería fannst ekki.");
		}
		const patch: Partial<SeriesDoc> = {
			updatedAt: Date.now(),
			updatedBy: userId,
		};
		if (args.title !== undefined) {
			const title = args.title.trim();
			if (title.length === 0) {
				throw new ConvexError("Heiti má ekki vera tómt.");
			}
			patch.title = title;
		}
		if (args.location !== undefined) {
			patch.location = args.location?.trim() || undefined;
		}
		if (args.notes !== undefined) {
			patch.notes = args.notes?.trim() || undefined;
		}
		if (args.daysOfWeek !== undefined) {
			patch.daysOfWeek = validateDays(args.daysOfWeek);
		}
		if (args.timeOfDay !== undefined) {
			patch.timeOfDay = validateTimeOfDay(args.timeOfDay);
		}
		if (args.durationMinutes !== undefined) {
			patch.durationMinutes =
				args.durationMinutes === null
					? undefined
					: validateDuration(args.durationMinutes);
		}
		await ctx.db.patch(args.id, patch);
		// Intentionally do NOT re-spawn here: the already-scheduled upcoming
		// occurrence keeps its original values. The form footer warns the user.
	},
});

export const setActive = mutation({
	args: { id: v.id("recurringSeries"), isActive: v.boolean() },
	handler: async (ctx, args): Promise<void> => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Regluleg tímasería fannst ekki.");
		}
		if (existing.isActive === args.isActive) return;
		await ctx.db.patch(args.id, {
			isActive: args.isActive,
			updatedAt: Date.now(),
			updatedBy: userId,
		});
		if (args.isActive) {
			await ensureNextOccurrence(ctx, args.id);
		} else {
			await deleteUpcomingOccurrence(ctx, args.id);
		}
	},
});

export const remove = mutation({
	args: { id: v.id("recurringSeries") },
	handler: async (ctx, args): Promise<void> => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;

		// Null out seriesId on past rows; delete the upcoming row outright.
		const now = Date.now();
		const future = await ctx.db
			.query("appointments")
			.withIndex("by_series_and_startTime", (q) =>
				q.eq("seriesId", args.id).gte("startTime", now),
			)
			.collect();
		for (const row of future) {
			if (row.status === "upcoming") {
				await ctx.db.delete(row._id);
			} else {
				await ctx.db.patch(row._id, { seriesId: undefined });
			}
		}
		const past = await ctx.db
			.query("appointments")
			.withIndex("by_series_and_startTime", (q) =>
				q.eq("seriesId", args.id).lt("startTime", now),
			)
			.collect();
		for (const row of past) {
			await ctx.db.patch(row._id, { seriesId: undefined });
		}
		await ctx.db.delete(args.id);
	},
});

export const ensureNextOccurrences = internalMutation({
	args: {},
	handler: async (ctx): Promise<void> => {
		const active = await ctx.db
			.query("recurringSeries")
			.withIndex("by_active", (q) => q.eq("isActive", true))
			.collect();
		for (const series of active) {
			await ensureNextOccurrence(ctx, series._id);
		}
	},
});
