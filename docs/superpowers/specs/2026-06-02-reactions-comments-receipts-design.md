# Reactions, Comments & Read Receipts — Design Spec

> **Status:** Proposed (brainstormed 2026-06-02). Not yet built. Spec only — defer the task-by-task build plan to a follow-up `docs/superpowers/plans/` doc once Nic greenlights.
>
> **Branch:** `claude/journal-calendar-reactions-comments-CksC5`

**Goal:** Let the family *react to* and *talk under* the things they already look at every day — the care journal (Dagbók) and appointments (Tímar) — without turning Sigga back into a chat app. Plus a Messenger-style **"seen by"** indicator on the journal so each sister can tell, at a glance, who has caught up.

This is the one feature where the 60+ Messenger-migrant audience already has muscle memory: tap-to-like, reply-under-a-post, and the little "seen" avatars are exactly what they're leaving Facebook to keep. The design risk is therefore **tone and clutter**, not comprehension. Every decision below privileges *predictable > rich* (per `docs/ux-patterns.md`).

---

## 1. Scope & locked decisions

Decided with Nic during the 2026-06-02 brainstorm:

| Decision | Choice | Rationale |
| --- | --- | --- |
| **Reaction vocabulary** | A **single ❤️ heart** ("Hjarta"). One tap toggles it on/off. | Simplest possible. No emoji picker, no negative reactions (😂/😢/😡 land badly on cancer-care news). |
| **Reactions — where** | **Journal entries only.** | Appointments are *facts*, not authored posts (`ux-patterns.md` Pattern 10). Reacting to a dentist time is odd. |
| **Comments — where** | **Both** journal entries **and** appointments. | On appointments, comments are *coordination* ("Ég sæki hana 13:30", "hvenær eigum við að leggja af stað?") — genuinely useful. |
| **Discovery** | New **comments** appear in the dashboard "Síðan síðast" feed and bump the care-tab badge. **Reactions are silent** (visible on the item, but no feed entry, no badge). | Avoids badge spam from a flurry of hearts; replies are the thing people must not miss. |
| **Read receipts** | **Journal only**, Messenger-style high-water "seen by" avatars. Always on, visible to the whole family, no opt-out. | Family explicitly asked for it; for four sisters caring for their mother it's reassurance ("the others are keeping up"), not surveillance. |

**Defaulted (not asked — flag if you disagree):**
- **Flat threads.** No nested replies. One level deep, oldest-first (chat reading order).
- **Comment authors can edit *and delete* their own comments.** This is looser than journal entries (which are append-only by spec) — a comment is conversation, not a care record, so a typo'd or regretted comment should be removable. Edits set `editedAt` and show a "Breytt" badge, mirroring log entries.
- **No reactions on comments.** Only on the top-level journal entry.
- **Read receipts cover the Dagbók journal feed only** — not appointment comment threads, not per-comment "seen". "Who's caught up on the journal" is the ask; per-comment receipts would be noise.

---

## 2. Data model (schema additions)

Three new tables in `convex/schema.ts`. **No changes to existing tables** — all additive, so no `convex-migration-helper` widen/migrate/narrow dance is needed; a plain deploy suffices.

```ts
// ❤️ on journal entries only. One row = one person's heart on one entry.
reactions: defineTable({
  logEntryId: v.id("logEntries"),
  userId: v.id("users"),
})
  .index("by_entry", ["logEntryId"])
  .index("by_entry_and_user", ["logEntryId", "userId"]),

// Comments on journal entries AND appointments (polymorphic target).
comments: defineTable({
  targetType: v.union(v.literal("logEntry"), v.literal("appointment")),
  targetId: v.union(v.id("logEntries"), v.id("appointments")),
  authorId: v.id("users"),
  content: v.string(),
  editedAt: v.optional(v.number()),
})
  .index("by_target", ["targetType", "targetId"]),

// Per-user journal read high-water mark (the "seen by" engine).
journalReads: defineTable({
  userId: v.id("users"),
  lastSeenTime: v.number(), // _creationTime of the newest logEntry this user has seen
})
  .index("by_user", ["userId"]),
```

