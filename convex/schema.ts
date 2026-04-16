import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	...authTables,

	appointments: defineTable({
		title: v.string(),
		startTime: v.number(),
		endTime: v.optional(v.number()),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		driverId: v.optional(v.id("users")),
		status: v.union(
			v.literal("upcoming"),
			v.literal("completed"),
			v.literal("cancelled"),
		),
		createdBy: v.id("users"),
		updatedAt: v.number(),
		updatedBy: v.id("users"),
	})
		.index("by_startTime", ["startTime"])
		.index("by_status", ["status"]),

	logEntries: defineTable({
		content: v.string(),
		authorId: v.id("users"),
		relatedAppointmentId: v.optional(v.id("appointments")),
		editedAt: v.optional(v.number()),
	}),

	medications: defineTable({
		name: v.string(),
		dose: v.string(),
		schedule: v.string(),
		purpose: v.optional(v.string()),
		prescriber: v.optional(v.string()),
		notes: v.optional(v.string()),
		isActive: v.boolean(),
		updatedAt: v.number(),
		updatedBy: v.id("users"),
	}).index("by_active", ["isActive"]),

	contacts: defineTable({
		category: v.union(
			v.literal("emergency"),
			v.literal("medical"),
			v.literal("municipal"),
			v.literal("family"),
			v.literal("other"),
		),
		name: v.string(),
		role: v.optional(v.string()),
		phone: v.optional(v.string()),
		email: v.optional(v.string()),
		notes: v.optional(v.string()),
		sortOrder: v.optional(v.number()),
	}).index("by_category", ["category"]),

	entitlements: defineTable({
		title: v.string(),
		description: v.optional(v.string()),
		status: v.union(
			v.literal("not_applied"),
			v.literal("in_progress"),
			v.literal("approved"),
			v.literal("denied"),
		),
		ownerId: v.optional(v.id("users")),
		appliedTo: v.optional(v.string()),
		notes: v.optional(v.string()),
		updatedAt: v.number(),
		updatedBy: v.id("users"),
	}).index("by_status", ["status"]),

	documents: defineTable({
		title: v.string(),
		storageId: v.id("_storage"),
		fileName: v.string(),
		fileType: v.string(),
		fileSize: v.number(),
		category: v.optional(v.string()),
		notes: v.optional(v.string()),
		addedBy: v.id("users"),
	}),
});
