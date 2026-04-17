# Recurring Appointments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight recurring-appointments feature so patterns like *Virkni og Vellíðan* (Tuesdays + Fridays 09:15) can be set up once, surface only the single *next* occurrence on the dashboard / Tímar list, and keep per-occurrence driver tracking working exactly as it does today.

**Architecture:** A new `recurringSeries` table holds the pattern. `appointments` gains an optional `seriesId`. The core invariant — *every active series has at most one upcoming `appointments` row* — is enforced at four sites (create, resume, status-change hook, daily cron) by a single helper `ensureNextOccurrence`. UI: a new `/[locale]/timar/reglulegir` management page with borderless Bókasafn-style cards; existing `AppointmentCard` is refactored to match that aesthetic.

**Tech Stack:** Next.js 16 (App Router), Convex (schema, queries, mutations, crons), next-intl (Icelandic-first), shadcn/ui + Tailwind v4, Biome, Bun. No automated test harness yet — verification is manual (`bun dev` + `bunx convex dev` + browser) plus `bun run lint` and `bunx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-04-18-recurring-appointments-design.md` — defer to this for any detail not explicit in a task.

**Commit discipline:** One task = one commit. Use `/qa` before committing, or include `[skip-qa]` only for doc-only / i18n-only tasks when obvious.

---

## File map

New files:
- `convex/recurringSeries.ts` — CRUD + `ensureNextOccurrence` helper + `ensureNextOccurrences` internal mutation.
- `convex/crons.ts` — daily safety cron registration.
- `src/lib/formatRecurrence.ts` — pure helpers: `computeNextStartTime`, `formatDays`, `formatCadence`, validation helpers.
- `src/components/ui/switch.tsx` — shadcn Switch primitive (installed via CLI).
- `src/app/[locale]/(app)/timar/reglulegir/page.tsx` — server page.
- `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx` — client view.
- `src/components/recurringSeries/SeriesList.tsx`
- `src/components/recurringSeries/SeriesCard.tsx`
- `src/components/recurringSeries/SeriesForm.tsx`
- `src/components/recurringSeries/DayPicker.tsx`
- `src/components/timar/SeriesEntryRow.tsx` — the entry-point row above the tabs on the Tímar page.

Modified:
- `convex/schema.ts` — new `recurringSeries` table, new `seriesId` field and `by_series_and_startTime` index on `appointments`.
- `convex/appointments.ts` — `update` and `remove` mutations call `ensureNextOccurrence` after an appointment leaves the `"upcoming"` state; no-op for one-offs.
- `src/app/[locale]/(app)/timar/TimarView.tsx` — inject `<SeriesEntryRow />` above `<AppointmentList />`.
- `src/components/appointments/AppointmentCard.tsx` — refactor to borderless Bókasafn shell.
- `messages/is.json` and `messages/en.json` — add `recurring` namespace.
- `docs/spec.md`, `docs/implementation-plan.md` — document the new feature (run `/docs-check` at end of plan).

---

## Task 1: Schema — add `recurringSeries` table and `seriesId` field

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Update the schema file**

Replace the contents of `convex/schema.ts` with the following:

```ts
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
		seriesId: v.optional(v.id("recurringSeries")),
		createdBy: v.id("users"),
		updatedAt: v.number(),
		updatedBy: v.id("users"),
	})
		.index("by_startTime", ["startTime"])
		.index("by_status_and_startTime", ["status", "startTime"])
		.index("by_series_and_startTime", ["seriesId", "startTime"]),

	recurringSeries: defineTable({
		title: v.string(),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		daysOfWeek: v.array(v.number()),
		timeOfDay: v.string(),
		durationMinutes: v.optional(v.number()),
		isActive: v.boolean(),
		createdBy: v.id("users"),
		updatedAt: v.number(),
		updatedBy: v.id("users"),
	}).index("by_active", ["isActive"]),

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
```

- [ ] **Step 2: Deploy the schema**

Run: `bunx convex dev --once`

Expected: success, no validation errors. The new `recurringSeries` table and the `by_series_and_startTime` index are created. Existing `appointments` rows have no `seriesId` (optional, so they validate).

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "convex: add recurringSeries table + appointments.seriesId [skip-qa]"
```

(`[skip-qa]` is justified: schema-only change, the type system + Convex deploy is the gate.)

---

## Task 2: Pure recurrence helpers (`src/lib/formatRecurrence.ts`)

**Files:**
- Create: `src/lib/formatRecurrence.ts`

- [ ] **Step 1: Create the file**

Path: `src/lib/formatRecurrence.ts`

```ts
const DAY_MS = 86_400_000;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeOfDay(timeOfDay: string): boolean {
	return TIME_RE.test(timeOfDay);
}

export function normaliseDaysOfWeek(days: readonly number[]): number[] {
	const unique = Array.from(new Set(days));
	for (const d of unique) {
		if (!Number.isInteger(d) || d < 0 || d > 6) {
			throw new Error(`Invalid day-of-week: ${d}`);
		}
	}
	return unique.sort((a, b) => a - b);
}

/**
 * Given a pattern and a reference timestamp (ms), return the next moment
 * strictly after `now` that matches. Iceland is UTC+0 year-round, so we can
 * do the math purely in UTC without DST concerns.
 */
export function computeNextStartTime(params: {
	daysOfWeek: readonly number[];
	timeOfDay: string;
	now: number;
}): number {
	if (!isValidTimeOfDay(params.timeOfDay)) {
		throw new Error(`Invalid timeOfDay: ${params.timeOfDay}`);
	}
	const days = normaliseDaysOfWeek(params.daysOfWeek);
	if (days.length === 0) {
		throw new Error("daysOfWeek must not be empty");
	}
	const [hh, mm] = params.timeOfDay.split(":").map(Number);

	const nowDate = new Date(params.now);
	for (let i = 0; i < 7; i++) {
		const candidate = Date.UTC(
			nowDate.getUTCFullYear(),
			nowDate.getUTCMonth(),
			nowDate.getUTCDate() + i,
			hh,
			mm,
			0,
			0,
		);
		const dow = new Date(candidate).getUTCDay();
		if (days.includes(dow) && candidate > params.now) {
			return candidate;
		}
	}
	// Unreachable in practice: any non-empty days array matches within 7 days.
	throw new Error("Could not compute next occurrence within 7 days");
}

export type FormatDaysLabels = Record<number, string>; // 0..6 -> localised long day name

