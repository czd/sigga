import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

type LogEntryDoc = Doc<"logEntries">;
type AuthorSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type AppointmentSummary = {
	_id: Id<"appointments">;
	title: string;
	startTime: number;
};
type LogEntryWithAuthor = LogEntryDoc & {
	author: AuthorSummary | null;
	appointment: AppointmentSummary | null;
};

async function resolveAuthor(
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<AuthorSummary | null> {
	const user = await ctx.db.get(userId);
	if (!user) return null;
	return {
		_id: user._id,
		name: user.name ?? null,
		email: user.email ?? null,
		image: user.image ?? null,
	};
}

async function resolveAppointment(
	ctx: QueryCtx,
	appointmentId: Id<"appointments"> | undefined,
): Promise<AppointmentSummary | null> {
	if (!appointmentId) return null;
	const appointment = await ctx.db.get(appointmentId);
	if (!appointment) return null;
	return {
		_id: appointment._id,
		title: appointment.title,
		startTime: appointment.startTime,
	};
}

async function enrich(
	ctx: QueryCtx,
	entry: LogEntryDoc,
): Promise<LogEntryWithAuthor> {
	const [author, appointment] = await Promise.all([
		resolveAuthor(ctx, entry.authorId),
		resolveAppointment(ctx, entry.relatedAppointmentId),
	]);
	return { ...entry, author, appointment };
}

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

export const recent = query({
	args: { count: v.optional(v.number()) },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const rows = await ctx.db
			.query("logEntries")
			.order("desc")
			.take(args.count ?? 3);
		return Promise.all(rows.map((row) => enrich(ctx, row)));
	},
});

export const list = query({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const result = await ctx.db
			.query("logEntries")
			.order("desc")
			.paginate(args.paginationOpts);
		const page = await Promise.all(result.page.map((row) => enrich(ctx, row)));
		return { ...result, page };
	},
});

export const add = mutation({
	args: {
		content: v.string(),
		relatedAppointmentId: v.optional(v.id("appointments")),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const content = args.content.trim();
		if (content.length === 0) {
			throw new ConvexError("Færslan má ekki vera tóm.");
		}
		return await ctx.db.insert("logEntries", {
			content,
			authorId: userId,
			relatedAppointmentId: args.relatedAppointmentId,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("logEntries"),
		content: v.string(),
		relatedAppointmentId: v.optional(v.union(v.id("appointments"), v.null())),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Færslan fannst ekki.");
		}
		if (existing.authorId !== userId) {
			throw new ConvexError("Þú getur aðeins breytt þínum eigin færslum.");
		}
		const content = args.content.trim();
		if (content.length === 0) {
			throw new ConvexError("Færslan má ekki vera tóm.");
		}
		const patch: Partial<LogEntryDoc> = {
			content,
			editedAt: Date.now(),
		};
		if (args.relatedAppointmentId !== undefined) {
			patch.relatedAppointmentId = args.relatedAppointmentId ?? undefined;
		}
		await ctx.db.patch(args.id, patch);
	},
});

export const get = query({
	args: { id: v.id("logEntries") },
	handler: async (ctx, args): Promise<LogEntryWithAuthor | null> => {
		await requireAuth(ctx);
		const entry = await ctx.db.get(args.id);
		if (!entry) return null;
		return enrich(ctx, entry);
	},
});
