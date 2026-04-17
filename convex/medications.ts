import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";

type MedicationDoc = Doc<"medications">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type MedicationWithUpdater = MedicationDoc & {
	updatedByUser: UserSummary | null;
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
	med: MedicationDoc,
): Promise<MedicationWithUpdater> {
	return {
		...med,
		updatedByUser: await resolveUser(ctx, med.updatedBy),
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
	args: { activeOnly: v.optional(v.boolean()) },
	handler: async (ctx, args) => {
		const rows = args.activeOnly
			? await ctx.db
					.query("medications")
					.withIndex("by_active", (q) => q.eq("isActive", true))
					.collect()
			: await ctx.db.query("medications").collect();
		const enriched = await Promise.all(rows.map((row) => enrich(ctx, row)));
		return enriched.sort((a, b) => a.name.localeCompare(b.name, "is"));
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		dose: v.string(),
		schedule: v.string(),
		purpose: v.optional(v.string()),
		prescriber: v.optional(v.string()),
		notes: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const name = args.name.trim();
		const dose = args.dose.trim();
		const schedule = args.schedule.trim();
		if (name.length === 0) {
			throw new ConvexError("Heiti lyfs má ekki vera tómt.");
		}
		if (dose.length === 0 || schedule.length === 0) {
			throw new ConvexError("Skammtur og tíðni eru nauðsynleg.");
		}
		return await ctx.db.insert("medications", {
			name,
			dose,
			schedule,
			purpose: args.purpose?.trim() || undefined,
			prescriber: args.prescriber?.trim() || undefined,
			notes: args.notes?.trim() || undefined,
			isActive: true,
			updatedAt: Date.now(),
			updatedBy: userId,
		});
	},
});

export const update = mutation({
	args: {
		id: v.id("medications"),
		name: v.optional(v.string()),
		dose: v.optional(v.string()),
		schedule: v.optional(v.string()),
		purpose: v.optional(v.union(v.string(), v.null())),
		prescriber: v.optional(v.union(v.string(), v.null())),
		notes: v.optional(v.union(v.string(), v.null())),
		isActive: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const { id, ...rest } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new ConvexError("Lyfið fannst ekki.");
		}
		const patch: Partial<MedicationDoc> = {
			updatedAt: Date.now(),
			updatedBy: userId,
		};
		if (rest.name !== undefined) {
			const name = rest.name.trim();
			if (name.length === 0) {
				throw new ConvexError("Heiti lyfs má ekki vera tómt.");
			}
			patch.name = name;
		}
		if (rest.dose !== undefined) {
			const dose = rest.dose.trim();
			if (dose.length === 0) {
				throw new ConvexError("Skammtur má ekki vera tómur.");
			}
			patch.dose = dose;
		}
		if (rest.schedule !== undefined) {
			const schedule = rest.schedule.trim();
			if (schedule.length === 0) {
				throw new ConvexError("Tíðni má ekki vera tóm.");
			}
			patch.schedule = schedule;
		}
		if (rest.purpose !== undefined) {
			patch.purpose = rest.purpose?.trim() || undefined;
		}
		if (rest.prescriber !== undefined) {
			patch.prescriber = rest.prescriber?.trim() || undefined;
		}
		if (rest.notes !== undefined) {
			patch.notes = rest.notes?.trim() || undefined;
		}
		if (rest.isActive !== undefined) patch.isActive = rest.isActive;
		await ctx.db.patch(id, patch);
	},
});

export const remove = mutation({
	args: { id: v.id("medications") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;
		await ctx.db.delete(args.id);
	},
});
