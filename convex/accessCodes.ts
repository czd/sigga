import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";

// Unambiguous alphabet — no 0/O, 1/l/I — so codes are easy to read aloud and
// retype on a phone.
const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CODE_GROUP = 4;

function isAdminEmail(email: string | undefined | null): boolean {
	if (!email) return false;
	const raw = process.env.ADMIN_EMAILS ?? "";
	const allowed = raw
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
	return allowed.includes(email.toLowerCase());
}

async function requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	const user = await ctx.db.get(userId);
	if (!isAdminEmail(user?.email)) {
		throw new ConvexError("Ekki heimill aðgangur");
	}
	return userId;
}

function generateCode(): string {
	const bytes = new Uint8Array(CODE_GROUP * 2);
	crypto.getRandomValues(bytes);
	const chars = Array.from(
		bytes,
		(b) => CODE_ALPHABET[b % CODE_ALPHABET.length],
	);
	return `${chars.slice(0, CODE_GROUP).join("")}-${chars.slice(CODE_GROUP).join("")}`;
}

async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateCode();
		const existing = await ctx.db
			.query("accessCodes")
			.withIndex("by_code", (q) => q.eq("code", code))
			.unique();
		if (existing === null) return code;
	}
	throw new ConvexError("Ekki tókst að búa til kóða. Reyndu aftur.");
}

// Called only from the FamilyCode credentials provider during sign-in.
// Internal so clients can't probe codes directly.
export const verifyAndResolveUser = internalMutation({
	args: { code: v.string() },
	returns: v.union(v.id("users"), v.null()),
	handler: async (ctx, { code }) => {
		const row = await ctx.db
			.query("accessCodes")
			.withIndex("by_code", (q) => q.eq("code", code))
			.unique();
		if (row === null || !row.isActive) {
			return null;
		}

		let userId = row.userId ?? null;
		if (userId === null) {
			if (row.email) {
				const existing = await ctx.db
					.query("users")
					.filter((q) => q.eq(q.field("email"), row.email))
					.first();
				userId = existing?._id ?? null;
			}
			if (userId === null) {
				userId = await ctx.db.insert("users", {
					name: row.name,
					email: row.email,
				});
			}
			await ctx.db.patch(row._id, { userId });
		}

		await ctx.db.patch(row._id, { lastUsedAt: Date.now() });
		return userId;
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const rows = await ctx.db.query("accessCodes").collect();
		rows.sort((a, b) => a.name.localeCompare(b.name, "is"));
		return rows.map((row) => ({
			_id: row._id,
			code: row.code,
			name: row.name,
			email: row.email ?? null,
			isActive: row.isActive,
			lastUsedAt: row.lastUsedAt ?? null,
		}));
	},
});

export const add = mutation({
	args: {
		name: v.string(),
		email: v.optional(v.string()),
		code: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const name = args.name.trim();
		if (name.length === 0) {
			throw new ConvexError("Nafn má ekki vera tómt.");
		}
		const email = args.email?.trim() || undefined;

		let code: string;
		const custom = args.code?.trim();
		if (custom) {
			const clash = await ctx.db
				.query("accessCodes")
				.withIndex("by_code", (q) => q.eq("code", custom))
				.unique();
			if (clash !== null) {
				throw new ConvexError("Þessi kóði er þegar til.");
			}
			code = custom;
		} else {
			code = await generateUniqueCode(ctx);
		}

		const id = await ctx.db.insert("accessCodes", {
			code,
			name,
			email,
			isActive: true,
		});
		return { id, code };
	},
});

export const rotate = mutation({
	args: { id: v.id("accessCodes") },
	handler: async (ctx, { id }) => {
		await requireAdmin(ctx);
		const row = await ctx.db.get(id);
		if (row === null) {
			throw new ConvexError("Kóði fannst ekki.");
		}
		const code = await generateUniqueCode(ctx);
		await ctx.db.patch(id, { code });
		return { code };
	},
});

export const setActive = mutation({
	args: { id: v.id("accessCodes"), isActive: v.boolean() },
	handler: async (ctx, { id, isActive }) => {
		await requireAdmin(ctx);
		await ctx.db.patch(id, { isActive });
	},
});

export const remove = mutation({
	args: { id: v.id("accessCodes") },
	handler: async (ctx, { id }) => {
		await requireAdmin(ctx);
		// Only the code is deleted; the linked users row is kept on purpose so the
		// person's authorship on log entries and appointments stays intact.
		await ctx.db.delete(id);
	},
});
