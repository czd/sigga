import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

type ContactDoc = Doc<"contacts">;

const CATEGORY = v.union(
	v.literal("emergency"),
	v.literal("medical"),
	v.literal("municipal"),
	v.literal("family"),
	v.literal("other"),
);

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

function sortContacts(rows: ContactDoc[]): ContactDoc[] {
	return [...rows].sort((a, b) => {
		const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
		const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
		if (aOrder !== bOrder) return aOrder - bOrder;
		return a.name.localeCompare(b.name, "is");
	});
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const rows = await ctx.db.query("contacts").collect();
		return sortContacts(rows);
	},
});

export const create = mutation({
	args: {
		category: CATEGORY,
		name: v.string(),
		role: v.optional(v.string()),
		phone: v.optional(v.string()),
		email: v.optional(v.string()),
		notes: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const name = args.name.trim();
		if (name.length === 0) {
			throw new ConvexError("Nafn má ekki vera tómt.");
		}
		return await ctx.db.insert("contacts", {
			category: args.category,
			name,
			role: args.role?.trim() || undefined,
			phone: args.phone?.trim() || undefined,
			email: args.email?.trim() || undefined,
			notes: args.notes?.trim() || undefined,
			sortOrder: args.sortOrder,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("contacts"),
		category: v.optional(CATEGORY),
		name: v.optional(v.string()),
		role: v.optional(v.union(v.string(), v.null())),
		phone: v.optional(v.union(v.string(), v.null())),
		email: v.optional(v.union(v.string(), v.null())),
		notes: v.optional(v.union(v.string(), v.null())),
		sortOrder: v.optional(v.union(v.number(), v.null())),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const { id, ...rest } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new ConvexError("Tengiliður fannst ekki.");
		}
		const patch: Partial<ContactDoc> = {};
		if (rest.category !== undefined) patch.category = rest.category;
		if (rest.name !== undefined) {
			const name = rest.name.trim();
			if (name.length === 0) {
				throw new ConvexError("Nafn má ekki vera tómt.");
			}
			patch.name = name;
		}
		if (rest.role !== undefined) {
			patch.role = rest.role?.trim() || undefined;
		}
		if (rest.phone !== undefined) {
			patch.phone = rest.phone?.trim() || undefined;
		}
		if (rest.email !== undefined) {
			patch.email = rest.email?.trim() || undefined;
		}
		if (rest.notes !== undefined) {
			patch.notes = rest.notes?.trim() || undefined;
		}
		if (rest.sortOrder !== undefined) {
			patch.sortOrder = rest.sortOrder ?? undefined;
		}
		await ctx.db.patch(id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("contacts") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;
		await ctx.db.delete(args.id);
	},
});
