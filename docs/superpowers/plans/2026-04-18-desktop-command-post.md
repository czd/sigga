# Desktop Command Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reshape the desktop experience of the Sigga PWA from "mobile with a sidebar" into a genuine coordination surface (the "Command Post" design). Multi-pane layouts on the surfaces that benefit; a week-grid hero on Tímar with drag-to-reassign; always-visible composer on Dagbók; 4-column kanban on Réttindi; list-detail on Fólk and Pappírar-Skjöl; enriched Sidebar with mini week-calendar and attention badges. Mobile stays exactly as shipped.

**Architecture:** Three responsive tiers (`base` <768 px mobile, `md` 768–1279 px sidebar + single column, `xl` ≥1280 px multi-pane). Two layout primitives: `<StackLayout>` and `<PaneLayout>`. Shared `navItems.ts` feeds both `BottomNav` and `Sidebar`. Selection via `?id=` URL params. Drag-and-drop via `@dnd-kit`. New body-density token `--text-body-dense: 16px`. Bókasafn palette, typography, radii, and soft dividers preserved.

**Tech Stack:** Next.js 16 (App Router) · React 19 client components · Tailwind CSS 4 via `@theme inline` · shadcn/ui · Convex + `@convex-dev/auth` · `next-intl` · `@dnd-kit/core` + `@dnd-kit/sortable` (new) · Bun · Biome.

**Source spec:** `docs/superpowers/specs/2026-04-18-desktop-command-post-design.md` (read sections referenced from each task).

**Branch context:**