**Why a single heart needs its own table and not a field on `logEntries`:** we must know *who* reacted (to render avatars / "Helga og Anna") and let each person toggle independently. A `reactions` row per person is the clean model and keeps `logEntries` append-only-pure.

**Why `comments` is polymorphic (one table, not `logComments` + `appointmentComments`):** the thread UI, the mutations, and the activity-feed integration are identical for both targets. `targetType` + a union `targetId` lets one `comments.ts` module and one `<CommentThreadSheet>` serve both. The `by_target` index is queried as `q.eq("targetType", t).eq("targetId", id)`.

**Why `journalReads` is server-side (not the existing localStorage `sigga.lastVisit` cursor):** the localStorage cursor is per-device and private to one browser — it cannot tell Helga what Anna has seen. "Seen by" *requires* a shared, server-side high-water mark. This table becomes the canonical journal read-state and supersedes the localStorage cursor for the care-tab badge (see §6).

---

## 3. Convex function contracts

All new queries and mutations call the module-local `requireAuth(ctx)` and throw `ConvexError("Ekki innskráður")` when unauthenticated — **no new soft-return exceptions** (the only two remain `users.me` and `events.isAdmin`). Comment edit/delete additionally check `authorId === currentUser`, mirroring `logEntries.update`.

### `convex/reactions.ts`
- `toggle` — mutation `{ logEntryId }`. If a `by_entry_and_user` row exists for the caller, delete it; else insert one. Returns nothing (the live `useQuery` on the feed re-renders). Validates the entry exists.
- *(No standalone list query.)* Reaction state is **enriched into the log-entry queries** (see below) so the feed needs one subscription, not N.

### `convex/comments.ts`
- `list` — query `{ targetType, targetId }`. Returns the thread ordered **ascending** by `_creationTime` (oldest first), each enriched with an `author` summary (`{ _id, name, image }`) and `isMine: boolean`. Requires auth.
- `add` — mutation `{ targetType, targetId, content }`. Trims content; throws `ConvexError("Athugasemd má ekki vera tóm.")` if empty. Validates the target exists. Sets `authorId = currentUser`.
- `update` — mutation `{ id, content }`. Author-only (`ConvexError("Þú getur aðeins breytt þínum eigin athugasemdum.")`). Trims; sets `editedAt = Date.now()`.
- `remove` — mutation `{ id }`. Author-only. Deletes the row.

### `convex/journalReads.ts`
- `markSeen` — mutation `{ seenThroughTime }`. Upserts the caller's row to `lastSeenTime = max(existing, seenThroughTime)`. Idempotent and monotonic (never moves backward). Called by the Dagbók view when the feed renders (client passes the newest entry's `_creationTime`).
- `receipts` — query `{}`. Returns `[{ userId, name, image, lastSeenTime }]` for every user that has a `journalReads` row. The feed component maps each user to their "landing entry" (see §5). Requires auth.

### Enrichment changes to existing modules
- **`convex/logEntries.ts`** — `recent`, `list`, and `get` enrich each entry with:
  - `reactionCount: number`, `reactedByMe: boolean`, `reactorNames: string[]` (for the accessible label / optional names popover),
  - `commentCount: number`.
- **`convex/appointments.ts`** — `withDriver` (the shared enricher) gains `commentCount: number`, so every appointment surface (`list`, `upcoming`, `past`, `get`, `byWeek`, `byRange`) shows the thread badge. *(No reaction fields — appointments have no reactions.)*

> **Read-amplification note:** these enrichers add a couple of indexed reads per row. For a family-scale app (a handful of users, tens of entries per page) this is fine. If a Dagbók page ever feels slow, the `convex-performance-audit` skill is the tool — do **not** pre-optimize with denormalized counters in v1.

### `convex/activity.ts` (modified — see §6)
- `sinceLastVisit` gains a new `comment` item kind.
- `unreadLogCount` is **generalized** to count unread journal entries **and** comments, and reads the high-water from `journalReads` instead of the client-supplied cursor.

---

## 4. UI design

### 4.1 Journal entry card (`LogFeed` / `LogEntryCard`)

Add a **footer action row** below the entry content, above the card's bottom edge, separated by `border-t border-divider`:

