import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";

type DocumentDoc = Doc<"documents">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type DocumentWithMeta = DocumentDoc & {
	url: string | null;
	addedByUser: UserSummary | null;
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

async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

export const list = query({
	args: {},
	handler: async (ctx): Promise<DocumentWithMeta[]> => {
		const rows = await ctx.db.query("documents").collect();
		const enriched = await Promise.all(
			rows.map(async (row): Promise<DocumentWithMeta> => {
				const [url, addedByUser] = await Promise.all([
					ctx.storage.getUrl(row.storageId),
					resolveUser(ctx, row.addedBy),
				]);
				return { ...row, url, addedByUser };
			}),
		);
		return enriched.sort((a, b) => b._creationTime - a._creationTime);
	},
});

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		return await ctx.storage.generateUploadUrl();
	},
});

export const save = mutation({
	args: {
		storageId: v.id("_storage"),
		title: v.string(),
		fileName: v.string(),
		fileType: v.string(),
		fileSize: v.number(),
		category: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const title = args.title.trim();
		if (title.length === 0) {
			throw new ConvexError("Titill má ekki vera tómur.");
		}
		const fileName = args.fileName.trim();
		if (fileName.length === 0) {
			throw new ConvexError("Skráarnafn má ekki vera tómt.");
		}
		return await ctx.db.insert("documents", {
			storageId: args.storageId,
			title,
			fileName,
			fileType: args.fileType,
			fileSize: args.fileSize,
			category: args.category?.trim() || undefined,
			notes: args.notes?.trim() || undefined,
			addedBy: userId,
		});
	},
});

export const remove = mutation({
	args: { id: v.id("documents") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;
		await ctx.storage.delete(existing.storageId);
		await ctx.db.delete(args.id);
	},
});