/**
 * Format a list of day indices as a localised joined string like
 * "þriðjudaga og föstudaga". Consumers pass in the long-day labels from i18n.
 */
export function formatDays(
	days: readonly number[],
	longLabels: FormatDaysLabels,
	locale: string,
): string {
	const sorted = normaliseDaysOfWeek(days);
	const parts = sorted.map((d) => longLabels[d] ?? "");
	if (parts.length === 0) return "";
	if (typeof Intl !== "undefined" && "ListFormat" in Intl) {
		return new Intl.ListFormat(locale, { type: "conjunction" }).format(parts);
	}
	if (parts.length === 1) return parts[0];
	return `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}

/** Dev helper for readable debug output. */
export const RECURRENCE_DAY_MS = DAY_MS;
```

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Lint**

Run: `bun run lint`

Expected: no errors.

- [ ] **Step 4: Smoke-check the helper**

Open a scratch REPL (or just trust typecheck for this task; we'll exercise the helper in Task 3 via the Convex module). No manual verification needed beyond typecheck/lint.

- [ ] **Step 5: Commit**

```bash
git add src/lib/formatRecurrence.ts
git commit -m "lib: add recurrence helpers (computeNextStartTime, formatDays) [skip-qa]"
```

---

## Task 3: Convex `recurringSeries.ts` — queries, mutations, `ensureNextOccurrence`

**Files:**
- Create: `convex/recurringSeries.ts`

- [ ] **Step 1: Create the module**

Path: `convex/recurringSeries.ts`

```ts
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";

type SeriesDoc = Doc<"recurringSeries">;

/**
 * Compute the next moment strictly after `now` that matches the pattern.
 * Iceland is UTC+0 year-round, so UTC math is correct and DST-free.
 * Mirrors `computeNextStartTime` in src/lib/formatRecurrence.ts (kept
 * local here so convex/ bundles without reaching across the repo).
 */
function computeNextStartTime(params: {
	daysOfWeek: readonly number[];
	timeOfDay: string;
	now: number;
}): number {
	const [hhStr, mmStr] = params.timeOfDay.split(":");
	const hh = Number(hhStr);
	const mm = Number(mmStr);
	const days = Array.from(new Set(params.daysOfWeek)).sort((a, b) => a - b);
	const nowDate = new Date(params.now);
	for (let i = 0; i < 7; i++) {
		const candidate = Date.UTC(
			nowDate.getUTCFullYear(),
			nowDate.getUTCMonth(),
			nowDate.getUTCDate() + i,
			hh,
			mm,
			0,
			0,
		);
		const dow = new Date(candidate).getUTCDay();
		if (days.includes(dow) && candidate > params.now) {
			return candidate;
		}
	}
	throw new ConvexError("Gat ekki reiknað næsta tíma.");
}

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (userId === null) {
		throw new ConvexError("Ekki innskráður");
	}
	return userId;
}

function validateDays(days: readonly number[]): number[] {
	if (days.length === 0) {
		throw new ConvexError("Veldu að minnsta kosti einn dag.");
	}
	const unique = Array.from(new Set(days));
	for (const d of unique) {
		if (!Number.isInteger(d) || d < 0 || d > 6) {
			throw new ConvexError("Ógildur dagur.");
		}
	}
	return unique.sort((a, b) => a - b);
}

function validateTimeOfDay(timeOfDay: string): string {
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) {
		throw new ConvexError("Ógildur tími. Notaðu HH:mm.");
	}
	return timeOfDay;
}

function validateDuration(duration: number | undefined): number | undefined {
	if (duration === undefined) return undefined;
	if (!Number.isFinite(duration) || duration < 1 || duration > 24 * 60) {
		throw new ConvexError("Ógild lengd.");
	}
	return Math.floor(duration);
}

/**
 * Invariant enforcer. If the series is active and has no upcoming appointment
 * row, compute and insert the next one. Idempotent: running twice is a no-op
 * on the second call.
 */
export async function ensureNextOccurrence(
	ctx: MutationCtx,
	seriesId: Id<"recurringSeries">,
): Promise<Id<"appointments"> | null> {
	const series = await ctx.db.get(seriesId);
	if (!series || !series.isActive) return null;

	const now = Date.now();
	const existing = await ctx.db
		.query("appointments")
		.withIndex("by_series_and_startTime", (q) =>
			q.eq("seriesId", seriesId).gte("startTime", now),
		)
		.collect();
	if (existing.some((row) => row.status === "upcoming")) return null;

	const startTime = computeNextStartTime({
		daysOfWeek: series.daysOfWeek,
		timeOfDay: series.timeOfDay,
		now,
	});
	const endTime =
		series.durationMinutes !== undefined
			? startTime + series.durationMinutes * 60_000
			: undefined;

	return await ctx.db.insert("appointments", {
		title: series.title,
		startTime,
		endTime,
		location: series.location,
		notes: series.notes,
		driverId: undefined,
		status: "upcoming",
		seriesId: series._id,
		createdBy: series.createdBy,
		updatedAt: now,
		updatedBy: series.createdBy,
	});
}

async function deleteUpcomingOccurrence(
	ctx: MutationCtx,
	seriesId: Id<"recurringSeries">,
): Promise<void> {
	const now = Date.now();
	const rows = await ctx.db
		.query("appointments")
		.withIndex("by_series_and_startTime", (q) =>
			q.eq("seriesId", seriesId).gte("startTime", now),
		)
		.collect();
	for (const row of rows) {
		if (row.status === "upcoming") {
			await ctx.db.delete(row._id);
		}
	}
}

export const list = query({
	args: {},
	handler: async (ctx): Promise<SeriesDoc[]> => {
		await requireAuth(ctx);
		const rows = await ctx.db.query("recurringSeries").collect();
		return rows.sort((a, b) => a.title.localeCompare(b.title, "is"));
	},
});

export const get = query({
	args: { id: v.id("recurringSeries") },
	handler: async (ctx, args): Promise<SeriesDoc | null> => {
		await requireAuth(ctx);
		return await ctx.db.get(args.id);
	},
});

export const create = mutation({
	args: {
		title: v.string(),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		daysOfWeek: v.array(v.number()),
		timeOfDay: v.string(),
		durationMinutes: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<Id<"recurringSeries">> => {
		const userId = await requireAuth(ctx);
		const title = args.title.trim();
		if (title.length === 0) {
			throw new ConvexError("Heiti má ekki vera tómt.");
		}
		const days = validateDays(args.daysOfWeek);
		const timeOfDay = validateTimeOfDay(args.timeOfDay);
		const durationMinutes = validateDuration(args.durationMinutes);

		const now = Date.now();
		const id = await ctx.db.insert("recurringSeries", {
			title,
			location: args.location?.trim() || undefined,
			notes: args.notes?.trim() || undefined,
			daysOfWeek: days,
			timeOfDay,
			durationMinutes,
			isActive: true,
			createdBy: userId,
			updatedAt: now,
			updatedBy: userId,
		});
		await ensureNextOccurrence(ctx, id);
		return id;
	},
});

export const update = mutation({
	args: {
		id: v.id("recurringSeries"),
		title: v.optional(v.string()),
		location: v.optional(v.union(v.string(), v.null())),
		notes: v.optional(v.union(v.string(), v.null())),
		daysOfWeek: v.optional(v.array(v.number())),
		timeOfDay: v.optional(v.string()),
		durationMinutes: v.optional(v.union(v.number(), v.null())),
	},
	handler: async (ctx, args): Promise<void> => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Regluleg tímasería fannst ekki.");
		}
		const patch: Partial<SeriesDoc> = {
			updatedAt: Date.now(),
			updatedBy: userId,
		};
		if (args.title !== undefined) {
			const title = args.title.trim();
			if (title.length === 0) {
				throw new ConvexError("Heiti má ekki vera tómt.");
			}
			patch.title = title;
		}
		if (args.location !== undefined) {
			patch.location = args.location?.trim() || undefined;
		}
		if (args.notes !== undefined) {
			patch.notes = args.notes?.trim() || undefined;
		}
		if (args.daysOfWeek !== undefined) {
			patch.daysOfWeek = validateDays(args.daysOfWeek);
		}
		if (args.timeOfDay !== undefined) {
			patch.timeOfDay = validateTimeOfDay(args.timeOfDay);
		}
		if (args.durationMinutes !== undefined) {
			patch.durationMinutes =
				args.durationMinutes === null
					? undefined
					: validateDuration(args.durationMinutes);
		}
		await ctx.db.patch(args.id, patch);
		// Intentionally do NOT re-spawn here: the already-scheduled upcoming
		// occurrence keeps its original values. The form footer warns the user.
	},
});

export const setActive = mutation({
	args: { id: v.id("recurringSeries"), isActive: v.boolean() },
	handler: async (ctx, args): Promise<void> => {
		const userId = await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError("Regluleg tímasería fannst ekki.");
		}
		if (existing.isActive === args.isActive) return;
		await ctx.db.patch(args.id, {
			isActive: args.isActive,
			updatedAt: Date.now(),
			updatedBy: userId,
		});
		if (args.isActive) {
			await ensureNextOccurrence(ctx, args.id);
		} else {
			await deleteUpcomingOccurrence(ctx, args.id);
		}
	},
});

export const remove = mutation({
	args: { id: v.id("recurringSeries") },
	handler: async (ctx, args): Promise<void> => {
		await requireAuth(ctx);
		const existing = await ctx.db.get(args.id);
		if (!existing) return;

		// Null out seriesId on past rows; delete the upcoming row outright.
		const now = Date.now();
		const future = await ctx.db
			.query("appointments")
			.withIndex("by_series_and_startTime", (q) =>
				q.eq("seriesId", args.id).gte("startTime", now),
			)
			.collect();
		for (const row of future) {
			if (row.status === "upcoming") {
				await ctx.db.delete(row._id);
			} else {
				await ctx.db.patch(row._id, { seriesId: undefined });
			}
		}
		const past = await ctx.db
			.query("appointments")
			.withIndex("by_series_and_startTime", (q) =>
				q.eq("seriesId", args.id).lt("startTime", now),
			)
			.collect();
		for (const row of past) {
			await ctx.db.patch(row._id, { seriesId: undefined });
		}
		await ctx.db.delete(args.id);
	},
});

export const ensureNextOccurrences = internalMutation({
	args: {},
	handler: async (ctx): Promise<void> => {
		const active = await ctx.db
			.query("recurringSeries")
			.withIndex("by_active", (q) => q.eq("isActive", true))
			.collect();
		for (const series of active) {
			await ensureNextOccurrence(ctx, series._id);
		}
	},
});
```

- [ ] **Step 2: Push to Convex**

Run: `bunx convex dev --once`

Expected: deploys successfully; new functions show up under `api.recurringSeries.*`.

- [ ] **Step 3: Typecheck + lint**

Run: `bunx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 4: Manual smoke via Convex dashboard**

Open the Convex dashboard for the dev deployment. Call `api.recurringSeries.create` with:
```json
{ "title": "Test Virkni", "daysOfWeek": [2, 5], "timeOfDay": "09:15", "location": "Fífan" }
```

Expected: returns a `recurringSeries` id. Calling `api.recurringSeries.list` shows it. An `appointments` row with `seriesId` set appears for the next Tuesday or Friday 09:15 UTC. Clean it up afterward via the dashboard (delete the appointment, then the series via `api.recurringSeries.remove`).

- [ ] **Step 5: Commit**

```bash
# /qa
git add convex/recurringSeries.ts
git commit -m "convex: recurringSeries CRUD + ensureNextOccurrence invariant"
```

---

## Task 4: Appointment status-hook + daily safety cron

**Files:**
- Modify: `convex/appointments.ts`
- Create: `convex/crons.ts`

- [ ] **Step 1: Update `convex/appointments.ts` to call `ensureNextOccurrence` on status transitions**

Apply these edits:

Add this import near the top (after existing imports):
```ts
import { ensureNextOccurrence } from "./recurringSeries";
```

Replace the body of `update` so that after the `ctx.db.patch(...)` call it checks whether a series-bound appointment has just left the `"upcoming"` state. The final handler body:

```ts
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
```

Replace `remove` similarly so deletion of a series-bound upcoming appointment also spawns the next:

```ts
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
```

- [ ] **Step 2: Create the cron registration**

Path: `convex/crons.ts`

```ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"ensure recurring appointment occurrences",
	{ hourUTC: 0, minuteUTC: 10 },
	internal.recurringSeries.ensureNextOccurrences,
);

export default crons;
```

- [ ] **Step 3: Push to Convex**

Run: `bunx convex dev --once`

Expected: deploy succeeds, cron appears in the Convex dashboard under "Schedule".

- [ ] **Step 4: Typecheck + lint**

Run: `bunx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 5: Manual smoke**

In the dashboard:
1. Create a series via `api.recurringSeries.create` as in Task 3.
2. Locate the spawned appointment in the `appointments` table.
3. Call `api.appointments.update` on that id with `{ status: "cancelled" }`.
4. Verify a *new* upcoming appointment appears for the next matching date, and the cancelled row is still present but non-upcoming.
5. Clean up: `api.recurringSeries.remove` on the series id (this removes the upcoming row and nulls `seriesId` on the cancelled one).

- [ ] **Step 6: Commit**

```bash
# /qa
git add convex/appointments.ts convex/crons.ts
git commit -m "convex: spawn next series occurrence on status change + daily safety cron"
```

---

## Task 5: i18n strings + shadcn Switch install

**Files:**
- Modify: `messages/is.json`, `messages/en.json`
- Create: `src/components/ui/switch.tsx` (via shadcn CLI)

- [ ] **Step 1: Install the shadcn Switch primitive**

Run: `bunx shadcn@latest add switch`

Expected: a new file `src/components/ui/switch.tsx` is created. Accept the default prompts.

- [ ] **Step 2: Add the `recurring` namespace to `messages/is.json`**

Open `messages/is.json`. After the `"timar"` block (ending at the `}` that closes `"errors"` → the `"timar"` object), insert:

```json
	"recurring": {
		"title": "Reglulegir tímar",
		"backToTimar": "Tímar",
		"entryLabel": "Reglulegir tímar",
		"entryCount": "{count, plural, =0 {engir ennþá} =1 {1 virkur} other {# virkir}}",
		"entryAllPaused": "Allir í hléi",
		"empty": {
			"title": "Engir reglulegir tímar",
			"body": "Reglulegir tímar sem endurtaka sig — t.d. Virkni og Vellíðan — birtast hér."
		},
		"newButton": "Nýr reglulegur tími",
		"active": "Virkt",
		"paused": "Í hléi",
		"edit": "Breyta",
		"delete": "Eyða",
		"deleteConfirm": {
			"title": "Eyða {title}?",
			"body": "Eldri tímar verða áfram sýnilegir í Liðnir tímar.",
			"confirm": "Eyða",
			"cancel": "Hætta við"
		},
		"pauseToast": "{title} sett í hlé",
		"resumeToast": "Næsti tími: {when}",
		"form": {
			"createTitle": "Nýr reglulegur tími",
			"editTitle": "Breyta reglulegum tíma",
			"editNextNote": "Næsti tími uppfærist ekki sjálfkrafa. Ef þú vilt breyta tímanum sem er á dagskrá, breyttu honum beint í Tímar.",
			"fields": {
				"title": "Heiti",
				"days": "Dagar",
				"time": "Tími",
				"duration": "Lengd í mínútum",
				"durationHint": "Sjálfgefið: engin skráning.",
				"location": "Staðsetning",
				"notes": "Athugasemdir"
			},
			"daysShort": { "0": "Sun", "1": "Mán", "2": "Þri", "3": "Mið", "4": "Fim", "5": "Fös", "6": "Lau" },
			"daysLong": { "0": "sunnudaga", "1": "mánudaga", "2": "þriðjudaga", "3": "miðvikudaga", "4": "fimmtudaga", "5": "föstudaga", "6": "laugardaga" },
			"errors": {
				"titleRequired": "Heiti má ekki vera tómt.",
				"daysRequired": "Veldu að minnsta kosti einn dag.",
				"timeRequired": "Veldu tíma.",
				"generic": "Ekki tókst að vista."
			}
		},
		"cadence": "{days} kl. {time}"
	},
```

- [ ] **Step 3: Add the English mirror to `messages/en.json`**

Insert, in the matching position:

```json
	"recurring": {
		"title": "Recurring appointments",
		"backToTimar": "Appointments",
		"entryLabel": "Recurring appointments",
		"entryCount": "{count, plural, =0 {none yet} =1 {1 active} other {# active}}",
		"entryAllPaused": "All paused",
		"empty": {
			"title": "No recurring appointments",
			"body": "Repeating appointments — e.g. Activity & Wellbeing — appear here."
		},
		"newButton": "New recurring appointment",
		"active": "Active",
		"paused": "Paused",
		"edit": "Edit",
		"delete": "Delete",
		"deleteConfirm": {
			"title": "Delete {title}?",
			"body": "Past appointments remain visible in the Past tab.",
			"confirm": "Delete",
			"cancel": "Cancel"
		},
		"pauseToast": "{title} paused",
		"resumeToast": "Next: {when}",
		"form": {
			"createTitle": "New recurring appointment",
			"editTitle": "Edit recurring appointment",
			"editNextNote": "The next scheduled occurrence is not updated automatically. Edit it directly in Appointments if needed.",
			"fields": {
				"title": "Title",
				"days": "Days",
				"time": "Time",
				"duration": "Duration (minutes)",
				"durationHint": "Default: none.",
				"location": "Location",
				"notes": "Notes"
			},
			"daysShort": { "0": "Sun", "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu", "5": "Fri", "6": "Sat" },
			"daysLong": { "0": "Sundays", "1": "Mondays", "2": "Tuesdays", "3": "Wednesdays", "4": "Thursdays", "5": "Fridays", "6": "Saturdays" },
			"errors": {
				"titleRequired": "Title is required.",
				"daysRequired": "Choose at least one day.",
				"timeRequired": "Choose a time.",
				"generic": "Could not save."
			}
		},
		"cadence": "{days} at {time}"
	},
```

- [ ] **Step 4: Format + lint**

Run: `bun run format && bun run lint`

Expected: JSON reformatted consistently; no errors.

- [ ] **Step 5: Commit**

```bash
git add messages/is.json messages/en.json src/components/ui/switch.tsx components.json
git commit -m "ui: install Switch; i18n: add recurring namespace [skip-qa]"
```

---

## Task 6: Refactor `AppointmentCard` to borderless Bókasafn aesthetic

**Files:**
- Modify: `src/components/appointments/AppointmentCard.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the contents of `src/components/appointments/AppointmentCard.tsx` with:

```tsx
"use client";

import { useMutation } from "convex/react";
import { BookOpen, MapPin, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

type AppointmentDoc = Doc<"appointments">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type AppointmentWithDriver = AppointmentDoc & { driver: UserSummary | null };

type AppointmentCardProps = {
	appointment: AppointmentWithDriver;
	variant: "upcoming" | "past";
	onEdit: () => void;
	onLogEntry?: (id: Id<"appointments">) => void;
};

export function AppointmentCard({
	appointment,
	variant,
	onEdit,
	onLogEntry,
}: AppointmentCardProps) {
	const t = useTranslations("timar");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const volunteer = useMutation(api.appointments.volunteerToDrive);
	const [volunteering, setVolunteering] = useState(false);

	async function handleVolunteer() {
		setVolunteering(true);
		try {
			await volunteer({ id: appointment._id });
		} finally {
			setVolunteering(false);
		}
	}

	return (
		<article className="flex flex-col gap-4 rounded-2xl bg-paper px-5 py-5 ring-1 ring-foreground/10">
			<div className="flex items-start gap-3">
				<div className="flex-1 min-w-0">
					<div className="text-sm text-ink-faint">
						{formatAbsoluteWithTime(appointment.startTime, locale)}
					</div>
					<h3 className="mt-0.5 font-serif text-lg leading-snug text-ink">
						{appointment.title}
					</h3>
					{appointment.location ? (
						<div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
							<MapPin size={16} aria-hidden />
							<span>{appointment.location}</span>
						</div>
					) : null}
					{appointment.notes ? (
						<p className="mt-2 text-base whitespace-pre-wrap line-clamp-3 text-ink/90">
							{appointment.notes}
						</p>
					) : null}
				</div>
				<Button
					variant="ghost"
					size="touch-icon"
					onClick={onEdit}
					aria-label={tCommon("edit")}
					className="-my-1 -mr-1"
				>
					<Pencil aria-hidden />
				</Button>
			</div>

			<div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
				{appointment.driver ? (
					<div className="flex items-center gap-2 min-w-0">
						<UserAvatar
							name={appointment.driver.name}
							email={appointment.driver.email}
							imageUrl={appointment.driver.image}
							className="size-8"
						/>
						<span className="text-base text-ink-soft truncate">
							{appointment.driver.name ??
								appointment.driver.email ??
								t("fields.driver")}
						</span>
					</div>
				) : variant === "upcoming" ? (
					<>
						<span className="text-base text-ink-faint">
							{t("fields.noDriverAssigned")}
						</span>
						<Button
							size="touch"
							onClick={handleVolunteer}
							disabled={volunteering}
						>
							{t("volunteer")}
						</Button>
					</>
				) : (
					<span className="text-base text-ink-faint">
						{t("fields.noDriverAssigned")}
					</span>
				)}

				{variant === "past" && onLogEntry ? (
					<Button
						variant="outline"
						size="touch"
						onClick={() => onLogEntry(appointment._id)}
					>
						<BookOpen aria-hidden />
						<span>{t("logEntry")}</span>
					</Button>
				) : null}
			</div>
		</article>
	);
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `bunx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 3: Manual verify**

Run `bun dev` and `bunx convex dev` in two terminals. Open `/timar` — both tabs. Expected:
- Upcoming cards now show paper background (`--paper`), soft ring, no hard border; serif title; softer `text-ink-faint` muted text.
- Volunteer button and edit pencil still work.
- Past cards show "Skrá í dagbók" button and no volunteer CTA.

- [ ] **Step 4: Commit**

```bash
# /qa
git add src/components/appointments/AppointmentCard.tsx
git commit -m "ui(timar): refactor AppointmentCard to borderless Bókasafn aesthetic"
```

---

## Task 7: Day picker + Series form sheet

**Files:**
- Create: `src/components/recurringSeries/DayPicker.tsx`
- Create: `src/components/recurringSeries/SeriesForm.tsx`

- [ ] **Step 1: Create `DayPicker`**

Path: `src/components/recurringSeries/DayPicker.tsx`

```tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type DayPickerProps = {
	value: number[];
	onChange: (next: number[]) => void;
	disabled?: boolean;
};

export function DayPicker({ value, onChange, disabled }: DayPickerProps) {
	const t = useTranslations("recurring.form.daysShort");
	const selected = new Set(value);

	function toggle(day: number) {
		const next = new Set(selected);
		if (next.has(day)) next.delete(day);
		else next.add(day);
		onChange(Array.from(next).sort((a, b) => a - b));
	}

	// Icelandic week starts on Sunday in our day-of-week numbering (matches Date.getUTCDay).
	const order = [0, 1, 2, 3, 4, 5, 6];
	return (
		<div
			className="grid grid-cols-7 gap-1.5"
			role="group"
			aria-label="Dagar"
		>
			{order.map((day) => {
				const active = selected.has(day);
				return (
					<button
						key={day}
						type="button"
						aria-pressed={active}
						disabled={disabled}
						onClick={() => toggle(day)}
						className={cn(
							"h-12 rounded-full text-sm font-medium transition-colors",
							active
								? "bg-sage-deep text-paper"
								: "bg-paper-deep text-ink-soft hover:text-ink",
							disabled && "opacity-50",
						)}
					>
						{t(String(day))}
					</button>
				);
			})}
		</div>
	);
}
```

- [ ] **Step 2: Create `SeriesForm`**

Path: `src/components/recurringSeries/SeriesForm.tsx`

```tsx
"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DayPicker } from "./DayPicker";

type SeriesDoc = Doc<"recurringSeries">;

type SeriesFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editSeries?: SeriesDoc | null;
};

export function SeriesForm({ open, onOpenChange, editSeries }: SeriesFormProps) {
	const t = useTranslations("recurring");
	const tCommon = useTranslations("common");
	const create = useMutation(api.recurringSeries.create);
	const update = useMutation(api.recurringSeries.update);

	const [title, setTitle] = useState("");
	const [days, setDays] = useState<number[]>([]);
	const [time, setTime] = useState("09:00");
	const [duration, setDuration] = useState("");
	const [location, setLocation] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (editSeries) {
			setTitle(editSeries.title);
			setDays([...editSeries.daysOfWeek].sort((a, b) => a - b));
			setTime(editSeries.timeOfDay);
			setDuration(
				editSeries.durationMinutes !== undefined
					? String(editSeries.durationMinutes)
					: "",
			);
			setLocation(editSeries.location ?? "");
			setNotes(editSeries.notes ?? "");
		} else {
			setTitle("");
			setDays([]);
			setTime("09:00");
			setDuration("");
			setLocation("");
			setNotes("");
		}
	}, [open, editSeries]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) {
			setError(t("form.errors.titleRequired"));
			return;
		}
		if (days.length === 0) {
			setError(t("form.errors.daysRequired"));
			return;
		}
		if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
			setError(t("form.errors.timeRequired"));
			return;
		}
		const durationMinutes =
			duration.trim().length > 0 ? Number(duration) : undefined;
		if (durationMinutes !== undefined && !Number.isFinite(durationMinutes)) {
			setError(t("form.errors.generic"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (editSeries) {
				await update({
					id: editSeries._id,
					title: trimmedTitle,
					daysOfWeek: days,
					timeOfDay: time,
					durationMinutes: duration.trim().length > 0 ? durationMinutes : null,
					location: location.trim() || null,
					notes: notes.trim() || null,
				});
			} else {
				await create({
					title: trimmedTitle,
					daysOfWeek: days,
					timeOfDay: time,
					durationMinutes,
					location: location.trim() || undefined,
					notes: notes.trim() || undefined,
				});
			}
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("form.errors.generic"));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="max-h-[95vh] overflow-y-auto rounded-t-2xl"
				showCloseButton={false}
			>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
				>
					<SheetHeader className="p-0">
						<SheetTitle className="font-serif text-xl">
							{editSeries ? t("form.editTitle") : t("form.createTitle")}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{editSeries ? t("form.editTitle") : t("form.createTitle")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-title" className="text-base font-medium">
							{t("form.fields.title")}
						</Label>
						<Input
							id="series-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="h-12 text-base"
							required
							autoFocus
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="text-base font-medium">
							{t("form.fields.days")}
						</Label>
						<DayPicker value={days} onChange={setDays} disabled={saving} />
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-time" className="text-base font-medium">
							{t("form.fields.time")}
						</Label>
						<Input
							id="series-time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="h-12 text-base"
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-duration" className="text-base font-medium">
							{t("form.fields.duration")}
						</Label>
						<Input
							id="series-duration"
							type="number"
							min={1}
							max={1440}
							inputMode="numeric"
							value={duration}
							onChange={(e) => setDuration(e.target.value)}
							className="h-12 text-base"
						/>
						<p className="text-sm text-ink-faint">
							{t("form.fields.durationHint")}
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-location" className="text-base font-medium">
							{t("form.fields.location")}
						</Label>
						<Input
							id="series-location"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							className="h-12 text-base"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-notes" className="text-base font-medium">
							{t("form.fields.notes")}
						</Label>
						<Textarea
							id="series-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="min-h-24 resize-none text-base"
						/>
					</div>

					{editSeries ? (
						<p className="text-sm text-ink-faint">{t("form.editNextNote")}</p>
					) : null}

					{error ? (
						<p className="text-base text-destructive" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex gap-3 pt-2">
						<Button
							type="button"
							variant="outline"
							size="touch"
							onClick={() => onOpenChange(false)}
							disabled={saving}
							className="flex-1"
						>
							{tCommon("cancel")}
						</Button>
						<Button
							type="submit"
							size="touch"
							disabled={saving || title.trim().length === 0 || days.length === 0}
							className="flex-1"
						>
							{saving ? tCommon("saving") : tCommon("save")}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `bunx tsc --noEmit && bun run lint`

Expected: no errors (no consumers yet — only compilation).

- [ ] **Step 4: Commit**

```bash
git add src/components/recurringSeries/DayPicker.tsx src/components/recurringSeries/SeriesForm.tsx
git commit -m "ui(recurring): add DayPicker + SeriesForm sheet [skip-qa]"
```

---

## Task 8: `SeriesCard` + `SeriesList` + the management page route

**Files:**
- Create: `src/components/recurringSeries/SeriesCard.tsx`
- Create: `src/components/recurringSeries/SeriesList.tsx`
- Create: `src/app/[locale]/(app)/timar/reglulegir/page.tsx`
- Create: `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx`

- [ ] **Step 1: Create `SeriesCard`**

Path: `src/components/recurringSeries/SeriesCard.tsx`

```tsx
"use client";

import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatDays } from "@/lib/formatRecurrence";
import { cn } from "@/lib/utils";

type SeriesDoc = Doc<"recurringSeries">;

type SeriesCardProps = {
	series: SeriesDoc;
	onEdit: () => void;
};

export function SeriesCard({ series, onEdit }: SeriesCardProps) {
	const t = useTranslations("recurring");
	const tLong = useTranslations("recurring.form.daysLong");
	const locale = useLocale();
	const setActive = useMutation(api.recurringSeries.setActive);
	const remove = useMutation(api.recurringSeries.remove);
	const [pending, setPending] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const longLabels: Record<number, string> = {
		0: tLong("0"),
		1: tLong("1"),
		2: tLong("2"),
		3: tLong("3"),
		4: tLong("4"),
		5: tLong("5"),
		6: tLong("6"),
	};
	const daysLabel = formatDays(series.daysOfWeek, longLabels, locale);
	const cadence = t("cadence", { days: daysLabel, time: series.timeOfDay });

	async function handleToggle(next: boolean) {
		setPending(true);
		try {
			await setActive({ id: series._id, isActive: next });
		} finally {
			setPending(false);
		}
	}

	async function handleDelete() {
		setPending(true);
		try {
			await remove({ id: series._id });
			setConfirmDelete(false);
		} finally {
			setPending(false);
		}
	}

	return (
		<article className="flex flex-col gap-4 rounded-2xl bg-paper px-5 py-5 ring-1 ring-foreground/10">
			<div className="flex flex-col gap-1.5">
				<h3 className="font-serif text-lg leading-snug text-ink">
					{series.title}
				</h3>
				<p
					className={cn(
						"text-sm",
						series.isActive ? "text-ink-soft" : "text-ink-faint",
					)}
				>
					{cadence}
				</p>
				{series.location ? (
					<p className="text-sm text-ink-faint">{series.location}</p>
				) : null}
			</div>

			<div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
				<label className="flex items-center gap-3">
					<Switch
						checked={series.isActive}
						onCheckedChange={handleToggle}
						disabled={pending}
						aria-label={series.isActive ? t("active") : t("paused")}
					/>
					<span className="text-base text-ink-soft">
						{series.isActive ? t("active") : t("paused")}
					</span>
				</label>

				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						size="touch"
						onClick={onEdit}
						disabled={pending}
					>
						{t("edit")}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="touch"
						onClick={() => setConfirmDelete(true)}
						disabled={pending}
						className="text-destructive"
					>
						{t("delete")}
					</Button>
				</div>
			</div>

			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<DialogContent className="max-w-sm" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle className="text-xl">
							{t("deleteConfirm.title", { title: series.title })}
						</DialogTitle>
						<DialogDescription className="text-base">
							{t("deleteConfirm.body")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							variant="destructive"
							size="touch"
							onClick={handleDelete}
							disabled={pending}
						>
							{t("deleteConfirm.confirm")}
						</Button>
						<Button
							variant="outline"
							size="touch"
							onClick={() => setConfirmDelete(false)}
							disabled={pending}
						>
							{t("deleteConfirm.cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</article>
	);
}
```

- [ ] **Step 2: Create `SeriesList`**

Path: `src/components/recurringSeries/SeriesList.tsx`

```tsx
"use client";

import { useQuery } from "convex/react";
import { CalendarRange, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SeriesCard } from "./SeriesCard";
import { SeriesForm } from "./SeriesForm";

type SeriesDoc = Doc<"recurringSeries">;

export function SeriesList() {
	const t = useTranslations("recurring");
	const tCommon = useTranslations("common");
	const series = useQuery(api.recurringSeries.list);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<SeriesDoc | null>(null);

	const loading = series === undefined;

	return (
		<>
			{loading ? (
				<p className="text-ink-faint py-2">{tCommon("loading")}</p>
			) : series.length === 0 ? (
				<EmptyState
					icon={<CalendarRange size={40} aria-hidden />}
					title={t("empty.title")}
					body={t("empty.body")}
				/>
			) : (
				<ul className="flex flex-col gap-3">
					{series.map((row) => (
						<li key={row._id}>
							<SeriesCard series={row} onEdit={() => setEditTarget(row)} />
						</li>
					))}
				</ul>
			)}

			<div className="pt-2">
				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="w-full"
				>
					<Plus aria-hidden />
					<span>{t("newButton")}</span>
				</Button>
			</div>

			<SeriesForm open={createOpen} onOpenChange={setCreateOpen} />
			<SeriesForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editSeries={editTarget}
			/>
		</>
	);
}
```

- [ ] **Step 3: Confirm `EmptyState` accepts a `body` prop**

Run: `bunx tsc --noEmit`

If the typecheck reports `body` is not a known prop on `EmptyState`, open `src/components/shared/EmptyState.tsx` and add support for an optional `body?: string` below any existing `title` prop — render it as `<p className="text-sm text-ink-faint mt-1">{body}</p>` inside the existing layout. Re-run typecheck. If `EmptyState` already accepts `body` or `description`, use whatever name exists instead and adjust `SeriesList`.

- [ ] **Step 4: Create the server page**

Path: `src/app/[locale]/(app)/timar/reglulegir/page.tsx`

```tsx
import { setRequestLocale } from "next-intl/server";
import { ReglulegirView } from "./ReglulegirView";

export default async function ReglulegirPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <ReglulegirView />;
}
```

- [ ] **Step 5: Create the client view**

Path: `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx`

```tsx
"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { SeriesList } from "@/components/recurringSeries/SeriesList";
import { Link } from "@/i18n/navigation";

export function ReglulegirView() {
	const t = useTranslations("recurring");

	return (
		<div className="px-4 py-6 pb-28 flex flex-col gap-6">
			<Link
				href="/timar"
				className="inline-flex items-center gap-1 text-sm text-ink-faint hover:text-ink-soft transition-colors"
			>
				<ChevronLeft size={18} aria-hidden />
				<span>{t("backToTimar")}</span>
			</Link>
			<h2 className="font-serif text-3xl font-normal tracking-tight text-ink">
				{t("title")}
			</h2>
			<SeriesList />
		</div>
	);
}
```

- [ ] **Step 6: Typecheck + lint**

Run: `bunx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 7: Manual verify**

Run `bun dev` and `bunx convex dev`. Navigate to `/timar/reglulegir`:
- Empty state renders with `CalendarRange` icon, title "Engir reglulegir tímar", body copy.
- Tap "Nýr reglulegur tími" → sheet opens with title, day picker (seven chips), time (default 09:00), duration, location, notes.
- Select Tue + Fri, time 09:15, title "Virkni og Vellíðan", location "Fífan", tap Vista.
- Back on the list, the card appears with "þriðjudaga og föstudaga kl. 09:15" and location.
- Toggle Switch to "Í hléi" → confirm via `bunx convex dashboard` that the upcoming appointment row disappears from `appointments`. Toggle back → new upcoming row reappears.
- Tap "Eyða" → dialog shows correct title. Confirm → card disappears; any spawned upcoming row is gone.
- Re-create one for the next step (leaving the Virkni series in place is fine).

- [ ] **Step 8: Commit**

```bash
# /qa
git add src/components/recurringSeries/SeriesCard.tsx src/components/recurringSeries/SeriesList.tsx src/app/\[locale\]/\(app\)/timar/reglulegir/ src/components/shared/EmptyState.tsx
git commit -m "ui(recurring): series management page with pause/play + delete"
```

(If `EmptyState.tsx` did not need changes, drop that path from `git add`.)

---

## Task 9: `SeriesEntryRow` on the Tímar page

**Files:**
- Create: `src/components/timar/SeriesEntryRow.tsx`
- Modify: `src/app/[locale]/(app)/timar/TimarView.tsx`

- [ ] **Step 1: Create the entry row**

Path: `src/components/timar/SeriesEntryRow.tsx`

```tsx
"use client";

import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { Link } from "@/i18n/navigation";

export function SeriesEntryRow() {
	const t = useTranslations("recurring");
	const series = useQuery(api.recurringSeries.list);

	const activeCount =
		series === undefined ? undefined : series.filter((s) => s.isActive).length;
	const hasAnyPaused =
		series !== undefined && series.length > 0 && activeCount === 0;

	const subtitle =
		activeCount === undefined
			? ""
			: hasAnyPaused
				? t("entryAllPaused")
				: t("entryCount", { count: activeCount });

	return (
		<Link
			href="/timar/reglulegir"
			className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-paper px-5 py-4 ring-1 ring-foreground/10 transition-colors hover:bg-paper-deep/60"
		>
			<div className="flex flex-col">
				<span className="font-serif text-base text-ink">
					{t("entryLabel")}
				</span>
				<span className="text-sm text-ink-faint">{subtitle}</span>
			</div>
			<ChevronRight size={20} className="text-ink-faint" aria-hidden />
		</Link>
	);
}
```

- [ ] **Step 2: Insert it into `TimarView`**

Replace `src/app/[locale]/(app)/timar/TimarView.tsx` with:

```tsx
"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { SeriesEntryRow } from "@/components/timar/SeriesEntryRow";
import { Button } from "@/components/ui/button";

export function TimarView() {
	const t = useTranslations("timar");
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<>
			<div className="px-4 py-6 pb-28 flex flex-col gap-6">
				<h2 className="text-3xl font-semibold">{t("title")}</h2>
				<SeriesEntryRow />
				<AppointmentList />
			</div>
			<div
				className="fixed inset-x-0 bottom-16 z-20 flex justify-end px-4 pb-2"
				style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
			>
				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="shadow-lg"
				>
					<Plus aria-hidden />
					<span>{t("new")}</span>
				</Button>
			</div>
			<AppointmentForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `bunx tsc --noEmit && bun run lint`

Expected: no errors.

- [ ] **Step 4: Manual verify**

On `/timar`:
- The "Reglulegir tímar" row appears above the tabs, showing the current active count (e.g. "1 virkur").
- Tapping it navigates to `/timar/reglulegir`.
- Create a second series (or pause the existing one) — the count updates live via Convex subscription.
- When all are paused: copy reads "Allir í hléi". When none exist: "engir ennþá".

Also verify the dashboard (`/`) shows the series-spawned appointment as the next upcoming and that the volunteer prompt works once (driver is filled in; no second prompt appears for any other occurrence of the same series, because only one exists).

- [ ] **Step 5: Commit**

```bash
# /qa
git add src/components/timar/SeriesEntryRow.tsx src/app/\[locale\]/\(app\)/timar/TimarView.tsx
git commit -m "ui(timar): surface Reglulegir tímar entry row above tabs"
```

---

## Task 10: Docs sync + final verification pass

**Files:**
- Modify: `docs/spec.md`
- Modify: `docs/implementation-plan.md`

- [ ] **Step 1: Run the docs-sync agent**

Invoke the `docs-sync` subagent (`Agent` tool with `subagent_type: "docs-sync"`) or `/docs-check` with this prompt:

> Reconcile `docs/spec.md` and `docs/implementation-plan.md` with the newly-shipped recurring-appointments feature. Authoritative source: `docs/superpowers/specs/2026-04-18-recurring-appointments-design.md`. Document the new `recurringSeries` table, the new `seriesId` field + `by_series_and_startTime` index on `appointments`, the Convex functions in `convex/recurringSeries.ts`, the daily safety cron, the `/timar/reglulegir` route and its components, the borderless refactor of `AppointmentCard`, and the new `recurring` i18n namespace. Insert a new phase in the implementation plan between the current Phase 8 wrap-up and Phase 9 called "Reglulegir tímar (Recurring appointments)" with an exit-criteria checklist. Do not invent behaviour beyond what's in the spec or the shipped code.

- [ ] **Step 2: Review the doc diff**

Inspect the diff. Confirm:
- `docs/spec.md` schema section lists `recurringSeries` with all fields and the new `seriesId` / index on `appointments`.
- Function contracts for `recurringSeries.*` match the implementation.
- The new Tímar entry row + `/timar/reglulegir` management page are described in the view sections.
- The "Do NOT build (v2)" section does not contradict the spec's explicit out-of-scope list.

Fix any drift manually if the agent was over-generous or missed a detail.

- [ ] **Step 3: Final end-to-end manual run**

With `bun dev` + `bunx convex dev`:
- Dashboard: the next Virkni occurrence shows; "Enginn skutlar" volunteer button works; driver persists.
- Tímar: entry row shows active count; the upcoming Virkni appointment appears once in "Næstu tímar".
- Create a second series "Sjúkraþjálfun" mánudaga kl. 10:00 — appears in Reglulegir tímar, spawns one upcoming appointment.
- Cancel the Virkni upcoming appointment via its edit sheet (change status to `cancelled` via a quick direct Convex dashboard call, since the UI exposes delete rather than status-cancel): verify the next Virkni appointment appears. Alternatively: delete the appointment and verify the hook in `appointments.remove` spawns the next.
- Two browser tabs: pause Virkni in one; confirm the upcoming row disappears from `/timar` in the other without refresh.

- [ ] **Step 4: Commit docs**

```bash
git add docs/spec.md docs/implementation-plan.md
git commit -m "docs-sync: document recurring appointments feature [skip-qa]"
```

- [ ] **Step 5: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to choose merge / PR / keep / discard.

---

## Self-review checklist

- **Spec coverage:**
  - Schema (`recurringSeries`, `seriesId`, index) → Task 1.
  - `ensureNextOccurrence` helper + idempotence → Task 3.
  - Four trigger sites (create, resume, status-change, cron) → Tasks 3 + 4.
  - Pause deletes upcoming row → Task 3 (`setActive` + `deleteUpcomingOccurrence`).
  - Delete nulls `seriesId` on past rows → Task 3 (`remove`).
  - Cancelling a single occurrence spawns next → Task 4 (`update` + `remove` hooks).
  - Daily safety cron → Task 4.
  - Borderless Bókasafn refactor of `AppointmentCard` → Task 6.
  - Series management route + list + card + form + day picker → Tasks 7 + 8.
  - Tímar entry-point row with live count → Task 9.
  - i18n `recurring` namespace (both locales) → Task 5.
  - Docs sync → Task 10.
- **Placeholder scan:** No TBDs, no "implement error handling" hand-waves. Every step has concrete code or a concrete command.
- **Type consistency:**
  - `ensureNextOccurrence(ctx: MutationCtx, seriesId: Id<"recurringSeries">)` — used identically in `appointments.ts` (Task 4) and `recurringSeries.ts` (Task 3).
  - `setActive` / `remove` / `update` / `create` signatures on `api.recurringSeries.*` match what `SeriesForm`, `SeriesCard`, and `SeriesList` call.
  - `formatDays` signature in `src/lib/formatRecurrence.ts` matches the call site in `SeriesCard`.
  - `SeriesFormProps.editSeries: Doc<"recurringSeries"> | null` consumed uniformly in `SeriesList` (passes either `null` or the row).
- **Testing:** No automated suites in this plan — matches the project's current phase (tests land in Phase 14). Manual verification steps are included per task.
