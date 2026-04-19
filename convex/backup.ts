import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";

const KEEP_BACKUPS = 4;

type SnapshotTable =
	| "users"
	| "appointments"
	| "recurringSeries"
	| "logEntries"
	| "medications"
	| "contacts"
	| "entitlements"
	| "documents"
	| "events";

type Snapshot = {
	exportedAt: string;
	exportedAtMs: number;
	schemaVersion: number;
	tables: {
		users: Doc<"users">[];
		appointments: Doc<"appointments">[];
		recurringSeries: Doc<"recurringSeries">[];
		logEntries: Doc<"logEntries">[];
		medications: Doc<"medications">[];
		contacts: Doc<"contacts">[];
		entitlements: Doc<"entitlements">[];
		documents: Doc<"documents">[];
		events: Doc<"events">[];
	};
};

export const snapshotTables = internalQuery({
	args: {},
	handler: async (ctx): Promise<Snapshot["tables"]> => {
		const [
			users,
			appointments,
			recurringSeries,
			logEntries,
			medications,
			contacts,
			entitlements,
			documents,
			events,
		] = await Promise.all([
			ctx.db.query("users").collect(),
			ctx.db.query("appointments").collect(),
			ctx.db.query("recurringSeries").collect(),
			ctx.db.query("logEntries").collect(),
			ctx.db.query("medications").collect(),
			ctx.db.query("contacts").collect(),
			ctx.db.query("entitlements").collect(),
			ctx.db.query("documents").collect(),
			ctx.db.query("events").collect(),
		]);
		return {
			users,
			appointments,
			recurringSeries,
			logEntries,
			medications,
			contacts,
			entitlements,
			documents,
			events,
		};
	},
});

export const recordBackup = internalMutation({
	args: {
		storageId: v.id("_storage"),
		size: v.number(),
	},
	handler: async (ctx, args): Promise<Id<"backups">> => {
		return await ctx.db.insert("backups", {
			storageId: args.storageId,
			size: args.size,
		});
	},
});

export const listBackupsNewestFirst = internalQuery({
	args: {},
	handler: async (ctx): Promise<Doc<"backups">[]> => {
		const all = await ctx.db.query("backups").collect();
		return all.sort((a, b) => b._creationTime - a._creationTime);
	},
});

export const deleteBackupRow = internalMutation({
	args: { id: v.id("backups") },
	handler: async (ctx, args): Promise<void> => {
		await ctx.db.delete(args.id);
	},
});

export const weeklyExport = internalAction({
	args: {},
	handler: async (
		ctx,
	): Promise<{ storageId: Id<"_storage">; size: number }> => {
		const exportedAtMs = Date.now();
		const tables = await ctx.runQuery(internal.backup.snapshotTables, {});
		const snapshot: Snapshot = {
			exportedAt: new Date(exportedAtMs).toISOString(),
			exportedAtMs,
			schemaVersion: 1,
			tables,
		};
		const json = JSON.stringify(snapshot);
		const blob = new Blob([json], { type: "application/json" });
		const storageId = await ctx.storage.store(blob);

		await ctx.runMutation(internal.backup.recordBackup, {
			storageId,
			size: blob.size,
		});

		const rows = await ctx.runQuery(internal.backup.listBackupsNewestFirst, {});
		const stale = rows.slice(KEEP_BACKUPS);
		for (const row of stale) {
			await ctx.storage.delete(row.storageId);
			await ctx.runMutation(internal.backup.deleteBackupRow, { id: row._id });
		}

		return { storageId, size: blob.size };
	},
});

// Re-export table name union so future callers can type against it.
export type { SnapshotTable };