- Working branch: `claude/desktop-command-post`, stacked on `claude/desktop-support` (PR #3).
- The PR that closes this plan will target `claude/desktop-support` as its base (stacked PR). When PR #3 merges to `main`, the Command Post PR automatically rebases clean.

**Process notes for the executor:**

- Every code commit passes the project's QA gate. Inside subagents, `/tmp/sigga-qa-passed` must be written after inline checks (typecheck + lint + diff-stat) before `git commit`. For meatier tasks, dispatch the actual `qa` agent from the parent controller if possible.
- Run `bunx tsc --noEmit && bun run lint` after each task.
- Do not push to `origin/main`, do not push any branch until the final task.
- Do not add dependencies outside `@dnd-kit/core` and `@dnd-kit/sortable`. All other work uses existing tooling.
- Every user-facing string goes through `useTranslations()` from next-intl; new keys land in both `messages/is.json` and `messages/en.json` (Icelandic authored first; English is the proofread mirror).
- All `useQuery(api.*)` calls are subject to `requireAuth` on the server; `users.me` is the documented exception that returns `null` for unauthenticated callers.
- The Bókasafn aesthetic rules from the design doc are hard constraints. If a step "feels like" it could introduce a new visual motif (borders between panes, hover overlays, shrinking tap targets, density toggle), it can't.

---

## File Structure Overview

**New files (~14):**

| File | Task | Responsibility |
| --- | --- | --- |
| `src/components/nav/navItems.ts` | T2 | `PRIMARY_ITEMS` + `isActiveRoute` |
| `src/components/layout/StackLayout.tsx` | T4 | Single-column responsive wrapper |
| `src/components/layout/PaneLayout.tsx` | T4 | `list` / `detail` / `rail` grid wrapper |
| `src/components/nav/SidebarAttentionBadge.tsx` | T6 | Numeric pill on Sidebar nav items |
| `src/components/nav/SidebarWeekCalendar.tsx` | T7 | Mini 7-day strip under sidebar nav |
| `src/components/dashboard/WeekStrip.tsx` | T9 | Dashboard 7-day hero |
| `src/components/dashboard/SinceLastVisit.tsx` | T10 | Dashboard activity feed |
| `src/components/timar/WeekGrid.tsx` | T12 | Tímar 7-column grid (no DnD) |
| `src/components/timar/TimarDetail.tsx` | T13 | Detail pane for selected appointment |
| `src/components/log/LogComposer.tsx` | T16 | Persistent desktop composer |
| `src/components/log/LogEntryReader.tsx` | T16 | Detail for selected log entry |
| `src/components/info/EntitlementKanban.tsx` | T18 | 4-column board + DnD |
| `src/components/info/DocumentDetail.tsx` | T19 | Skjöl detail/preview pane |
| `src/components/info/ContactDetail.tsx` | T20 | Fólk detail pane |
| `convex/activity.ts` | T5 | `sinceLastVisit` query |

**Modified files (~18):**

| File | Tasks | Summary |
| --- | --- | --- |
| `package.json` | T1 | Add `@dnd-kit/*` deps |
| `src/app/globals.css` | T1 | `--text-body-dense` token |
| `src/components/nav/BottomNav.tsx` | T2, T3, T6 | Import shared items, `md:hidden`, mobile attention dots |
| `src/components/nav/Sidebar.tsx` | T2, T3, T6, T7 | Import shared items, `md:flex`, attention badges, week-cal |
| `src/components/shared/Header.tsx` | T3 | `md:hidden` |
| `src/app/[locale]/(app)/layout.tsx` | T3, T8 | `md:` offsets; drop inner div |
| `convex/users.ts` | T5 | Add `attentionCounts` |
| `convex/appointments.ts` | T5 | Add `byWeek` + `get` if missing; extend `update` for driverId |
| `convex/{contacts,documents,entitlements,logEntries}.ts` | T5 | Add `get` if missing |
| Each of 6 `page.tsx` under `(app)/*` | T8 | Swap `lg:max-w-[704px]` wrappers for `<StackLayout>` |
| `src/app/[locale]/(app)/page.tsx` (dashboard) | T11 | Two-column at `xl:` |
| `src/components/appointments/AppointmentList.tsx` | T13 | Accept `activeId`, `onSelect` |
| `src/app/[locale]/(app)/timar/TimarView.tsx` | T14, T15 | View toggle + DnD integration |
| `src/components/log/LogFeed.tsx` | T17 | Accept `activeId`, `onSelect`; dense rows at `xl:` |
| `src/app/[locale]/(app)/umonnun/UmonnunView.tsx` | T17 | Dagbók → PaneLayout at `xl:` |
| `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx` | T18, T19 | Réttindi kanban at `xl:`; Skjöl PaneLayout |
| `src/components/info/ContactList.tsx`, `DocumentList.tsx` | T19, T20 | Accept `activeId`, `onSelect` |
| `src/app/[locale]/(app)/folk/page.tsx` | T20 | Keep EmergencyTiles full-width; PaneLayout for contacts |
| `messages/{is,en}.json` | throughout | New strings per the design doc's i18n section |

---

## Task 1: Install `@dnd-kit` and add the dense body token

Foundation step. Adds the only new deps (for drag-and-drop later on WeekGrid and EntitlementKanban) and the Tailwind v4 token the dense list rows will consume.

**Files:**
- Modify: `package.json`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Install deps**

```bash
bun add @dnd-kit/core @dnd-kit/sortable
```

Confirm both appear in `package.json` → `dependencies` and that `bun.lock` updates. Do NOT install `@dnd-kit/modifiers` or `@dnd-kit/utilities` directly — they come transitively if needed.

- [ ] **Step 2: Add the token**

Edit `src/app/globals.css`. In the existing `@theme inline { ... }` block (starts around line 60), append near the other color/font tokens — a reasonable spot is right after `--color-divider-strong` (≈ line 83):

```css
--text-body-dense: 16px;
```

This enables the utility `text-body-dense` in Tailwind v4.

- [ ] **Step 3: Typecheck + lint**

```bash
bunx tsc --noEmit && bun run lint
```

Expected: both exit 0. (The token is CSS; tsc doesn't look at it, but lint will note formatting.)

- [ ] **Step 4: Inline QA + commit**

- typecheck PASS, lint PASS (already verified)
- `git diff --stat` shows only `package.json`, `bun.lock`, `src/app/globals.css`

```bash
date +%s > /tmp/sigga-qa-passed
git add package.json bun.lock src/app/globals.css
git commit -m "$(cat <<'EOF'
build: add @dnd-kit deps and --text-body-dense token

Foundation for Command Post desktop work. @dnd-kit/core + sortable support
drag-to-reassign on the Tímar week grid and drag-to-move on the Réttindi
kanban (both lg:+ only). --text-body-dense is the 16px body size used for
dense list rows on desktop list panes; default 18px body everywhere else
is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract shared `navItems` module

Both `BottomNav.tsx` and `Sidebar.tsx` currently declare the same 4-item `ITEMS` array independently. Consolidate to a single source so future nav changes happen once.

**Files:**
- Create: `src/components/nav/navItems.ts`
- Modify: `src/components/nav/BottomNav.tsx`
- Modify: `src/components/nav/Sidebar.tsx`

- [ ] **Step 1: Create the shared module**

Create `src/components/nav/navItems.ts`:

```ts
export type IconKind = "today" | "care" | "people" | "docs";

export type NavItem = {
	href: "/" | "/umonnun" | "/folk" | "/pappirar";
	labelKey: "dashboard" | "care" | "people" | "paperwork";
	icon: IconKind;
};

export const PRIMARY_ITEMS: NavItem[] = [
	{ href: "/", labelKey: "dashboard", icon: "today" },
	{ href: "/umonnun", labelKey: "care", icon: "care" },
	{ href: "/folk", labelKey: "people", icon: "people" },
	{ href: "/pappirar", labelKey: "paperwork", icon: "docs" },
];

export function isActiveRoute(
	pathname: string,
	href: NavItem["href"],
): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}
```

- [ ] **Step 2: Update `BottomNav.tsx`**

Remove the local `IconKind`, `NavItem`, `ITEMS`, and `isActive` definitions. Import `PRIMARY_ITEMS`, `isActiveRoute`, and the types from `./navItems`. Rename local `isActive` usage to `isActiveRoute`. Keep everything else (JSX, className, behavior) identical.

- [ ] **Step 3: Update `Sidebar.tsx`**

Same treatment. Remove local duplicates, import from `./navItems`.

- [ ] **Step 4: Typecheck + lint**

```bash
bunx tsc --noEmit && bun run lint
```

- [ ] **Step 5: Inline QA + commit**

- No behavioral change; two files lose dead code, one file is added.
- Verify with `git diff` that no JSX changed — only imports/removals.

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/nav/navItems.ts src/components/nav/BottomNav.tsx src/components/nav/Sidebar.tsx
git commit -m "$(cat <<'EOF'
refactor(nav): share ITEMS array between BottomNav and Sidebar

Both components declared identical IconKind/NavItem/ITEMS/isActive. Extract
to src/components/nav/navItems.ts so future changes to the primary nav
happen in one place. No behavioral change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Promote sidebar breakpoint from `lg:` to `md:`

PR #3 used `lg:` (1024 px) as the boundary where mobile chrome hides and the sidebar appears. Command Post splits this: sidebar at `md:` (768 px), multi-pane at `xl:` (1280 px). This task only touches the shell — later surface tasks add `xl:`-gated multi-pane layouts.

**Files:**
- Modify: `src/components/nav/BottomNav.tsx`
- Modify: `src/components/shared/Header.tsx`
- Modify: `src/components/nav/Sidebar.tsx`
- Modify: `src/app/[locale]/(app)/layout.tsx`

- [ ] **Step 1: `BottomNav.tsx` outer `<nav>`**

Change the className: `lg:hidden` → `md:hidden`. Nothing else changes.

- [ ] **Step 2: `Header.tsx` outer `<header>`**

Change the className: `lg:hidden` → `md:hidden`. Nothing else.

- [ ] **Step 3: `Sidebar.tsx` outer `<aside>`**

Change the className from `hidden lg:flex …` to `hidden md:flex …`.

- [ ] **Step 4: `(app)/layout.tsx`**

Change the `<main>` className: `lg:pb-12 lg:pl-[248px]` → `md:pb-12 md:pl-[248px]`. Change the inner `<div>` className `lg:pl-24` → `md:pl-24`.

- [ ] **Step 5: Typecheck + lint**

```bash
bunx tsc --noEmit && bun run lint
```

- [ ] **Step 6: Inline QA + commit**

- 4 files, all just `lg:` → `md:` swaps.
- Mobile at 375×812 is unchanged (no `md:` classes match below 768 px, so everything collapses to the mobile shell).
- At 768 px the sidebar now appears; that is the new intended behavior.

```bash
date +%s > /tmp/sigga-qa-passed
git add \
  src/components/nav/BottomNav.tsx \
  src/components/shared/Header.tsx \
  src/components/nav/Sidebar.tsx \
  "src/app/[locale]/(app)/layout.tsx"
git commit -m "$(cat <<'EOF'
ui(shell): promote sidebar breakpoint from lg: to md: (768px)

Command Post splits the breakpoint strategy: sidebar appears at md: (768px,
small laptops and tablets), multi-pane layouts arrive at xl: (1280px).
This commit only shifts the shell boundary; per-surface multi-pane work
lands in later commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Create layout primitives

Build `<StackLayout>` and `<PaneLayout>` as standalone components. No consumers yet — later surface tasks adopt them one by one.

**Files:**
- Create: `src/components/layout/StackLayout.tsx`
- Create: `src/components/layout/PaneLayout.tsx`

- [ ] **Step 1: `StackLayout`**

Create `src/components/layout/StackLayout.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StackLayoutProps = {
	children: ReactNode;
	/**
	 * Override the xl: max-width. Default `xl:max-w-[960px]`.
	 * Dashboard uses `xl:max-w-[1400px]`.
	 */
	xlMaxWidth?: string;
	className?: string;
};

/**
 * Single-column responsive layout for surfaces that don't benefit from
 * multi-pane (Dashboard, Umönnun). Centers content within the post-sidebar
 * area using mx-auto; the sidebar's own border-r provides visual separation.
 */
export function StackLayout({
	children,
	xlMaxWidth = "xl:max-w-[960px]",
	className,
}: StackLayoutProps) {
	return (
		<div
			className={cn(
				"mx-auto px-6 pt-4 pb-28 md:pb-8 md:max-w-[720px]",
				xlMaxWidth,
				"flex flex-col gap-6",
				className,
			)}
		>
			{children}
		</div>
	);
}
```

- [ ] **Step 2: `PaneLayout`**

Create `src/components/layout/PaneLayout.tsx`:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PaneLayoutProps = {
	list: ReactNode;
	detail?: ReactNode;
	rail?: ReactNode;
	className?: string;
};

/**
 * List + optional detail (+ optional rail) multi-pane layout.
 *
 * Behavior:
 * - base / md: renders only `list` full-width (mobile/tablet experience).
 * - xl: 2-column grid (list + detail).
 * - 2xl with rail: 3-column grid (list + detail + rail).
 *
 * Background hierarchy:
 * - list pane: bg-page (flush with chrome)
 * - detail pane: bg-paper (the "open book")
 * - rail: bg-paper-deep
 *
 * No borders between panes — background steps do the work.
 */
export function PaneLayout({
	list,
	detail,
	rail,
	className,
}: PaneLayoutProps) {
	return (
		<div
			className={cn(
				"w-full",
				// base + md: single column, mobile-like
				"flex flex-col",
				// xl: two-column grid
				"xl:grid xl:grid-cols-[minmax(340px,400px)_1fr]",
				// 2xl with rail: three-column
				rail ? "2xl:grid-cols-[minmax(340px,400px)_1fr_minmax(300px,320px)]" : "",
				className,
			)}
		>
			<div className="bg-page">{list}</div>
			{detail !== undefined ? (
				<div className="hidden xl:block bg-paper">{detail}</div>
			) : null}
			{rail !== undefined ? (
				<div className="hidden 2xl:block bg-paper-deep">{rail}</div>
			) : null}
		</div>
	);
}
```

- [ ] **Step 3: Typecheck + lint**

```bash
bunx tsc --noEmit && bun run lint
```

- [ ] **Step 4: Inline QA + commit**

- Both files are server-compatible (no `"use client"`, no hooks). They can be imported from either server or client components.
- No consumers yet; typecheck passes because no one imports them.

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/layout/StackLayout.tsx src/components/layout/PaneLayout.tsx
git commit -m "$(cat <<'EOF'
ui(layout): add StackLayout + PaneLayout primitives (no consumers yet)

StackLayout: single-column with responsive max-widths (720px md, 960px xl;
Dashboard will override to 1400px xl). PaneLayout: list + optional detail
+ optional rail; collapses gracefully below xl. Background hierarchy
(bg-page / bg-paper / bg-paper-deep) provides pane separation without
borders. Consumers wire up in subsequent commits.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Convex backend — new queries

New queries backing the Command Post features. Grouping into one commit because each is small and they share the auth-boilerplate pattern.

**Files:**
- Create: `convex/activity.ts`
- Modify: `convex/users.ts` (add `attentionCounts`)
- Modify: `convex/appointments.ts` (add `byWeek`, ensure `get` exists)
- Modify: `convex/contacts.ts` (ensure `get` exists)
- Modify: `convex/documents.ts` (ensure `get` exists)
- Modify: `convex/entitlements.ts` (ensure `get` exists)
- Modify: `convex/logEntries.ts` (ensure `get` exists)

**Reference:** design doc's "Convex functions" section. All new queries use the existing `requireAuth(ctx)` helper pattern in each module.

- [ ] **Step 1: Audit which `get` queries exist**

```bash
grep -E "^export const get " convex/appointments.ts convex/contacts.ts convex/documents.ts convex/entitlements.ts convex/logEntries.ts
```

For any that don't exist, add a minimal `get` query:

```ts
export const get = query({
	args: { id: v.id("<tableName>") },
	handler: async (ctx, { id }) => {
		await requireAuth(ctx);
		return await ctx.db.get(id);
	},
});
```

(Substitute `<tableName>` per module. Use the existing `requireAuth` import already present in each module.)

- [ ] **Step 2: `appointments.byWeek`**

Add to `convex/appointments.ts`:

```ts
export const byWeek = query({
	args: { weekStartMs: v.number() },
	handler: async (ctx, { weekStartMs }) => {
		await requireAuth(ctx);
		const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
		const rows = await ctx.db
			.query("appointments")
			.withIndex("by_status_and_startTime", (q) =>
				q.eq("status", "upcoming").gte("startTime", weekStartMs),
			)
			.collect();
		// Narrow to the week window (index gives lower bound; upper bound in memory)
		const inWeek = rows.filter((r) => r.startTime < weekEndMs);
		// Enrich with driver details (same pattern as upcoming())
		const withDriver = await Promise.all(
			inWeek.map(async (a) => ({
				...a,
				driver: a.driverId ? await ctx.db.get(a.driverId) : null,
			})),
		);
		return withDriver.sort((a, b) => a.startTime - b.startTime);
	},
});
```

If `appointments.upcoming` already has a helper that enriches with driver, reuse it instead of duplicating.

- [ ] **Step 3: `users.attentionCounts`**

Add to `convex/users.ts`:

```ts
export const attentionCounts = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		const now = Date.now();
		const sevenDays = now + 7 * 24 * 60 * 60 * 1000;

		const entitlementsNeedingOwner = await ctx.db
			.query("entitlements")
			.filter((q) =>
				q.or(
					q.eq(q.field("status"), "not_applied"),
					q.eq(q.field("status"), "in_progress"),
				),
			)
			.collect()
			.then((rows) => rows.filter((r) => !r.ownerId).length);

		const appointmentsNoDriver = await ctx.db
			.query("appointments")
			.withIndex("by_status_and_startTime", (q) =>
				q.eq("status", "upcoming").gte("startTime", now),
			)
			.collect()
			.then((rows) =>
				rows.filter((a) => a.startTime < sevenDays && !a.driverId).length,
			);

		return {
			dashboard: entitlementsNeedingOwner + appointmentsNoDriver,
			care: 0, // TODO: wire "log since last visit" when sinceLastVisit lands
			paperwork: entitlementsNeedingOwner,
		};
	},
});
```

Note: the `care` count needs `sinceLastVisit` machinery; we'll revisit in Task 10's integration pass. For now return 0 so the component can render.

- [ ] **Step 4: `activity.sinceLastVisit`**

Create `convex/activity.ts`:

```ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth"; // or wherever requireAuth lives; mirror one of the other modules