```
[ ❤️ 3 ]   [ 💬 2 ]                         ·  seen-by avatars (see §5)
```

- **Heart button** — `<button>` honoring the 48px floor (`min-h-12 px-4 rounded-full`). Filled heart + sage tint when `reactedByMe`, outline heart otherwise. Shows `reactionCount` when > 0. Tap calls `reactions.toggle`. No optimistic update (Pattern 14) — the live subscription re-renders. `aria-label`: `"Líka við færslu"` / `"Taka líkann til baka"`; when count > 0, append reactor names so screen-reader users hear "Hjarta — Helga, Anna".
- **Comment button** — same pill shape, `MessageCircle` icon + `commentCount`. Opens `<CommentThreadSheet>` for this entry. `aria-label`: `"Opna athugasemdir ({count})"`.
- Both icons are paired with a number (or are icon-only at count 0); per CLAUDE.md Lucide icons always pair with text — the count *is* the text, and at zero the `aria-label` carries the meaning.

### 4.2 Appointment card / detail (`AppointmentCard`, `TimarDetail`)

- **Comment button only** (no heart), same pill, in the card's action area / detail footer. Opens `<CommentThreadSheet>` for the appointment.
- Past *and* upcoming appointments get it (coordination happens before; recollection happens after).

### 4.3 `<CommentThreadSheet>` — the shared thread surface

One new component serves both targets. Per Pattern 4 (Sheet = enter data / complete a task) it is a **bottom Sheet** (`side="bottom"`, `max-h-[92vh]`, `rounded-t-2xl`):

- **Header:** `SheetTitle` "Athugasemdir" + a one-line, muted summary of the parent (journal preview snippet, or appointment title + date) so the user keeps context.
- **Body:** the flat comment list (oldest → newest), each row = `Avatar size-9` + name + relative timestamp (Pattern 9: `<time>` + sr-only absolute) + content. The author's own comments expose a small "Breyta" / "Eyða" affordance (Pattern 1 edit, Pattern 2 destroy-via-`ConfirmDialog`). "Breytt" badge when `editedAt` is set.
- **Composer (pinned bottom):** multiline `Textarea`, placeholder `"Skrifa athugasemd…"`, and a `size="touch"` **"Senda"** button. Empty/whitespace disables send. On success the new comment appears live (no toast — Pattern 11 announce via the live-region: `"Athugasemd send."`).
- **Empty state:** Pattern 5 line — `MessageCircle` icon + `"Engar athugasemdir ennþá."` + the composer is right there, so no separate CTA.

> **Why a Sheet, not a detail route or inline accordion:** the app has no log-entry detail route today, and inline accordions were retired for editing (Pattern 1). A bottom Sheet is the app's established "do a focused task" surface, works identically on mobile and desktop, and needs zero routing changes. The thread reads top-down like a Messenger reply chain, which is the familiar shape.

### 4.4 Colour & tone

- Heart-filled uses an existing token (sage family for "calm/positive" per Pattern 16) — **no new palette colour, no inline hex.** A small `--tone-heart` token may be registered in `@theme inline` if sage reads wrong, but the palette does not grow beyond a registered token.
- All copy Icelandic-first, feminine default (Pattern 17): `"Skrifa athugasemd"`, `"Senda"`, `"Breytt"`, `"send"` not "submitted".

---

## 5. Read receipts — "seen by" mechanics

This is the subtle part, because the Dagbók feed is **reverse-chronological (newest at top)**, the opposite of a Messenger chat (newest at bottom). The model still reduces to a single per-user high-water mark — **no scroll/IntersectionObserver tracking required.**

**The model:**
- Each user has one `journalReads.lastSeenTime` = the `_creationTime` of the **newest** journal entry they have seen.
- A user's avatar appears at exactly **one** entry: the newest entry whose `_creationTime <= lastSeenTime` — their *landing entry*.
- Entries **above** a person's landing entry (newer) are ones they **haven't** seen yet. So a sister who hasn't opened the app in two days has her avatar sitting a few entries down, with the unseen new entries stacked above it — a literal "she's caught up to here" line, exactly like Messenger.

