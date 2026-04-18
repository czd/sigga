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
	args: {
		limit: v.optional(v.number()),
		includeCancelled: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const now = Date.now();
		const limit = args.limit ?? 3;
		if (args.includeCancelled) {
			// Merge upcoming + cancelled future rows, ordered by startTime.
			// Over-fetch on the by_startTime range then filter out completed.
			const rows = await ctx.db
				.query("appointments")
				.withIndex("by_startTime", (q) => q.gte("startTime", now))
				.order("asc")
				.take(limit * 3);
			const kept = rows
				.filter((row) => row.status !== "completed")
				.slice(0, limit);
			return Promise.all(kept.map((row) => withDriver(ctx, row)));
		}
		const rows = await ctx.db
			.query("appointments")
			.withIndex("by_status_and_startTime", (q) =>
				q.eq("status", "upcoming").gte("startTime", now),
			)
			.order("asc")
			.take(limit);
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

export const byWeek = query({
	args: { weekStartMs: v.number() },
	handler: async (ctx, args): Promise<AppointmentWithDriver[]> => {
		await requireAuth(ctx);
		const weekEndMs = args.weekStartMs + 7 * 24 * 60 * 60 * 1000;
		const rows = await ctx.db
			.query("appointments")
			.withIndex("by_status_and_startTime", (q) =>
				q.eq("status", "upcoming").gte("startTime", args.weekStartMs),
			)
			.collect();
		const inWeek = rows
			.filter((r) => r.startTime < weekEndMs)
			.sort((a, b) => a.startTime - b.startTime);
		return Promise.all(inWeek.map((row) => withDriver(ctx, row)));
	},
});

/**
 * A row returned by byRange is either a real materialized appointment or a
 * virtual future occurrence computed from an active recurring series. Calendar
 * UIs branch on `virtual` — for virtuals, driver assignment / edit / cancel
 * go through appointments.materializeOccurrence first to turn them into real
 * rows.
 */
type RangeRow = {
	_id: string;
	virtual: boolean;
	title: string;
	startTime: number;
	endTime: number | null;
	location: string | null;
	notes: string | null;
	status: "upcoming" | "completed" | "cancelled";
	driverId: Id<"users"> | null;
	driver: UserSummary | null;
	seriesId: Id<"recurringSeries"> | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseTimeOfDay(timeOfDay: string): { hours: number; minutes: number } {
	const [h, m] = timeOfDay.split(":").map((s) => Number.parseInt(s, 10));
	return { hours: h ?? 0, minutes: m ?? 0 };
}

/**
 * For a given series, emit every occurrence whose startTime falls in
 * [startMs, endMs). Purely computed — does not touch the database.
 */
function virtualOccurrencesForSeries(
	series: Doc<"recurringSeries">,
	startMs: number,
	endMs: number,
): Array<{ startTime: number }> {
	if (!series.isActive) return [];
	const { hours, minutes } = parseTimeOfDay(series.timeOfDay);
	const daysOfWeek = new Set(series.daysOfWeek);
	const out: Array<{ startTime: number }> = [];
	// Walk the window day by day — simple, fast enough for 6-week windows.
	const firstDay = new Date(startMs);
	firstDay.setUTCHours(0, 0, 0, 0);
	for (let ts = firstDay.getTime(); ts < endMs; ts += DAY_MS) {
		const d = new Date(ts);
		if (!daysOfWeek.has(d.getUTCDay())) continue;
		const start = Date.UTC(
			d.getUTCFullYear(),
			d.getUTCMonth(),
			d.getUTCDate(),
			hours,
			minutes,
		);
		if (start < startMs || start >= endMs) continue;
		out.push({ startTime: start });
	}
	return out;
}

export const byRange = query({
	args: { startMs: v.number(), endMs: v.number() },
	handler: async (ctx, args): Promise<RangeRow[]> => {
		await requireAuth(ctx);

		// Real materialized rows in the window — over-fetch on startTime,
		// filter to window. Include cancelled so calendars show them too
		// (virtuals won't overlap with cancelled because the series id +
		// startTime pair matches when materialized, and we exclude that pair).
		const rawRows = await ctx.db
			.query("appointments")
			.withIndex("by_startTime", (q) => q.gte("startTime", args.startMs))
			.collect();
		const realRows = rawRows
			.filter((r) => r.startTime < args.endMs && r.status !== "completed")
			.sort((a, b) => a.startTime - b.startTime);

		// Materialized series+startTime pairs — virtuals skip these so a series
		// that's already been materialized for a given slot doesn't double-show.
		const materialized = new Set<string>();
		for (const r of realRows) {
			if (r.seriesId) materialized.add(`${r.seriesId}:${r.startTime}`);
		}

		const realOut: RangeRow[] = await Promise.all(
			realRows.map(async (r) => ({
				_id: r._id,
				virtual: false,
				title: r.title,
				startTime: r.startTime,
				endTime: r.endTime ?? null,
				location: r.location ?? null,
				notes: r.notes ?? null,
				status: r.status,
				driverId: r.driverId ?? null,
				driver: await resolveUser(ctx, r.driverId),
				seriesId: r.seriesId ?? null,
			})),
		);

		// Virtuals from every active series.
		const activeSeries = await ctx.db
			.query("recurringSeries")
			.withIndex("by_active", (q) => q.eq("isActive", true))
			.collect();

		const virtualOut: RangeRow[] = [];
		for (const series of activeSeries) {
			const occs = virtualOccurrencesForSeries(
				series,
				args.startMs,
				args.endMs,
			);
			for (const occ of occs) {
				const key = `${series._id}:${occ.startTime}`;
				if (materialized.has(key)) continue;
				virtualOut.push({
					_id: `virtual:${series._id}:${occ.startTime}`,
					virtual: true,
					title: series.title,
					startTime: occ.startTime,
					endTime: series.durationMinutes
						? occ.startTime + series.durationMinutes * 60_000
						: null,
					location: series.location ?? null,
					notes: series.notes ?? null,
					status: "upcoming",
					driverId: null,
					driver: null,
					seriesId: series._id,
				});
			}
		}

		return [...realOut, ...virtualOut].sort(
			(a, b) => a.startTime - b.startTime,
		);
	},
});

/**
 * Turn a virtual future occurrence into a real appointments row. Idempotent —
 * if a row already exists at the same (seriesId, startTime) it returns that
 * row's id instead of inserting a duplicate. Used by the detail pane's
 * assign-driver / edit / cancel paths when acting on a virtual.
 */
export const materializeOccurrence = mutation({
	args: {
		seriesId: v.id("recurringSeries"),
		startTimeMs: v.number(),
	},
	handler: async (ctx, args): Promise<Id<"appointments">> => {
		const userId = await requireAuth(ctx);
		const series = await ctx.db.get(args.seriesId);
		if (!series) throw new ConvexError("Röð fannst ekki.");

		const existing = await ctx.db
			.query("appointments")
			.withIndex("by_series_and_startTime", (q) =>
				q.eq("seriesId", args.seriesId).eq("startTime", args.startTimeMs),
			)
			.first();
		if (existing) return existing._id;

		const now = Date.now();
		return await ctx.db.insert("appointments", {
			title: series.title,
			startTime: args.startTimeMs,
			endTime: series.durationMinutes
				? args.startTimeMs + series.durationMinutes * 60_000
				: undefined,
			location: series.location,
			notes: series.notes,
			status: "upcoming",
			seriesId: series._id,
			createdBy: userId,
			updatedAt: now,
			updatedBy: userId,
		});
	},
});