type ActivityItem =
	| { kind: "log"; id: string; ts: number; authorName: string; preview: string }
	| { kind: "appointment"; id: string; ts: number; title: string }
	| { kind: "document"; id: string; ts: number; fileName: string; addedByName: string }
	| { kind: "entitlement_status"; id: string; ts: number; title: string; newStatus: string };

export const sinceLastVisit = query({
	args: { cursorMs: v.number(), limit: v.optional(v.number()) },
	handler: async (ctx, { cursorMs, limit = 20 }) => {
		await requireAuth(ctx);

		// Log entries created since cursor
		const logs = await ctx.db
			.query("logEntries")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();

		// Appointments created since cursor (new bookings)
		const appointments = await ctx.db
			.query("appointments")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();

		// Documents created since cursor
		const documents = await ctx.db
			.query("documents")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect();

		// Entitlement status changes since cursor — use updatedAt, not _creationTime
		const entitlements = await ctx.db
			.query("entitlements")
			.filter((q) => q.gt(q.field("updatedAt"), cursorMs))
			.collect();

		const items: ActivityItem[] = [
			...(await Promise.all(
				logs.map(async (l) => {
					const author = await ctx.db.get(l.authorId);
					return {
						kind: "log" as const,
						id: l._id,
						ts: l._creationTime,
						authorName: author?.name ?? author?.email ?? "—",
						preview: l.content.slice(0, 80),
					};
				}),
			)),
			...appointments.map((a) => ({
				kind: "appointment" as const,
				id: a._id,
				ts: a._creationTime,
				title: a.title,
			})),
			...(await Promise.all(
				documents.map(async (d) => {
					const added = await ctx.db.get(d.addedBy);
					return {
						kind: "document" as const,
						id: d._id,
						ts: d._creationTime,
						fileName: d.fileName,
						addedByName: added?.name ?? added?.email ?? "—",
					};
				}),
			)),
			...entitlements.map((e) => ({
				kind: "entitlement_status" as const,
				id: e._id,
				ts: e.updatedAt,
				title: e.title,
				newStatus: e.status,
			})),
		]
			.sort((a, b) => b.ts - a.ts)
			.slice(0, limit);

		return items;
	},
});
```

Adjust the `requireAuth` import path to match how other `convex/*.ts` modules import it (grep an existing module to confirm).

- [ ] **Step 5: Extend `appointments.update` if driverId not already supported**

Check `convex/appointments.ts`'s `update` mutation. If its args don't already include an optional `driverId: v.optional(v.union(v.id("users"), v.null()))`, add it. Drag-to-reassign will call `update({ id, driverId })`. `v.null()` allows unassigning by dragging an empty slot (optional v2 feature; don't implement now — just type it permissively so T15 can).

- [ ] **Step 6: Generate Convex types**

```bash
bunx convex dev --once --typecheck=enable
```

This regenerates `convex/_generated/api.d.ts` with the new functions.

- [ ] **Step 7: Typecheck + lint**

```bash
bunx tsc --noEmit && bun run lint
```

- [ ] **Step 8: Inline QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add convex/ && git commit -m "$(cat <<'EOF'
convex: add queries backing Command Post desktop (attentionCounts, byWeek, sinceLastVisit, get)

New: users.attentionCounts, appointments.byWeek, activity.sinceLastVisit.
Ensures appointments/contacts/documents/entitlements/logEntries each expose
a `get` query for detail panes. Every query calls requireAuth. No schema
changes; purely additive.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: AttentionBadge + wire into Sidebar and BottomNav

**Files:**
- Create: `src/components/nav/SidebarAttentionBadge.tsx`
- Modify: `src/components/nav/Sidebar.tsx`
- Modify: `src/components/nav/BottomNav.tsx`
- Modify: `messages/is.json`, `messages/en.json` — add `nav.attention.badge` string

- [ ] **Step 1: Create `SidebarAttentionBadge`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function SidebarAttentionBadge({
	count,
	compact = false,
}: {
	count: number;
	compact?: boolean;
}) {
	const t = useTranslations();
	if (count <= 0) return null;
	const label = t("nav.attention.badge", { count });
	if (compact) {
		// Mobile BottomNav variant — a tiny dot, no number
		return (
			<span
				aria-label={label}
				className="absolute top-1.5 right-4 inline-block size-2 rounded-full bg-amber-ink"
			/>
		);
	}
	return (
		<span
			aria-label={label}
			className={cn(
				"inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-semibold",
				"bg-amber-bg-1 text-amber-ink",
			)}
		>
			{count}
		</span>
	);
}
```

- [ ] **Step 2: Wire into `Sidebar.tsx`**

At the top of the `Sidebar` function, add:

```tsx
const counts = useQuery(api.users.attentionCounts);
```

Inside the nav item `Link`'s inner JSX, after the `<span>{navT(labelKey)}</span>`, add (keyed by `labelKey`):

```tsx
<span className="ml-auto">
	<SidebarAttentionBadge
		count={counts ? counts[labelKey === "dashboard" ? "dashboard" : labelKey === "care" ? "care" : labelKey === "paperwork" ? "paperwork" : 0] ?? 0 : 0}
	/>
</span>
```

Simpler: compute `const labelToCountKey: Record<string, "dashboard" | "care" | "paperwork" | null>` up front; map `labelKey` → count field; `people` maps to `null` (no badge).

- [ ] **Step 3: Wire into `BottomNav.tsx`**

Same subscription at the top. Wrap each `<Link>` in `relative` to allow the dot to be absolutely-positioned. Render `<SidebarAttentionBadge compact count={...} />` inside each `<Link>` so it overlaps.

- [ ] **Step 4: i18n strings**

Add to `messages/is.json`:

```json
"attention": { "badge": "{count, plural, one {1 atriði þarfnast athygli} other {# atriði þarfnast athygli}}" }
```

Nest under `nav` (keep existing `nav.dashboard` etc. siblings). Same structure in `en.json` with "{count, plural, one {1 item needs attention} other {# items need attention}}".

- [ ] **Step 5: Typecheck + lint**

- [ ] **Step 6: QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/nav/ messages/
git commit -m "$(cat <<'EOF'
ui(nav): attention badges on Sidebar (numeric pill) + BottomNav (dot)

Single Convex query users.attentionCounts feeds both navs. Dashboard and
Paperwork items show the number of pending items; Care currently returns
0 (will wire sinceLastVisit's unread count in a later commit). No People
badge — contacts don't accumulate urgency.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Sidebar mini week-calendar

**Files:**
- Create: `src/components/nav/SidebarWeekCalendar.tsx`
- Modify: `src/components/nav/Sidebar.tsx`
- Modify: `messages/{is,en}.json` — add `nav.miniCal.*` strings

- [ ] **Step 1: Create the component**

Structure: a client component that uses `api.appointments.byWeek({ weekStartMs })` where `weekStartMs` is the current week's Monday at 00:00 UTC (Iceland doesn't observe DST, so UTC math is correct). Renders a 7-cell grid with weekday letters (M/Þ/M/F/F/L/S), date numbers, and a small dot below days that have at least one appointment. Today's cell gets `bg-paper text-sage-shadow font-semibold`. Clicking any cell navigates via `<Link>` from `@/i18n/navigation` to `/timar?view=week&day=<YYYY-MM-DD>`.

The full code is detailed; the implementer should write a ~80–120-line component following the pattern of `BottomNav.tsx` (for `Link` + localization usage) and referring to `formatDate.ts` for the weekday letter formatting. Key requirements:

- Uses `Intl.DateTimeFormat(locale, { weekday: "narrow" })` for weekday letters.
- `size-8` per cell, grid `grid-cols-7 gap-1`.
- Appointment dot: `bg-sage-deep size-1 rounded-full mt-0.5` centered below the date.
- Today's cell: explicit background + text treatment; uses `isSameUTCDay(cellDate, now)` helper.
- `aria-label` per cell includes the full date for screen readers.
- Component is `hidden md:block` (only renders inside the Sidebar, which is itself md:+).

- [ ] **Step 2: Wire into `Sidebar.tsx`**

Below the `<nav>` block and above the user-dropdown `<div className="mt-auto …">`, add:

```tsx
<div className="px-4 pb-4 border-t border-divider mt-4 pt-4">
	<SidebarWeekCalendar />
</div>
```

- [ ] **Step 3: i18n strings**

- `nav.miniCal.todayAria` — "Í dag"
- `nav.miniCal.weekdayNarrow` — not needed if using `Intl.DateTimeFormat`; skip.

- [ ] **Step 4: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/nav/SidebarWeekCalendar.tsx src/components/nav/Sidebar.tsx messages/
git commit -m "$(cat <<'EOF'
ui(nav): mini week-calendar in Sidebar

7-day navigator with appointment dots, today highlighted in sage-shadow.
Clicking a day deep-links to /timar?view=week&day=YYYY-MM-DD. Subscribes
via api.appointments.byWeek for live updates.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Migrate six pages from `lg:max-w-[704px]` to `<StackLayout>`

Mechanical sweep. Each of the six `page.tsx` files currently wraps its body in a `lg:max-w-[704px]` div (or `lg:max-w-[704px] xl:max-w-[816px]` for Pappírar). Replace with `<StackLayout>`.

**Files:** (all in `src/app/[locale]/(app)/`)
- `page.tsx` (dashboard)
- `umonnun/page.tsx`
- `folk/page.tsx`
- `pappirar/page.tsx`
- `timar/page.tsx`
- `timar/reglulegir/page.tsx`

**Reference:** for Dashboard, the `<StackLayout>` should override the default max-width. Other pages use the default.

- [ ] **Step 1: Dashboard (`page.tsx`)**

Find the outer `<div className="px-6 pt-8 pb-10 flex flex-col gap-8 lg:max-w-[704px]">`. Replace the whole wrapper:

```tsx
import { StackLayout } from "@/components/layout/StackLayout";

// ... inside the component's return:
return (
	<StackLayout
		xlMaxWidth="xl:max-w-[1400px]"
		className="pt-8 pb-10 gap-8"
	>
		{/* existing children unchanged */}
	</StackLayout>
);
```

The `px-6` from the wrapper is now provided by StackLayout's default. `pt-8 pb-10` and `gap-8` overrides via `className`.

- [ ] **Step 2: Umönnun (`umonnun/page.tsx`)**

Replace `<div className="lg:max-w-[704px]">` wrapper with `<StackLayout><UmonnunView /></StackLayout>`. Let StackLayout's default padding apply.

- [ ] **Step 3: Fólk (`folk/page.tsx`)**

Same pattern as Dashboard — the page has its own className `px-6 pt-4 pb-28 flex flex-col gap-6`. Use `<StackLayout className="pt-4 pb-28 gap-6">` wrapping the existing children.

- [ ] **Step 4: Pappírar (`pappirar/page.tsx`)**

Same pattern: `<StackLayout className="pt-4 pb-28 gap-4">`.

- [ ] **Step 5: Tímar (`timar/page.tsx`)**

Wrap `<TimarView />` in `<StackLayout>` with default widths. TimarView itself will later get its own `<PaneLayout>` at `xl:` (Task 13+).

- [ ] **Step 6: Reglulegir (`timar/reglulegir/page.tsx`)**

Same.

- [ ] **Step 7: Typecheck + lint**

- [ ] **Step 8: QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add "src/app/[locale]/(app)/"
git commit -m "$(cat <<'EOF'
ui(shell): migrate six pages from lg:max-w-[704px] wrappers to StackLayout

The ad-hoc wrappers from PR #3 are replaced by the new StackLayout
primitive. Dashboard overrides xlMaxWidth to 1400px (Command Post hero
lives here); the others use the 960px default at xl:. Visual behavior
at md: unchanged; at xl: single-column surfaces widen moderately.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `WeekStrip` component (Dashboard 7-day hero)

**Files:**
- Create: `src/components/dashboard/WeekStrip.tsx`
- Modify: `messages/{is,en}.json` — add `dashboard.weekStrip.*` keys from the design doc.

- [ ] **Step 1: Create the component**

`"use client"`. Subscribes to `api.appointments.byWeek({ weekStartMs: currentWeekStart() })`. Renders a 7-column grid (`grid grid-cols-7 gap-2`). Each cell:

- Day header: weekday short (e.g. "MÁN") + date number, e.g. "13".
- Up to 2 appointments, stacked: time + title (truncated to ~20 chars) + driver avatar (16 px) or amber dot.
- "+{N} til viðbótar" if more.
- Today's cell: `bg-paper ring-1 ring-sage/30`.
- Cell click → `router.push("/timar?view=week&day=YYYY-MM-DD")`.
- Appointment click → `router.push("/timar?view=week&id=...")`.

Use the existing `UserAvatar` component.

Keep under 200 lines. Rely on small helpers in `src/lib/formatDate.ts` if useful; otherwise inline `Intl.DateTimeFormat` usage.

- [ ] **Step 2: Integrate into Dashboard**

This task *does not* integrate yet — it only creates the component, verifiable in isolation by typecheck. Task 10 (SinceLastVisit) and Task 11 (Dashboard restructure) integrate both.

- [ ] **Step 3: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/dashboard/WeekStrip.tsx messages/
git commit -m "$(cat <<'EOF'
ui(dashboard): WeekStrip component for desktop 7-day hero (not yet wired)

Renders the current week as 7 columns with per-day appointment cards.
Today's column highlighted. Clicks deep-link to /timar?view=week. Uses
api.appointments.byWeek for real-time updates. Integration into the
Dashboard layout lands in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `SinceLastVisit` component

**Files:**
- Create: `src/components/dashboard/SinceLastVisit.tsx`
- Modify: `messages/{is,en}.json` — `dashboard.sinceLastVisit.*`

- [ ] **Step 1: Component structure**

`"use client"`. Tracks user's last visit via `localStorage.setItem("sigga.lastVisit.<userId>", Date.now())`. On mount, reads the previous value as `cursorMs`, defaulting to `now - 3*24*60*60*1000` (3 days) if unset. Subscribes to `api.activity.sinceLastVisit({ cursorMs, limit: 10 })`.

Renders a dense list (`text-body-dense`, 16 px). Each row:
- 20 px avatar (if event has an author) or a small icon (calendar for appointment, document for document, file-check for entitlement status).
- A single line: "{actor} {action} {object}".
- Right-aligned timestamp: "{relative time}".

Below the list: "+{N} eldri" or a loadMore affordance. Empty state: "Ekkert nýtt frá síðustu heimsókn."

On component unmount or explicit "mark read" action, update `lastVisit` in localStorage.

- [ ] **Step 2: Also update `users.attentionCounts`**

Remember Task 5 left `care: 0` as a placeholder. Now wire it: the Care badge should reflect the count of log entries since the user's last visit. Options:

- (a) Client-side: after `SinceLastVisit` loads, compute `count = items.filter(i => i.kind === "log").length` and pass to the sidebar via a Zustand/Context store. *Don't* — introduces cross-cutting state.
- (b) Server-side: `users.attentionCounts` accepts a `cursorMs` arg, queries logEntries since cursor, returns that count.
- (c) Split: add a separate `activity.unreadLogCount({ cursorMs })` query called by both the badge and the care route.

Go with **(c)** — cleanest. Add `activity.unreadLogCount` in `convex/activity.ts`:

```ts
export const unreadLogCount = query({
	args: { cursorMs: v.number() },
	handler: async (ctx, { cursorMs }) => {
		await requireAuth(ctx);
		return await ctx.db
			.query("logEntries")
			.filter((q) => q.gt(q.field("_creationTime"), cursorMs))
			.collect()
			.then((rows) => rows.length);
	},
});
```

Update `SidebarAttentionBadge` usage inside Sidebar for the "care" item: call `useQuery(api.activity.unreadLogCount, { cursorMs: lastVisitFromLocalStorage() })` and pass `count`.

- [ ] **Step 3: Component is built but not yet mounted in Dashboard (Task 11)**

- [ ] **Step 4: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/dashboard/SinceLastVisit.tsx convex/activity.ts src/components/nav/Sidebar.tsx messages/
git commit -m "$(cat <<'EOF'
ui(dashboard): SinceLastVisit component + unreadLogCount wiring for Care badge

Reads activity.sinceLastVisit (log, appointments, documents, entitlement
status) since user's last-visit cursor (tracked in localStorage).
activity.unreadLogCount backs the Sidebar's Care attention badge. Component
integrates into Dashboard in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Dashboard restructure — two-column at `xl:`

Integrate `WeekStrip` and `SinceLastVisit` into `src/app/[locale]/(app)/page.tsx`.

**Files:**
- Modify: `src/app/[locale]/(app)/page.tsx`

- [ ] **Step 1: Restructure the return JSX**

Target shape — keep mobile/tablet behavior unchanged (existing cards stacked); at `xl:` add the 7-day strip and a 2-column grid below it.

```tsx
return (
	<StackLayout xlMaxWidth="xl:max-w-[1400px]" className="pt-8 pb-10 gap-8">
		<header>…greeting…</header>

		{/* Mobile + tablet: unchanged */}
		<div className="xl:hidden flex flex-col gap-8">
			<AttentionCard items={attention} />
			{unassigned ? <DrivingCta appointment={…} /> : null}
			<NextAppointments appointments={appointments?.slice(0, 3)} />
			<RecentLog entry={latestEntry} />
		</div>

		{/* Desktop xl:+ : the Command Post layout */}
		<div className="hidden xl:flex flex-col gap-8">
			<WeekStrip />
			<div className="grid grid-cols-[1fr_minmax(320px,400px)] gap-8">
				<SinceLastVisit />
				<section className="flex flex-col gap-4" aria-labelledby="attention-heading">
					<h2 id="attention-heading" className="font-serif text-[1.4rem]">
						{t("dashboard.attention.eyebrow", { count: attention?.length ?? 0 })}
					</h2>
					<AttentionCard items={attention} />
					{unassigned ? <DrivingCta appointment={…} /> : null}
				</section>
			</div>
		</div>
	</StackLayout>
);
```

The `xl:hidden` / `hidden xl:flex` duplication is intentional — different content shape per breakpoint. Avoid a single shared list with responsive wrappers; the semantic structure is genuinely different.

- [ ] **Step 2: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add "src/app/[locale]/(app)/page.tsx"
git commit -m "$(cat <<'EOF'
ui(dashboard): Command Post layout at xl: (WeekStrip hero + two-col)

Mobile/tablet dashboard is untouched. At xl:, the greeting is followed by
the 7-day WeekStrip and a two-column grid: SinceLastVisit (main) +
AttentionCard + DrivingCta (right column). RecentLog is dropped from
desktop since its content is already represented in SinceLastVisit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Tímar `WeekGrid` component (no DnD yet)

Build the visual grid. Drag-to-reassign arrives in Task 15.

**Files:**
- Create: `src/components/timar/WeekGrid.tsx`
- Modify: `messages/{is,en}.json` — `timar.weekGrid.*` keys.

- [ ] **Step 1: Structure**

Props:

```ts
type Props = {
	weekStartMs: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	activeId?: Id<"appointments"> | null;
	onSelect: (id: Id<"appointments">) => void;
};
```

Subscribes to `api.appointments.byWeek({ weekStartMs })`. Renders:

- Header: `← Vika {n}`, date range "{Mon day}. – {Sun day} apríl", `→` — using sage-deep text, soft divider beneath.
- 7-column grid of day cells (`grid-cols-7 gap-3`). Each cell: day name + date header, then appointment blocks stacked by time.
- Appointment block (`AppointmentGridCell` child component): `rounded-xl bg-paper ring-1 ring-foreground/10 p-3` with time, title, driver avatar or amber dot, click → `onSelect(id)`. Selected appt has `ring-sage-deep ring-2`.
- Below grid: "Skutlarar" label + horizontal strip of family-member avatars (reads contacts where `category === "family"` and appears as potential drivers — actually drivers are from `users` table, not contacts). Use `api.users.list` (check if exists; add if missing in Task 5's scope).
- Empty state per cell: no appointments → just the day header, empty slot.

Keep under 250 lines. Complex DnD wiring arrives in Task 15 — the `Skutlarar` strip in this task is static.

- [ ] **Step 2: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/timar/WeekGrid.tsx messages/
git commit -m "$(cat <<'EOF'
ui(timar): WeekGrid component (7-column week view, no DnD)

Renders a week of appointments as 7 day-cells with appointment blocks.
Prev/next week navigation; current week default. Selected-appointment
state visible via ring. Drivers strip rendered below but static — drag-
to-reassign lands in a later commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: `TimarDetail` component + URL `?id=` wiring

**Files:**
- Create: `src/components/timar/TimarDetail.tsx`
- Modify: `src/components/appointments/AppointmentList.tsx` — accept `activeId`, `onSelect` props.
- Modify: `src/app/[locale]/(app)/timar/TimarView.tsx` — wire URL param + pane integration at `xl:`.

- [ ] **Step 1: TimarDetail component**

Pure function of `{ id }` → renders the selected appointment's full detail: title, date/time, location, notes, driver (with `DriverPicker` to change), series badge if `seriesId` present, Edit + Cancel + Complete buttons. Reuse the existing `AppointmentForm` for Edit (via a local sheet state).

Empty state component `TimarDetailEmpty`: "Veldu tíma til að skoða." — rendered when `activeId === null`.

- [ ] **Step 2: Extend `AppointmentList`**

Accept two new optional props:

```ts
type Props = {
	activeId?: Id<"appointments"> | null;
	onSelect?: (id: Id<"appointments">) => void;
	// ...existing props unchanged
};
```

- When `onSelect` is provided, rows are rendered as buttons calling `onSelect(id)` and apply `aria-current` + `bg-paper` when `id === activeId`.
- When `onSelect` is not provided, keep the current behavior (no change).

Mobile still passes no `onSelect`; desktop's TimarView passes both.

- [ ] **Step 3: TimarView — pane integration**

In `src/app/[locale]/(app)/timar/TimarView.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
// ... other imports including PaneLayout, WeekGrid, TimarDetail, AppointmentList, ReglulegirEntry

