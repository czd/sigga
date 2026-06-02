# Reactions, Comments & Read Receipts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ❤️ reactions on journal entries, comment threads on journal entries *and* appointments, and Messenger-style "seen by" read receipts on the Dagbók feed — without turning Sigga into a chat app.

**Spec:** `docs/superpowers/specs/2026-06-02-reactions-comments-receipts-design.md` — **defer to it for any detail not explicit in a task.** All product decisions (single heart; reactions journal-only; comments on both; comments discoverable + reactions silent; family-wide receipts with no opt-out; flat threads; per-entry seen-by clusters) are locked there.

**Architecture:** Three additive tables — `reactions` (heart, journal-only), `comments` (polymorphic over `logEntries` + `appointments`), `journalReads` (per-user read high-water). One shared `<CommentThreadSheet>` serves both comment targets. "Seen by" reduces to a single per-user `lastSeenTime` high-water mark — no scroll tracking. New comments flow into the existing `activity.sinceLastVisit` feed and the care-tab badge (which moves from a per-device localStorage cursor to the server high-water); reactions are silent.

**Tech Stack:** Next.js 16 (App Router), Convex, next-intl (Icelandic-first, feminine default), shadcn/ui + Tailwind v4, Biome, Bun. Vitest for Convex unit tests. Verification: `bun run lint` + `bunx tsc --noEmit` + the Vitest suite, plus manual `bun dev` + `npx convex dev` + browser.

**Conventions to honor (non-negotiable):**
- Every query/mutation calls `requireAuth(ctx)` and throws `ConvexError("Ekki innskráður")` when null. No new soft-return gates.
- All UI text from `messages/{is,en}.json` — Icelandic first, feminine forms. Nothing hardcoded.
- `docs/ux-patterns.md` governs every interactive surface: Sheet = task (Pattern 4), ConfirmDialog for deletes (Pattern 2), 48px tap floor (Pattern 7), no toasts → live-region announce (Pattern 11), no optimistic UI (Pattern 14), relative timestamps with `<time>` + sr-only absolute (Pattern 9), subject-first actor attribution (Pattern 10).
- No inline hex; palette tokens only (Pattern 16).

**Commit discipline:** One task = one commit. Run `/qa` (or `Agent` `subagent_type: "qa"`) before each commit; `[skip-qa]` only for the i18n-only and docs-only tasks where obvious. **Route/nav/schema changes trigger `docs-sync`** — Task 9 handles that.

---

## File map

**New files:**
- `convex/reactions.ts` — `toggle` mutation + enrichment helpers.
- `convex/comments.ts` — `list` / `add` / `update` / `remove` + a `countFor` helper.
- `convex/journalReads.ts` — `markSeen` mutation + `receipts` query.
- `convex/reactions.test.ts` — toggle idempotency, auth-throw.
- `convex/comments.test.ts` — add/edit/delete author-guard, auth-throw, cascade.
- `convex/journalReads.test.ts` — high-water monotonicity, auth-throw.
- `src/components/log/CommentThreadSheet.tsx` — shared thread Sheet (journal + appointment).
- `src/components/log/CommentRow.tsx` — one comment (avatar, name, time, edit/delete-if-mine).
- `src/components/log/CommentComposer.tsx` — pinned textarea + "Senda".
- `src/components/log/ReactionButton.tsx` — heart toggle pill.
- `src/components/log/CommentButton.tsx` — comment-count pill that opens the sheet.
- `src/components/log/SeenByCluster.tsx` — avatar cluster for read receipts.

**Modified:**
- `convex/schema.ts` — three new tables + indexes.
- `convex/logEntries.ts` — enrich `recent`/`list`/`get` with reaction + comment fields.
- `convex/appointments.ts` — `withDriver` gains `commentCount`; `remove` cascades comment deletes.
- `convex/activity.ts` — `comment` kind in `sinceLastVisit`; generalize `unreadLogCount` to read the server high-water and count comments.
- `src/components/log/LogFeed.tsx` (+ `LogEntryCard` if separate) — footer action row + seen-by + `markSeen` call.
- `src/components/appointments/AppointmentCard.tsx` + `TimarDetail` — comment button.
- `src/components/nav/BottomNav.tsx`, `src/components/nav/Sidebar.tsx` — drop localStorage cursor arg; read server-backed badge count.
- `src/components/dashboard/SinceLastVisit.tsx` — render the new `comment` item kind. (Cursor behavior unchanged — Nic confirmed.)
- `messages/is.json`, `messages/en.json` — `discussion` + `reactions` namespaces, `dagbok.seenBy.*`, `dashboard.sinceLastVisit` comment template.
- `docs/spec.md`, `docs/implementation-plan.md`, `docs/ux-patterns.md` — Task 9 (docs-sync).

