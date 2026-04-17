import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

type EntitlementDoc = Doc<"entitlements">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type EntitlementWithUsers = EntitlementDoc & {
	ownerUser: UserSummary | null;
	updatedByUser: UserSummary | null;
};

const STATUS = v.union(
	v.literal("not_applied"),
	v.literal("in_progress"),
	v.literal("approved"),
	v.literal("denied"),
);

const STATUS_PRIORITY: Record<EntitlementDoc["status"], number> = {
	in_progress: 0,
	not_applied: 1,
	approved: 2,
	denied: 3,
};

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

async function enrich(
	ctx: QueryCtx,
	row: EntitlementDoc,
): Promise<EntitlementWithUsers> {
	return {
		...row,
		ownerUser: await resolveUser(ctx, row.ownerId),
		updatedByUser: await resolveUser(ctx, row.updatedBy),
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
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("entitlements").collect();
		const enriched = await Promise.all(rows.map((row) => enrich(ctx, row)));
		return enriched.sort((a, b) => {
			const priority = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
			if (priority !== 0) return priority;
			return a.title.localeCompare(b.title, "is");
		});
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		status: STATUS,
		ownerId: v.optional(v.id("users")),
		appliedTo: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const title = args.title.trim();
		if (title.length === 0) {
			throw new ConvexError("Titill má ekki vera tómur.");
		}
		return await ctx.db.insert("entitlements", {
			title,
			description: args.description?.trim() || undefined,
			status: args.status,
			ownerId: args.ownerId,
			appliedTo: args.appliedTo?.trim() || undefined,
			notes: args.notes?.trim() || undefined,
			updatedAt: Date.now(),
			updatedBy: userId,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("entitlements"),
		title: v.optional(v.string()),
		description: v.optional(v.union(v.string(), v.null())),
		status: v.optional(STATUS),
		ownerId: v.optional(v.union(v.id("users"), v.null())),
		appliedTo: v.optional(v.union(v.string(), v.null())),
		notes: v.optional(v.union(v.string(), v.null())),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const { id, ...rest } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new ConvexError("Réttindi fundust ekki.");
		}
		const patch: Partial<EntitlementDoc> = {
			updatedAt: Date.now(),
			updatedBy: userId,
		};
		if (rest.title !== undefined) {
			const title = rest.title.trim();
			if (title.length === 0) {
				throw new ConvexError("Titill má ekki vera tómur.");
			}
			patch.title = title;
		}
		if (rest.description !== undefined) {
			patch.description = rest.description?.trim() || undefined;
		}
		if (rest.status !== undefined) patch.status = rest.status;
		if (rest.ownerId !== undefined) patch.ownerId = rest.ownerId ?? undefined;
		if (rest.appliedTo !== undefined) {
			patch.appliedTo = rest.appliedTo?.trim() || undefined;
		}
		if (rest.notes !== undefined) {
			patch.notes = rest.notes?.trim() || undefined;
		}
		await ctx.db.patch(id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("entitlements") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;
		await ctx.db.delete(args.id);
	},
});