export function TimarView() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const activeId = searchParams.get("id") as Id<"appointments"> | null;

	const onSelect = (id: Id<"appointments">) => {
		const next = new URLSearchParams(searchParams);
		next.set("id", id);
		router.replace(`?${next.toString()}`, { scroll: false });
	};

	const detail =
		activeId ? <TimarDetail id={activeId} /> : <TimarDetailEmpty />;

	// At xl: use PaneLayout; below xl:, render list only
	return (
		<PaneLayout
			list={
				<div className="xl:p-6">
					<ReglulegirEntryRow />
					{/* existing tabs + AppointmentList */}
					<AppointmentList activeId={activeId} onSelect={onSelect} />
				</div>
			}
			detail={<div className="xl:p-8">{detail}</div>}
		/>
	);
}
```

Week-grid view switching arrives in Task 14 — for now `detail` always shows `TimarDetail`.

- [ ] **Step 4: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/timar/TimarDetail.tsx src/components/appointments/AppointmentList.tsx "src/app/[locale]/(app)/timar/TimarView.tsx"
git commit -m "$(cat <<'EOF'
ui(timar): list-detail at xl: (AppointmentList.activeId, TimarDetail, ?id= URL)

AppointmentList gains activeId/onSelect props (mobile unchanged when not
passed). TimarView uses PaneLayout at xl: with list + detail; selection
is URL-based (?id=...) for deep-linkability and Convex reactivity.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Tímar view toggle (`?view=week|list`)

At `xl:`, default to week view; allow a toggle to switch to list view (inside the detail pane). Below `xl:`, always list view — ignore the `view` param.

**Files:**
- Modify: `src/app/[locale]/(app)/timar/TimarView.tsx`
- Modify: `messages/{is,en}.json` — `timar.view.week`, `timar.view.list`

- [ ] **Step 1: Read `view` from URL**

```tsx
const view = (searchParams.get("view") as "week" | "list" | null) ?? "week";
```

- [ ] **Step 2: Render conditionally at `xl:`**

In the `detail` prop:

```tsx
const detail = (
	<div className="xl:p-8">
		<div className="flex items-center justify-end mb-4 gap-2">
			<ViewToggle current={view} onChange={(v) => /* update URL */ } />
		</div>
		{view === "week" ? (
			<WeekGrid
				weekStartMs={…}
				onPrevWeek={…}
				onNextWeek={…}
				activeId={activeId}
				onSelect={onSelect}
			/>
		) : activeId ? (
			<TimarDetail id={activeId} />
		) : (
			<TimarDetailEmpty />
		)}
	</div>
);
```

`ViewToggle` is a small inline component — two buttons styled as a segmented control; active one has `bg-paper text-ink-soft`, inactive `text-ink-faint`.

- [ ] **Step 3: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add "src/app/[locale]/(app)/timar/TimarView.tsx" messages/
git commit -m "$(cat <<'EOF'
ui(timar): week/list view toggle at xl: (default week)

?view= URL param switches between the WeekGrid and the traditional list.
xl: defaults to week (the Command Post coordination view); mobile and
md: always render the list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Drag-to-reassign driver on `WeekGrid`

The richest interaction in Command Post. Implementer should block out ~45 minutes and rely on `@dnd-kit`'s docs plus the existing `DriverPicker` code for context.

**Files:**
- Modify: `src/components/timar/WeekGrid.tsx` (wrap in `DndContext`, add `useDraggable` to avatars, `useDroppable` to appointment blocks)

- [ ] **Step 1: Avatars in `Skutlarar` strip become draggable**

Each family-member avatar uses `useDraggable({ id: user._id })`. While dragging, apply transform style from `transform.x/y`. Keyboard sensor enabled.

- [ ] **Step 2: Appointment blocks become drop targets**

Each block uses `useDroppable({ id: appointment._id })`. On hover, apply `ring-2 ring-sage` for visual feedback.

- [ ] **Step 3: `onDragEnd` handler calls `appointments.update`**

```ts
const update = useMutation(api.appointments.update);