**Marking seen:** when the Dagbók feed renders, the client calls `journalReads.markSeen({ seenThroughTime: newestEntry._creationTime })`. Opening the journal = you've seen the top. (We deliberately do *not* require scrolling to the bottom — reading the newest entries is "caught up"; older entries below are history, already seen on prior visits.)

**Rendering ("seen by" row):** the `LogFeed` calls `journalReads.receipts`, then for each user computes their landing entry client-side (the newest entry with `_creationTime <= user.lastSeenTime`) and groups avatars by entry. Each entry that is someone's landing entry renders a compact right-aligned avatar cluster:

```
… entry content …
                              👩 👩  ·  3 sáu     ← "3 saw"
```

- Cluster shows up to ~3 avatars + an overflow "+N"; `aria-label` lists the names ("Helga, Anna og Erla sáu þetta").
- The current user's own avatar is omitted from clusters (you don't need to be told you saw your own view) — matching Messenger.
- Copy: `"{name} sá"` / `"{count} sáu"` (saw, feminine-neutral plural). Keys under `dagbok.seenBy.*`.

**Tone guardrail:** receipts are presence, never pressure. No "unseen by Anna" callouts, no nagging. The absence of an avatar at the top simply means someone hasn't opened it yet — quiet, not accusatory.

---

## 6. Discovery: activity feed + badge integration

Per the locked decision, **comments** are discoverable; **reactions** are silent.

### `activity.sinceLastVisit` (dashboard "Síðan síðast" card)
Add a `comment` item kind:
```ts
type CommentItem = {
  kind: "comment";
  id: Id<"comments">;
  ts: number;            // _creationTime
  authorName: string;
  preview: string;       // first ~80 chars
  targetType: "logEntry" | "appointment";
  targetLabel: string;   // journal snippet or appointment title — for the deep link
};
```
Copy (Pattern 10 subject-first): `"{name} skrifaði athugasemd"` with the target as object — e.g. `„{name} skrifaði athugasemd við tíma „{targetLabel}""`. Tapping the item routes to the journal entry (opens its thread) or the appointment.

### `activity.unreadLogCount` → generalize to the care badge
- Rename/extend to count **journal entries + comments** created after the caller's `journalReads.lastSeenTime` (read server-side, not from a client cursor). This makes the care-tab unread badge **cross-device consistent** for the first time.
- Update the two callers — `src/components/nav/BottomNav.tsx` and `src/components/nav/Sidebar.tsx` — to drop the localStorage `lastVisitCursor` argument (the server now owns it). The dashboard `SinceLastVisit` component may keep its own localStorage "since I opened the dashboard" cursor for the *feed* view, or migrate to the server high-water — see open item below.

> **Appointment comments and the badge:** there is no Tímar badge today. Appointment-comment discovery rides on the "Síðan síðast" feed (which shows all kinds) and the care badge (which becomes a general "new discussion" badge). A dedicated Tímar badge is a possible follow-up, not v1.

---

## 7. Edge cases & cascades

- **Deleting an appointment** (`appointments.remove`, standalone) must also delete its comments — query `by_target` and delete each, before/after `ctx.db.delete(args.id)`. Series-skip (`status: "cancelled"`) **keeps** comments (the slot stays visible). Journal entries are never deleted, so their reactions/comments never orphan.
- **A reaction/comment by a user who later loses access:** rows persist; enrichers resolve a missing user to a `"—"` fallback (same pattern as `activity.nameOf`).
- **Empty content:** trimmed and rejected server-side for comments (mirrors `logEntries.add`).
- **Concurrent toggle:** `reactions.toggle` is naturally idempotent-ish; a double-tap reconciles to present/absent via the `by_entry_and_user` lookup. No optimistic UI (Pattern 14), so no flicker to reconcile.
- **High-water monotonicity:** `markSeen` only ever moves `lastSeenTime` forward, so an old tab rendering a stale feed can't regress someone's receipts.

---

## 8. i18n

New namespace block in `messages/is.json` (primary, feminine-first) mirrored in `messages/en.json`:

