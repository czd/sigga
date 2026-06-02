import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

type CommentDoc = Doc<"comments">;
type AuthorSummary = {
	_id: Id<"users">;
	name: string | null;
	image: string | null;
};
type CommentWithAuthor = CommentDoc & {
	author: AuthorSummary | null;
	isMine: boolean;
};

/** Target discriminator shared by the validator and the helpers. */
const targetTypeValidator = v.union(
	v.literal("logEntry"),
	v.literal("appointment"),
);
const targetIdValidator = v.union(v.id("logEntries"), v.id("appointments"));

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

/**
 * Count the comments on a single target. Shared by the logEntries and
 * appointments enrichers so the card badge ("💬 2") works on both surfaces.
 */
export async function countCommentsFor(
	ctx: QueryCtx,
	targetType: CommentDoc["targetType"],
	targetId: CommentDoc["targetId"],
): Promise<number> {
	const rows = await ctx.db
		.query("comments")
		.withIndex("by_target", (q) =>
			q.eq("targetType", targetType).eq("targetId", targetId),
		)
		.collect();
	return rows.length;
}

/**
 * Confirm the comment target actually exists before we attach a comment to
 * it (mirrors the entry-exists guard on reactions.toggle).
 */
async function requireTarget(
	ctx: QueryCtx,
	targetType: CommentDoc["targetType"],
	targetId: CommentDoc["targetId"],
): Promise<void> {
	const target = await ctx.db.get(targetId);
	if (!target) {
		throw new ConvexError(
			targetType === "appointment"
				? "Tíminn fannst ekki."
				: "Færslan fannst ekki.",
		);
	}
}

export const list = query({
	args: { targetType: targetTypeValidator, targetId: targetIdValidator },
	handler: async (ctx, args): Promise<CommentWithAuthor[]> => {
		const userId = await requireAuth(ctx);
		const rows = await ctx.db
			.query("comments")
			.withIndex("by_target", (q) =>
				q.eq("targetType", args.targetType).eq("targetId", args.targetId),
			)
			.order("asc")
			.collect();
		return Promise.all(
			rows.map(async (row) => {
				const user = await ctx.db.get(row.authorId);
				return {
					...row,
					author: user
						? {
								_id: user._id,
								name: user.name ?? null,
								image: user.image ?? null,
							}
						: null,
					isMine: row.authorId === userId,
				};
			}),
		);
	},
});

export const add = mutation({
	args: {
		targetType: targetTypeValidator,
		targetId: targetIdValidator,
		content: v.string(),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const content = args.content.trim();
		if (content.length === 0) {
			throw new ConvexError("Athugasemd má ekki vera tóm.");
		}
		await requireTarget(ctx, args.targetType, args.targetId);
		return await ctx.db.insert("comments", {
			targetType: args.targetType,
			targetId: args.targetId,
			authorId: userId,
			content,
		});
	},
});

export const update = mutation({
	args: { id: v.id("comments"), content: v.string() },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Athugasemdin fannst ekki.");
		}
		if (existing.authorId !== userId) {
			throw new ConvexError("Þú getur aðeins breytt þínum eigin athugasemdum.");
		}
		const content = args.content.trim();
		if (content.length === 0) {
			throw new ConvexError("Athugasemd má ekki vera tóm.");
		}
		await ctx.db.patch(args.id, { content, editedAt: Date.now() });
	},
});

export const remove = mutation({
	args: { id: v.id("comments") },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;
		if (existing.authorId !== userId) {
			throw new ConvexError("Þú getur aðeins eytt þínum eigin athugasemdum.");
		}
		await ctx.db.delete(args.id);
	},
});