function onDragEnd(event: DragEndEvent) {
	const userId = event.active.id as Id<"users">;
	const appointmentId = event.over?.id as Id<"appointments"> | undefined;
	if (!appointmentId) return;
	update({ id: appointmentId, driverId: userId }).catch(console.error);
}
```

- [ ] **Step 4: Keyboard a11y**

dnd-kit's keyboard sensor handles tab-and-space natively. Add `aria-describedby` on avatars referring to a visually-hidden "Dragðu nafn á tíma til að skipa skutlara." instruction.

- [ ] **Step 5: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/timar/WeekGrid.tsx
git commit -m "$(cat <<'EOF'
ui(timar): drag-to-reassign driver on WeekGrid (@dnd-kit)

Family-member avatars in the Skutlarar strip become draggable; appointment
blocks are drop targets. Drop fires appointments.update({ driverId }).
Keyboard sensor enabled (tab/space). Mobile and md: never render the drag
layer. Real-time: Convex pushes the reassignment to every open browser.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: `LogComposer` + `LogEntryReader` components

**Files:**
- Create: `src/components/log/LogComposer.tsx`
- Create: `src/components/log/LogEntryReader.tsx`
- Modify: `messages/{is,en}.json` — `dagbok.composer.*`, `dagbok.detail.*`

- [ ] **Step 1: `LogComposer`**

`"use client"`. Controlled textarea with auto-save to `localStorage["sigga.logDraft.<userId>"]`. Submit (`⌘+Enter` or button) calls `api.logEntries.add({ content })`. On success, clears the textarea and localStorage.

Props:

```ts
type Props = {
	initialRelatedAppointmentId?: Id<"appointments">;
};
```

Layout:

```
┌──────────────────────────────────────────────┐
│ [textarea ~5 rows, placeholder              ] │
│                                              │
│                       Drög vistuð · ⌘+Enter  │
│                              [  Senda  ]     │
└──────────────────────────────────────────────┘
```

- [ ] **Step 2: `LogEntryReader`**

Pure function of `{ id, onEdit }`. Subscribes to `api.logEntries.get({ id })`. Renders the entry's full content in serif at 18 px, author + timestamp above, edited badge if applicable, appointment tag if `relatedAppointmentId`. Edit button (only if author) triggers `onEdit(entry)` — which will open the existing `LogEntryForm` sheet.

- [ ] **Step 3: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/log/ messages/
git commit -m "$(cat <<'EOF'
ui(dagbok): LogComposer + LogEntryReader (desktop pane components)

Composer is a controlled textarea with localStorage draft persistence,
cmd+Enter submit, calls logEntries.add. Reader subscribes to logEntries.get
for a selected entry and supports edit-author-only. Integration into
Dagbók pane layout lands in the next commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Dagbók two-pane at `xl:`

**Files:**
- Modify: `src/components/log/LogFeed.tsx` — accept `activeId`, `onSelect`; dense-row styling at `xl:`.
- Modify: `src/app/[locale]/(app)/umonnun/UmonnunView.tsx` — use `<PaneLayout>` for Dagbók tab at `xl:`.

- [ ] **Step 1: Extend `LogFeed`**

Pattern identical to Task 13's `AppointmentList` extension. Add optional `activeId` and `onSelect`. When `onSelect` provided and at `xl:`, render rows in dense form (`text-body-dense`, 72 px height, avatar 24 px); selected row has `bg-paper`. When not provided (mobile), keep existing card layout.

Use `xl:` responsive classes inside `LogFeed` itself to toggle the card vs row style — single component handles both modes.

- [ ] **Step 2: `UmonnunView`**

Inside the Dagbók tab content, at `xl:+`:

```tsx
const [activeId, setActiveId] = useState<Id<"logEntries"> | null>(null);