```jsonc
"discussion": {
  "comments": "Athugasemdir",
  "write": "Skrifa athugasemd",
  "placeholder": "Skrifa athugasemd…",
  "send": "Senda",
  "empty": "Engar athugasemdir ennþá.",
  "edited": "Breytt",
  "openCount": "Opna athugasemdir ({count})",
  "deleteConfirm": {
    "title": "Eyða athugasemd?",
    "body": "Þetta er ekki hægt að afturkalla."
  },
  "announce": { "sent": "Athugasemd send.", "deleted": "Athugasemd eytt." }
},
"reactions": {
  "like": "Líka við færslu",
  "unlike": "Taka líkann til baka",
  "names": "Hjarta — {names}"
},
"dagbok": {
  // …existing…
  "seenBy": {
    "one": "{name} sá",
    "many": "{count} sáu",
    "label": "{names} sáu þetta"
  }
}
```
Curly Icelandic quotes (`„…"`) inside ICU strings, per the existing `activity` convention.

---

## 9. Authorization summary

- Every new query/mutation: `requireAuth` → throw if null. No new soft-return gates.
- `comments.update` / `comments.remove`: author-only (`authorId === currentUser`).
- `reactions.toggle`, `comments.add`, `journalReads.markSeen`, `journalReads.receipts`, `comments.list`: any authenticated family member.
- No roles (consistent with v1). The whitelist is still enforced solely by `getAuthUserId` + server-side auth, since `NEXT_PUBLIC_CONVEX_URL` ships in the bundle.

---

## 10. Suggested build phases (outline only)

A full task-by-task `plans/` doc comes after greenlight. Rough shape:

1. **Schema + reactions backend** — three tables; `reactions.ts`; enrich `logEntries.*`.
2. **Comments backend** — `comments.ts`; enrich `appointments` `withDriver`; cascade delete in `appointments.remove`.
3. **Reactions UI** — heart button on `LogEntryCard`.
4. **Comments UI** — `<CommentThreadSheet>` + buttons on journal & appointment cards.
5. **Read receipts** — `journalReads.ts`; `markSeen` on Dagbók view; "seen by" avatar clusters in `LogFeed`.
6. **Discovery** — `comment` kind in `sinceLastVisit`; generalize `unreadLogCount` + rewire nav badges.
7. **i18n + a11y + tests** — Vitest for the new Convex modules (auth-throw table, toggle idempotency, high-water monotonicity, cascade delete); `messages/{is,en}.json`; manual `bun run lint` + `bunx tsc --noEmit`.
8. **docs-sync** — fold the built feature into `docs/spec.md` + `docs/implementation-plan.md` as a new phase, and add the relevant `ux-patterns.md` notes (a "reactions/comments" interaction pattern).

Each step = one commit, `/qa` before each (i18n/doc-only steps may `[skip-qa]`).

---

## 11. Out of scope (v1) — explicitly deferred

- **Reaction variety** (more than ❤️), reactions on comments, reactions on appointments.
- **Per-comment read receipts** and read receipts on appointment threads.
- **Push notifications** for replies (still v2 per spec — needs the deferred service worker).
- **@-mentions, rich text, attachments/photos in comments.**
- **Nested/threaded replies** (flat only).
- **A dedicated Tímar unread badge.**
- **Edit history** for comments (just `editedAt` + "Breytt", like log entries).

---

## 12. Open items for Nic

1. **Read-receipt privacy.** Defaulted to always-on, family-wide, no opt-out (you asked for Messenger-style). Confirm nobody will find "Anna can see I read it but didn't reply" uncomfortable — for four sisters it reads as reassurance, but it's your call.
2. **Dashboard "Síðan síðast" cursor.** Do we migrate it to the new server high-water (so it clears across devices when you read the journal), or keep its current localStorage "since I opened the dashboard" behavior? Default: keep as-is for now to limit churn; the care *badge* moves to the server, the dashboard *feed* can follow later.
3. **"Seen by" placement.** Avatar cluster per-entry (Messenger-exact, specced above) vs. a single summary line at the top of the feed ("Helga og Anna eru búnar að lesa"). Specced the former; the latter is calmer if per-entry clusters feel busy.