---

## Task 1: Schema — add `reactions`, `comments`, `journalReads` tables

**Files:** Modify `convex/schema.ts`

- [ ] **Step 1:** Add the three tables (additive — no edits to existing tables, so a plain deploy validates; no migration needed):

```ts
reactions: defineTable({
  logEntryId: v.id("logEntries"),
  userId: v.id("users"),
})
  .index("by_entry", ["logEntryId"])
  .index("by_entry_and_user", ["logEntryId", "userId"]),

comments: defineTable({
  targetType: v.union(v.literal("logEntry"), v.literal("appointment")),
  targetId: v.union(v.id("logEntries"), v.id("appointments")),
  authorId: v.id("users"),
  content: v.string(),
  editedAt: v.optional(v.number()),
})
  .index("by_target", ["targetType", "targetId"]),

journalReads: defineTable({
  userId: v.id("users"),
  lastSeenTime: v.number(),
})
  .index("by_user", ["userId"]),
```

- [ ] **Step 2:** `npx convex dev` (or rely on `bunx tsc --noEmit`) to regenerate `_generated` types. Confirm no schema-validation error against existing data.

**Exit criteria:** `bunx tsc --noEmit` clean; `_generated/dataModel` includes the three tables.

---

## Task 2: `convex/reactions.ts` + enrich `logEntries`

**Files:** New `convex/reactions.ts`; modify `convex/logEntries.ts`

- [ ] **Step 1:** `reactions.ts` — module-local `requireAuth` (copy the existing pattern). Export `toggle`:

```ts
export const toggle = mutation({
  args: { logEntryId: v.id("logEntries") },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);
    const entry = await ctx.db.get(args.logEntryId);
    if (!entry) throw new ConvexError("Færslan fannst ekki.");
    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_entry_and_user", (q) =>
        q.eq("logEntryId", args.logEntryId).eq("userId", userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    else await ctx.db.insert("reactions", { logEntryId: args.logEntryId, userId });
  },
});
```

- [ ] **Step 2:** Export an `enrichReactions(ctx, logEntryId, currentUserId)` helper returning `{ reactionCount, reactedByMe, reactorNames }` (query `by_entry`, resolve names via the existing user lookup).