<PaneLayout
	list={
		<div className="xl:p-6">
			<LogFeed activeId={activeId} onSelect={setActiveId} />
		</div>
	}
	detail={
		<div className="xl:p-8 flex flex-col gap-6">
			<LogComposer />
			{activeId ? (
				<LogEntryReader id={activeId} onEdit={…} />
			) : (
				<p className="text-ink-faint">{t("dagbok.detail.noSelection")}</p>
			)}
		</div>
	}
/>
```

Dagbók specifically uses local state (not URL `?id=`) since its selection isn't meaningful to share (unlike a specific appointment or contact). Exception to the general URL-selection rule; document in the code with a small inline comment.

Wait — the design doc says URL-based selection everywhere. Reconsider: sharing a log entry deep-link *is* useful ("look at what Helga wrote on Tuesday"). Use `?entry=...` (distinct from `?id=` to avoid conflict with other routes in the parent stack; or just use `?id=` — safe since this route has no other `?id=` semantics). Go with `?id=` for consistency with Tímar.

- [ ] **Step 3: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/log/LogFeed.tsx "src/app/[locale]/(app)/umonnun/UmonnunView.tsx"
git commit -m "$(cat <<'EOF'
ui(dagbok): two-pane layout at xl: (list + composer + reader)

LogFeed gains activeId/onSelect (dense rows at xl:). UmonnunView's Dagbók
tab uses PaneLayout to put the list on the left and a permanent composer
plus the selected entry on the right. Selection lives in ?id=. Mobile and
md: behavior is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: Réttindi kanban

**Files:**
- Create: `src/components/info/EntitlementKanban.tsx`
- Modify: `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx` — render kanban at `xl:`
- Modify: `messages/{is,en}.json` — `pappirar.kanban.*`

- [ ] **Step 1: Component**

Uses `@dnd-kit` `DndContext` with 4 `useDroppable` columns (`not_applied`, `in_progress`, `approved`, `denied`). Each card uses `useDraggable({ id: entitlement._id })`. `onDragEnd`: if dropped in a different column, fire `api.entitlements.update({ id, status })`. Each column header shows a count + "+ Bæta við" button opening `EntitlementForm` with `defaultStatus` prefilled.

Card renderer: same visual DNA as `EntitlementList`'s card, slightly denser. Keep under 200 lines of component code.

Use `grid-cols-1 xl:grid-cols-4 gap-4` at the container level so the kanban collapses to a single list on smaller screens (fallback behavior — though the component is only rendered at `xl:` anyway).

- [ ] **Step 2: `PappirarTabs.tsx` integration**

Inside the Réttindi tab content:

```tsx
<>
	<div className="xl:hidden">
		<EntitlementList />
	</div>
	<div className="hidden xl:block">
		<EntitlementKanban />
	</div>