- [ ] **Step 3:** In `logEntries.ts`, extend the `enrich` function so `recent`, `list`, and `get` include `reactionCount`, `reactedByMe`, `reactorNames`, and `commentCount` (comment count uses `comments.countFor` from Task 3 — land Task 3's helper first or stub `commentCount: 0` and fill in Task 3). Pass the current `userId` (already resolved in `requireAuth`) into `enrich`.

**Exit criteria:** `logEntries.list` returns the new fields; `reactions.toggle` adds then removes on second call. Covered by Task 8 tests.

---

## Task 3: `convex/comments.ts` + enrich `appointments` + cascade delete

**Files:** New `convex/comments.ts`; modify `convex/appointments.ts`

- [ ] **Step 1:** `comments.ts` with module-local `requireAuth`. Export:
  - `list { targetType, targetId }` → ascending by `_creationTime`, each enriched `{ author: {_id,name,image}, isMine }`.
  - `add { targetType, targetId, content }` → trim, reject empty (`ConvexError("Athugasemd má ekki vera tóm.")`), validate target exists (`ctx.db.get(targetId)`), insert with `authorId`.
  - `update { id, content }` → author-only guard (`"Þú getur aðeins breytt þínum eigin athugasemdum."`), trim, set `editedAt`.
  - `remove { id }` → author-only guard, delete.
  - `countFor(ctx, targetType, targetId)` helper → `by_target` count (used by both enrichers).

- [ ] **Step 2:** In `appointments.ts`, `withDriver` gains `commentCount` via `countFor`. Confirm all consumers (`list`, `upcoming`, `past`, `get`, `byWeek`, `byRange`) inherit it.

- [ ] **Step 3:** In `appointments.remove`, before `ctx.db.delete(args.id)`, query `comments.by_target` for this appointment and delete each (cascade). Series-skip path (status → cancelled) is untouched — comments persist.

- [ ] **Step 4:** Wire the `commentCount` from Task 2 Step 3 in `logEntries.enrich` to `countFor`.

**Exit criteria:** comment CRUD works with author guards; appointment + log queries carry `commentCount`; deleting a standalone appointment removes its comments. Covered by Task 8.

---

## Task 4: `convex/journalReads.ts` (read-receipt engine)

**Files:** New `convex/journalReads.ts`

- [ ] **Step 1:** `markSeen { seenThroughTime }` — upsert caller's row to `lastSeenTime = max(existing ?? 0, seenThroughTime)` (monotonic, never regresses).

- [ ] **Step 2:** `receipts {}` — return `[{ userId, name, image, lastSeenTime }]` for every `journalReads` row, resolving user summaries. Requires auth.

**Exit criteria:** `markSeen` is monotonic and idempotent; `receipts` lists per-user high-waters. Covered by Task 8.

---

## Task 5: Reactions + comments UI (buttons + thread sheet)

**Files:** New `ReactionButton.tsx`, `CommentButton.tsx`, `CommentThreadSheet.tsx`, `CommentRow.tsx`, `CommentComposer.tsx`; modify `LogFeed`/`LogEntryCard`, `AppointmentCard`, `TimarDetail`.

- [ ] **Step 1:** `ReactionButton` — pill (`min-h-12 px-4 rounded-full`), filled/outline `Heart` per `reactedByMe`, count when > 0, calls `reactions.toggle`. `aria-label` from `reactions.like`/`reactions.unlike` (+ `reactions.names` when count > 0). No optimistic update.

- [ ] **Step 2:** `CommentButton` — `MessageCircle` + `commentCount` pill; opens `CommentThreadSheet`. `aria-label` `discussion.openCount`.

- [ ] **Step 3:** `CommentThreadSheet` — bottom Sheet (`side="bottom" max-h-[92vh] rounded-t-2xl`, `showCloseButton`), props `{ targetType, targetId, summary }`. Header `discussion.comments` + muted parent summary line. Body = `comments.list` mapped to `CommentRow` (empty → Pattern 5 line `discussion.empty`). Footer = `CommentComposer`. Announce `discussion.announce.sent` via `announce()` on success.

- [ ] **Step 4:** `CommentRow` — `Avatar size-9` + name + `<time>` relative (Pattern 9) + content + "Breytt" badge when `editedAt`. If `isMine`: "Breyta" (Pattern 1) inline-edit into composer, and "Eyða" → `ConfirmDialog` (Pattern 2, `discussion.deleteConfirm.*`, announce `discussion.announce.deleted`).

- [ ] **Step 5:** `CommentComposer` — `Textarea` (`discussion.placeholder`) + `size="touch"` "Senda" (`discussion.send`); empty/whitespace disables. Reused for new + edit.

- [ ] **Step 6:** Add the footer action row to the journal card (`border-t border-divider`): `ReactionButton` + `CommentButton`. Add `CommentButton` only to `AppointmentCard` and `TimarDetail` (no heart).

**Exit criteria:** Heart toggles live across two tabs; threads open from journal and appointment surfaces; comment add/edit/delete works; all tap targets ≥ 48px; zero hardcoded strings.

---

## Task 6: "Seen by" read receipts on the Dagbók feed

**Files:** New `SeenByCluster.tsx`; modify `LogFeed.tsx`

- [ ] **Step 1:** On feed render, call `journalReads.markSeen({ seenThroughTime: newestEntry._creationTime })` (guard against empty feed; only fire when there is a newest entry).

- [ ] **Step 2:** Subscribe to `journalReads.receipts`. Compute each user's *landing entry* client-side = newest entry with `_creationTime <= user.lastSeenTime`. Group users by landing entry. Omit the current user.

- [ ] **Step 3:** `SeenByCluster` — right-aligned avatar cluster (up to ~3 + "+N") rendered on each entry that is a landing entry. `aria-label` `dagbok.seenBy.label` (names list); visible count uses `dagbok.seenBy.one`/`.many`. Tone: presence only — no "unseen" callouts.

**Exit criteria:** Opening Dagbók advances your high-water; a second browser/user sees your avatar move up to the newest entry; entries above someone's avatar are their unseen ones.

---

## Task 7: Discovery — activity feed + care badge

**Files:** Modify `convex/activity.ts`, `BottomNav.tsx`, `Sidebar.tsx`, `SinceLastVisit.tsx`

- [ ] **Step 1:** `sinceLastVisit` — add `comment` item kind `{ kind, id, ts, authorName, preview, targetType, targetLabel }` (resolve target to a label; reactions excluded). Merge into the existing sort/cap.

- [ ] **Step 2:** Generalize `unreadLogCount` → count log entries **and** comments created after the caller's `journalReads.lastSeenTime` (read server-side; drop the `cursorMs` arg). Keep the export name or rename to `unreadCount` — if renamed, update both callers.

- [ ] **Step 3:** `BottomNav` + `Sidebar` — call the badge query without the localStorage cursor; remove the now-dead `lastVisitCursor` helpers used only for the badge. (The dashboard `SinceLastVisit` keeps its own localStorage cursor — Nic confirmed; do not touch its cursor logic, only add the `comment` kind render.)

- [ ] **Step 4:** `SinceLastVisit` — render the `comment` kind with subject-first copy (`dashboard.sinceLastVisit.comment`), deep-linking to the journal entry (open its thread) or appointment.

**Exit criteria:** A new comment shows in "Síðan síðast" and bumps the care badge; a new heart does neither; the badge is now cross-device consistent.

---

## Task 8: Tests (Vitest, Convex)

**Files:** New `convex/reactions.test.ts`, `convex/comments.test.ts`, `convex/journalReads.test.ts`; extend the auth-throw table test if present.

- [ ] **Step 1:** Add the new queries/mutations to the existing auth-throw table (mirror `convex/auth.test.ts`) — each throws `"Ekki innskráður"` unauthenticated.
- [ ] **Step 2:** `reactions` — toggle adds then removes; count + `reactedByMe` enrichment correct.
- [ ] **Step 3:** `comments` — add trims/rejects empty; `update`/`remove` reject non-authors; `appointments.remove` cascades comment deletion.
- [ ] **Step 4:** `journalReads` — `markSeen` is monotonic (a smaller `seenThroughTime` doesn't regress); `receipts` shape.

**Exit criteria:** `bun run test` (or the project's Vitest command) green; `bun run lint` + `bunx tsc --noEmit` clean.

---

## Task 9: i18n + docs-sync

**Files:** `messages/{is,en}.json`; then `docs/spec.md`, `docs/implementation-plan.md`, `docs/ux-patterns.md`.

- [ ] **Step 1:** Add the `discussion`, `reactions` namespaces, `dagbok.seenBy.*`, and the `dashboard.sinceLastVisit.comment` template per spec §8 — Icelandic first (feminine), English mirror. Curly Icelandic quotes in ICU strings. (`[skip-qa]` acceptable — i18n-only.)
- [ ] **Step 2:** Invoke `docs-sync` (`Agent` `subagent_type: "docs-sync"` or `/docs-check`) to fold the shipped feature into `docs/spec.md` (schema, function contracts, Dagbók + Tímar view sections) and `docs/implementation-plan.md` as a new phase, and to add a "reactions/comments/receipts" interaction note to `docs/ux-patterns.md`. docs-sync is the only agent that edits those canonical docs.

**Exit criteria:** `messages/is.json` and `en.json` key-parity; docs reflect the built feature; no nav/route drift left undocumented.

---

## Verification checklist (before finishing the branch)

- [ ] `bun run lint` clean
- [ ] `bunx tsc --noEmit` clean
- [ ] Vitest suite green (incl. the three new test files)
- [ ] Manual: heart toggles live across two tabs; comment thread opens on a journal entry AND an appointment; comment edit/delete (author-only) works; deleting a standalone appointment removes its comments
- [ ] Manual: "seen by" — open Dagbók as user A, confirm user B sees A's avatar advance to the newest entry; unseen entries stack above the avatar
- [ ] Manual: a new comment appears in "Síðan síðast" + bumps the care badge; a new heart does neither
- [ ] `messages/{is,en}.json` key-parity; nothing hardcoded
- [ ] All tap targets ≥ 48px; no inline hex; `<time>` + sr-only on comment timestamps
- [ ] Then run `superpowers:finishing-a-development-branch` (4-option menu) and `/code-review` before any merge
```