</>
```

- [ ] **Step 3: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/info/EntitlementKanban.tsx "src/app/[locale]/(app)/pappirar/PappirarTabs.tsx" messages/
git commit -m "$(cat <<'EOF'
ui(pappirar): Réttindi kanban at xl: (@dnd-kit)

4 columns map 1:1 to entitlement statuses: Beðið / Í vinnslu / Samþykkt /
Hafnað. Drag cards to change status; drop fires entitlements.update.
Mobile and md: keep the single EntitlementList.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: Skjöl list-detail at `xl:`

**Files:**
- Modify: `src/components/info/DocumentList.tsx` — accept `activeId`, `onSelect` (mirrors AppointmentList pattern).
- Create: `src/components/info/DocumentDetail.tsx`
- Modify: `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx` — Skjöl tab uses `PaneLayout` at `xl:`.
- Modify: `messages/{is,en}.json` — `pappirar.skjol.preview.*`

- [ ] **Step 1: `DocumentList` prop additions**

Same pattern as prior list components — activeId + onSelect.

- [ ] **Step 2: `DocumentDetail`**

`"use client"`. Subscribes to `api.documents.get({ id })`. Renders:
- Filename (font-serif, h2).
- Metadata: added by / date / size.
- Notes if present.
- Preview: iframe for PDFs (`<iframe src={fileUrl} />`), img for images, "Get ekki birt forskoðun." for other types.
- Actions: Download button (download link to `fileUrl`), Delete button (existing flow).

Use `api.documents.getUrl({ storageId })` or whichever existing helper returns the signed URL. Grep `convex/documents.ts` for the existing URL-generation pattern.

- [ ] **Step 3: `PappirarTabs` integration**

Skjöl tab renders `PaneLayout` at `xl:`; below `xl:` it keeps the single DocumentList.

- [ ] **Step 4: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/info/DocumentList.tsx src/components/info/DocumentDetail.tsx "src/app/[locale]/(app)/pappirar/PappirarTabs.tsx" messages/
git commit -m "$(cat <<'EOF'
ui(pappirar): Skjöl list+detail with preview pane at xl:

DocumentList gains activeId/onSelect props. DocumentDetail renders
metadata + inline preview (iframe for PDF, img for image, fallback copy
otherwise). Mobile behavior unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: Fólk list-detail at `xl:`

**Files:**
- Modify: `src/components/info/ContactList.tsx` — activeId/onSelect props.
- Create: `src/components/info/ContactDetail.tsx`
- Modify: `src/app/[locale]/(app)/folk/page.tsx` — PaneLayout at `xl:`, EmergencyTiles stay above.
- Modify: `messages/{is,en}.json` — `folk.detail.*`

- [ ] **Step 1: Extend `ContactList`**

Same prop pattern.

- [ ] **Step 2: `ContactDetail`**

Subscribes to `api.contacts.get({ id })`. Large tappable `tel:` / `mailto:` buttons (48 px+), role/category label, notes.

- [ ] **Step 3: Update `folk/page.tsx`**

```tsx
<StackLayout className="pt-4 pb-28 gap-6">
	<header>…</header>
	<EmergencyTiles />
	{/* At xl: PaneLayout wraps ContactList + ContactDetail */}
	<div className="xl:hidden">
		<ContactList />
	</div>
	<div className="hidden xl:block">
		<PaneLayout
			list={<ContactList activeId={…} onSelect={…} />}
			detail={activeId ? <ContactDetail id={activeId} /> : <ContactDetailEmpty />}
		/>
	</div>
</StackLayout>
```

StackLayout wraps the whole surface because EmergencyTiles belongs in the stack (full-width, no list-detail); the PaneLayout inside is a secondary shape.

Note: ContactList state (activeId) has to move up to the page component — that's fine; it was already going to be client-side.

- [ ] **Step 4: Typecheck + lint + QA + commit**

```bash
date +%s > /tmp/sigga-qa-passed
git add src/components/info/ContactList.tsx src/components/info/ContactDetail.tsx "src/app/[locale]/(app)/folk/page.tsx" messages/
git commit -m "$(cat <<'EOF'
ui(folk): list+detail at xl: (EmergencyTiles stay above the pane layout)

ContactList gains activeId/onSelect. ContactDetail renders large tappable
tel/mailto buttons plus notes. EmergencyTiles remain full-width above the
PaneLayout. Mobile behavior unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: Final smoke + push + PR

**Files:** no code changes.

- [ ] **Step 1: Run manual smoke**

Start `bun dev` (ensure Convex dev is running too — `bunx convex dev` in another terminal). Sign in.

For each viewport, walk every surface. Use the table in the design doc's "Testing" section as the checklist. Note any issues.

Viewports: `375×812`, `1024×768` (the `md:` boundary, pre-`xl:`), `1440×900` (mid-desktop), `1920×1080` (wide-desktop, `xl:+`).

- [ ] **Step 2: Production build**

```bash
bun run build
```

Expected: exit 0, all routes compile, no TypeScript errors.

- [ ] **Step 3: Push branch**

```bash
git push -u origin claude/desktop-command-post
```

- [ ] **Step 4: Open PR against `claude/desktop-support` (stacked)**

```bash
gh pr create \
  --base claude/desktop-support \
  --title "Desktop Command Post — multi-pane coordination surface" \
  --body "$(cat <<'EOF'
## Summary

Replaces the first-pass desktop layout (PR #3 — "mobile pinned to the left") with a genuinely desktop-native coordination surface.

- **Tiers:** `base` mobile, `md` (768px) sidebar + single column, `xl` (1280px) multi-pane.
- **Primitives:** `<StackLayout>` (Dashboard, Umönnun) and `<PaneLayout>` (Tímar, Fólk, Pappírar-Skjöl).
- **Dashboard at xl:** 7-day WeekStrip hero + two-column layout (SinceLastVisit + AttentionColumn).
- **Tímar at xl:** default week-grid view with drag-to-reassign driver (@dnd-kit); list-view toggle preserved.
- **Dagbók at xl:** list on the left, always-visible composer + selected-entry reader on the right.
- **Pappírar-Réttindi at xl:** 4-column kanban with drag-to-move status.
- **Pappírar-Skjöl at xl:** list-detail with inline preview (PDF/image).
- **Fólk at xl:** EmergencyTiles full-width; contact list + detail pane below.
- **Sidebar:** mini week-calendar + per-section attention badges.
- **Mobile:** zero regressions. Every list component is breakpoint-agnostic; pages opt into PaneLayout at xl: only.

## Why this redesign

Product-owner feedback after testing PR #3 locally: *"We aren't utilizing the space on the horizontal axis, and now it just looks like mobile with a sidebar instead of a bottom bar."* Correct reading — the first pass optimized for the 60+ mobile audience and assumed desktop was the same app bigger. Desktop users (the younger daughters on work laptops) need to scan, compare, coordinate. This PR gives them a real coordination surface.

Full design record: `docs/superpowers/specs/2026-04-18-desktop-command-post-design.md`
Implementation plan: `docs/superpowers/plans/2026-04-18-desktop-command-post.md`

## Stacked on PR #3

Base branch = `claude/desktop-support`. When PR #3 merges to `main`, this one rebases automatically. Neither branch has been pushed to `main`; deploys only happen when you explicitly push main to origin.

## Test plan

Manual smoke at four viewports (Phase 16 e2e still not in scope):

- [ ] 375×812 — mobile unchanged. Every surface works as before.
- [ ] 1024×768 — sidebar present, single column, no multi-pane.
- [ ] 1440×900 — Command Post desktop: WeekStrip, two-column Dashboard, Tímar week grid, Dagbók two-pane, Réttindi kanban, Skjöl preview, Fólk detail pane.
- [ ] 1920×1080 — same as 1440, generous empty space.

## Dependencies

Adds `@dnd-kit/core` and `@dnd-kit/sortable` (drag-to-reassign + kanban). No schema changes. New Convex queries: `users.attentionCounts`, `appointments.byWeek`, `activity.sinceLastVisit`, `activity.unreadLogCount`, and `get` on any module that was missing it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The PR URL is the deliverable. Report it back to the parent controller.

---

## Self-review checklist

Run after writing the complete plan.

**Spec coverage:**

- Breakpoint tiers (base/md/xl) — Tasks 3 + 4.
- StackLayout + PaneLayout primitives — Task 4.
- Shared `navItems` — Task 2.
- Sidebar enrichment (badges + mini-cal) — Tasks 6, 7.
- Dashboard Command Post (WeekStrip + SinceLastVisit + two-col) — Tasks 9, 10, 11.
- Tímar week grid (+ view toggle + drag-to-reassign) — Tasks 12, 13, 14, 15.
- Dagbók two-pane with composer — Tasks 16, 17.
- Réttindi kanban — Task 18.
- Skjöl list-detail — Task 19.
- Fólk list-detail — Task 20.
- New Convex queries — Task 5.
- `--text-body-dense` token — Task 1.
- `@dnd-kit` deps — Task 1.
- Removal of PR #3's per-page max-width wrappers — Task 8.
- Final smoke + push + PR — Task 21.

All spec sections mapped. ✓

**Placeholder scan:** No "TBD" / "implement later". Some task descriptions delegate to the spec ("see design doc's XYZ section") rather than inlining all code — acceptable for surface tasks where code blocks would be >100 lines of boilerplate. Each such delegation names the specific section.

**Type consistency:** All tasks use `Id<"...">` correctly; `api.*` usage consistent. `activeId / onSelect` prop pattern repeats across AppointmentList, LogFeed, ContactList, DocumentList — same shape each time.

**Scope:** 21 tasks is on the upper end of a single plan but fits one goal (desktop Command Post). Not decomposable into sub-projects — each task depends on foundation tasks earlier in the same plan. Ship as one plan.

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-04-18-desktop-command-post.md`.

Proceeding with **subagent-driven-development** — user pre-authorized execution; the parent controller dispatches a fresh implementer per task + per-task spec and code-quality review (cheaper models for mechanical tasks, default Sonnet for the DnD-heavy ones).
