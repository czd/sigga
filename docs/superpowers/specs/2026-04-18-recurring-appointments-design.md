# Recurring Appointments — Design

**Status:** Draft (brainstormed 2026-04-18, not yet planned)
**Target phase:** Follow-up to Phase 8 (Tímar) — see `docs/implementation-plan.md`

## Problem

Sigga has appointments that happen on a regular cadence — e.g. **Virkni og Vellíðan** (Kópavogur municipal activity programme) runs Tuesdays and Fridays at 09:15 at Fífan. There are probably 2–4 such series at any time (exercise programme, physio, periodic GP check-ins).

Today these have to be entered as individual appointments, which either (a) creates dozens of duplicate rows that bury one-off appointments in the Tímar list, or (b) means the family simply doesn't enter them, losing the driver-coordination benefit.

The family *does* need per-occurrence driver tracking — "who's skutlandi on Friday?" changes week to week — but does *not* want to see 8 copies of "Virkni og Vellíðan" on the Tímar page, and only wants to be prompted for the driver of the **very next** occurrence.

## Design summary

A small `recurringSeries` table holds the pattern. The existing `appointments` table gains an optional `seriesId` pointer. **At any moment, each active series has at most one upcoming `appointments` row** — no schedule materialised beyond "next time". The next occurrence is (re)spawned whenever the current one completes, is cancelled, or the daily safety cron catches a gap. The `appointments.driverId` field continues to do all the driver work, unchanged.

This keeps the DB footprint tiny, leaves the dashboard & Tímar views visually calm, and preserves the existing one-off appointment flow exactly.

## Data model

### `recurringSeries` (new table)

```ts
recurringSeries: defineTable({
  title: v.string(),                    // "Virkni og Vellíðan"
  location: v.optional(v.string()),     // "Fífan"
  notes: v.optional(v.string()),
  daysOfWeek: v.array(v.number()),      // [2, 5] = Tue, Fri — 0=Sun .. 6=Sat, matches Date.getUTCDay()
  timeOfDay: v.string(),                // "09:15" — Iceland is UTC+0 year-round, no DST math
  durationMinutes: v.optional(v.number()),
  isActive: v.boolean(),                // pause/play
  createdBy: v.id("users"),
  updatedAt: v.number(),
  updatedBy: v.id("users"),
}).index("by_active", ["isActive"])
```

### `appointments` (existing — adds one field)

```ts
appointments: defineTable({
  // ...unchanged fields from docs/spec.md...
  seriesId: v.optional(v.id("recurringSeries")),  // null = one-off; set = spawned from a series
})
  .index("by_startTime", ["startTime"])
  .index("by_status_and_startTime", ["status", "startTime"])
  .index("by_series_and_startTime", ["seriesId", "startTime"])  // NEW — used by invariant checks
```

### Validation rules

- `daysOfWeek`: non-empty, each value in `0..6`, deduplicated, sorted ascending. Reject empty array at mutation boundary.
- `timeOfDay`: must match `/^([01]\d|2[0-3]):[0-5]\d$/`. Reject otherwise.
- `durationMinutes`: if set, `>= 1 && <= 24*60`.

## Lifecycle — the core invariant

> **Invariant:** every `recurringSeries` with `isActive === true` has *exactly zero or one* upcoming `appointments` row (i.e. `seriesId === series._id && status === "upcoming" && startTime >= now`).

Four places enforce it — each calls a shared helper `ensureNextOccurrence(ctx, seriesId)`:

1. **Series created and active** → `ensureNextOccurrence` spawns the first row.
2. **Series resumed** (`isActive: false → true`) → spawn the next row if none exists.
3. **Current occurrence completed or cancelled** (mutation hook on `appointments.update` / `remove` / status transition) → when an appointment with a `seriesId` leaves the "upcoming" state, spawn the next one immediately. No gap on the dashboard.
4. **Daily safety cron** at 00:10 UTC (`recurringSeries.ensureNextOccurrences`) — for every active series, ensure exactly one upcoming row. Catches: startTime simply passed without being marked completed; missed mutation hooks; deploys that land mid-day.

### `ensureNextOccurrence(ctx, seriesId)` algorithm

1. Load series. If `!isActive`, return (don't spawn).
2. Query `appointments` by index `by_series_and_startTime` where `seriesId = seriesId && startTime >= now`. If any `status === "upcoming"` row exists, return (invariant already holds).
3. Compute the next occurrence timestamp from `daysOfWeek` + `timeOfDay`. Walk forward from `now` one day at a time (max 7 iterations) until `getUTCDay()` is in `daysOfWeek` **and** the resulting `startTime` is strictly `> now`. This naturally skips today if today's occurrence has already passed.
4. Insert an `appointments` row: `seriesId`, `title` / `location` / `notes` copied from the series, `startTime` computed, `endTime = startTime + durationMinutes * 60_000` if duration set, `status: "upcoming"`, `driverId: undefined`, `createdBy`/`updatedBy` = series owner (or system user — see open question #1 below if one arises).

### Pause/resume semantics

- **Pause** (`isActive: true → false`) **deletes** the upcoming occurrence row. Rationale: a paused series must not leave a stale "next time" on the dashboard — that would confuse the whole family. History (past occurrences) is untouched.
- **Resume** (`isActive: false → true`) calls `ensureNextOccurrence`, spawning the next matching date.

### Delete semantics

Deleting a series:
1. Deletes the upcoming occurrence (if any).
2. Sets `seriesId = undefined` on all past occurrences — they survive as standalone historical appointments, because the family will want to look them up later ("when did mom last go to Virkni?").
3. Deletes the `recurringSeries` row.

Requires confirmation dialog (it's a non-trivial operation). Dialog copy: *"Eyða [title]? Eldri tímar verða áfram sýnilegir í Liðnir tímar."*

### Cancelling a single occurrence

No new mechanism — uses the existing `appointments.update({ status: "cancelled" })` flow. The status-change hook (trigger #3 above) detects the transition out of `"upcoming"` and spawns the next matching date automatically. If someone cancels "Tuesday", the system spawns "Friday".

## Convex functions

All mutations call the existing `requireAuth(ctx)` helper. No new roles.

**`convex/recurringSeries.ts`:**

- `list` — query. Returns all series ordered by `title`. Used by the management page.
- `listActive` — query. Returns `isActive: true` only, by index `by_active`. (May not be needed in v1 — evaluate during plan.)
- `get` — query. `{ id }`. Returns a single series or `null`.
- `create` — mutation. `{ title, location?, notes?, daysOfWeek, timeOfDay, durationMinutes? }`. Creates series with `isActive: true`, then calls `ensureNextOccurrence`.
- `update` — mutation. `{ id, ...partial fields }`. Updates the series. **Does not** re-spawn the existing upcoming row; if title/location/time changed and the user wants the upcoming row to reflect the new values, they must cancel it (spawns next with new values) or just edit that appointment directly. This is the simplest mental model; we document it in the edit sheet.
- `remove` — mutation. `{ id }`. Performs the 3-step delete above.
- `setActive` — mutation. `{ id, isActive }`. Toggles pause/play and enforces invariant.
- `ensureNextOccurrences` — internal mutation called by the daily cron; iterates active series and calls `ensureNextOccurrence` for each.

**`convex/appointments.ts`** — update existing mutations:

- `update` / internal status transitions: after committing the change, if `seriesId` was set on the row AND the row is no longer upcoming (status moved to `completed`/`cancelled` OR it's been deleted), call `ensureNextOccurrence(ctx, seriesId)`.
- Dashboard's `appointments.upcoming` query needs no changes — it already returns the next N upcoming rows regardless of origin.

**`convex/crons.ts`:**

```ts
crons.cron(
  "ensure recurring appointment occurrences",
  "10 0 * * *",
  internal.recurringSeries.ensureNextOccurrences,
);
```

## UI

### Aesthetic ("serene borderless" Bókasafn look)

All new surfaces match the existing paper-and-ink palette (`src/app/globals.css`) and the softened card style used in `src/components/dashboard/NextAppointments.tsx` and `src/components/info/MedicationTable.tsx`. Concretely:

- **No hard borders.** Cards and list containers use `bg-paper` (or `bg-paper/60` for inner surfaces), `rounded-2xl`, `ring-1 ring-foreground/10`. Avoid `border` classes on the outer container; reserve `border-b border-divider` for interior row separators only.
- **Typography.** Section titles use `font-serif text-[1.4rem] text-ink font-normal tracking-tight` (matches `NextAppointments` heading). Series titles use `font-serif text-lg leading-snug text-ink`. Supporting text uses `text-ink-faint` / `text-ink-soft`, not `text-muted-foreground` overrides.
- **Action colour.** Primary toggles/buttons use the sage family (`--sage-deep`). Destructive ghost actions (delete) use the existing `destructive` tokens. Amber is reserved for "needs attention" affordances — the driver-prompt dot on the dashboard.
- **Spacing.** Cards use `py-5`-ish interior rhythm, `gap-5` between icon and content (matches `NextAppointments.AppointmentRow`). Do *not* use the older `<Card>` shell from `src/components/ui/card.tsx` with its shadcn ring-1 default — that style (used by `AppointmentCard`) is the older, boxier look; new surfaces should feel lighter.

**Action item for this feature:** while we're touching Tímar, **also** refactor the existing `AppointmentCard` to the new borderless aesthetic, so the recurring surfaces and one-off surfaces feel like one design. Scope: replace the `<Card><CardContent>` wrapper with a borderless `bg-paper ring-1 ring-foreground/10 rounded-2xl` shell, swap `text-muted-foreground` for `text-ink-faint`, use `font-serif` on the title. This is the only cross-feature UI change and is explicitly in scope per the user request.

### Tímar page — one addition

Above the existing tabs, add an entry-point row linking to the management sub-page:

```
Tímar
┌──────────────────────────────────────┐
│  Reglulegir tímar                →   │   bg-paper, ring-1 ring-foreground/10,
│  3 virkir                             │   rounded-2xl, min-h-14, px-5 py-4
└──────────────────────────────────────┘
[ Næstu tímar | Liðnir tímar ]            existing tabs, unchanged
...
```

- Shown always, even with zero series (label becomes *"Reglulegir tímar — engir ennþá"*).
- Tap → navigates to `/[locale]/timar/reglulegir`.
- Count shows count of **active** series only. If zero active but some paused, say *"Allir í hléi"*.

### Upcoming list — unchanged

A series-spawned occurrence is just an `appointments` row; it renders via the (refactored) `AppointmentCard`. No visual badge for "this is recurring" — the title alone ("Virkni og Vellíðan") is enough context, and extra chrome fights the serene look.

### Dashboard — unchanged

`appointments.upcoming` already picks up series-spawned rows. The driver-prompt UI in `NextAppointments.tsx` already handles the "skutlar enginn / Ég keyri" flow and will only ever appear on the single next occurrence — which is exactly the behaviour the user requested.

### New route — `/[locale]/timar/reglulegir`

File: `src/app/[locale]/(app)/timar/reglulegir/page.tsx`
Components: `src/components/recurringSeries/SeriesList.tsx`, `SeriesCard.tsx`, `SeriesForm.tsx`.

Layout:

```
← Tímar
Reglulegir tímar              [font-serif h1, matching Tímar h1 size]

┌──────────────────────────────────────┐
│  Virkni og Vellíðan                  │   bg-paper, ring-1 ring-foreground/10,
│  Þriðjudaga og föstudaga kl. 09:15   │   rounded-2xl, p-5, gap-4
│  Fífan                                │
│  ─────────────────────────            │   hairline border-t border-divider
│  [ ●━━  Virkt ]   [Breyta] [Eyða]    │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  Sjúkraþjálfun (example)             │
│  Miðvikudaga kl. 10:00               │
│  ─────────────────────────            │
│  [ ━━○  Í hléi ]  [Breyta] [Eyða]    │   "Í hléi" row dimmed via text-ink-faint
└──────────────────────────────────────┘

               [  +  Nýr reglulegur tími  ]   pill button, size-touch, sage-deep
```

**Card anatomy:**

- Title: `font-serif text-lg text-ink`.
- Day+time line: `text-sm text-ink-soft`, day names localised + joined with *"og"*. Minutes always shown (09:00 not 9:00).
- Location: `text-sm text-ink-faint` with no icon — keep it quiet.
- Interior divider above the action row: `border-t border-divider`, matches the look used in `AppointmentCard`.
- Switch: shadcn `Switch` primitive (install via `shadcn add switch` if not present), with a visible label next to it — *"Virkt"* when on, *"Í hléi"* when off. Entire row is 48px tall.
- Edit / Delete: `variant="ghost"` `size="touch"`. Delete uses `text-destructive`.

**Empty state:** when zero series exist, show `EmptyState` (existing shared component) with icon `CalendarRange`, title *"Engir reglulegir tímar"*, copy *"Reglulegir tímar sem endurtaka sig — t.d. Virkni og Vellíðan — birtast hér."*

**Paused card:** the whole card keeps full opacity (accessibility) but the day-time line greys out (`text-ink-faint`) and the switch label reads *"Í hléi"*. Don't add strike-through or change the title.

### Series form (create + edit)

Sheet from bottom (`src/components/ui/sheet.tsx`, `side="bottom"`, `max-h-[92vh]`). Mirrors `AppointmentForm.tsx` shape exactly — same padding, same label styling, same Vista button.

Fields, top to bottom:

1. **Heiti** (`<Input>`, `required`, 56px tall).
2. **Dagar** — seven day chips in a grid, 48px each, with weekday abbreviations *Sun Mán Þri Mið Fim Fös Lau*. Chip = `button`, selected state `bg-sage-deep text-paper`, unselected `bg-paper-deep text-ink-soft`, rounded-full. Multi-select.
3. **Tími** (`<Input type="time">`, default 09:00, 56px tall).
4. **Lengd í mínútum** (optional, `<Input type="number">`). Helper text: *"Sjálfgefið: engin skráning."*
5. **Staðsetning** (optional `<Input>`).
6. **Athugasemdir** (optional `<Textarea>`).
7. On edit only: footer note *"Næsti tími uppfærist ekki sjálfkrafa. Ef þú vilt breyta tímanum sem er á dagskrá, breyttu honum beint í Tímar."*
8. Primary button: **Vista** (`size="touch"`, sage-deep).

Cancel closes the sheet.

### FAB behaviour

The Tímar `+` FAB still opens the one-off appointment sheet. Series are created only from `/timar/reglulegir`. This is a deliberate simplification — recurring series are a setup-once, rarely-created concept; polluting the primary FAB with a disambiguation menu would punish the 95% case.

## i18n — new namespace `recurring`

All strings Icelandic-first in `messages/is.json`, English mirror in `messages/en.json`.

```json
"recurring": {
  "title": "Reglulegir tímar",
  "entryLabel": "Reglulegir tímar",
  "entryCount": "{count, plural, =0 {engir ennþá} =1 {1 virkur} other {{count} virkir}}",
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
    "join": " og "
  },
  "cadence": "{days} kl. {time}"
}
```

Weekday joining: for `[2, 5]`, format as `"þriðjudaga og föstudaga"`; for `[1, 3, 5]`, `"mánudaga, miðvikudaga og föstudaga"`. Use the `Intl.ListFormat` with `type: "conjunction"` and locale.

## Testing

Follow `superpowers:test-driven-development` — write tests first.

**Convex unit tests (`convex-test`):**

- `recurringSeries.create` inserts the series *and* a single upcoming appointment at the computed next date.
- `ensureNextOccurrence` is idempotent (running twice does not create two rows).
- Cancelling a series-spawned appointment spawns the next matching date.
- Completing a series-spawned appointment spawns the next.
- Pausing deletes the upcoming row; resuming recreates it.
- Delete nulls `seriesId` on past rows and removes the upcoming row.
- Validation: empty `daysOfWeek`, malformed `timeOfDay`, out-of-range day numbers → `ConvexError`.
- Auth: unauthenticated caller → `ConvexError("Ekki innskráður")` on every mutation *and* query.

**Playwright e2e (`375×812`, Icelandic locale):**

- Create a series with Tue+Fri 09:15 → Tímar upcoming list shows the next matching date.
- Dashboard prompts "Enginn skutlar" on that occurrence; tapping *Ég keyri* assigns driver and updates both Tímar and dashboard (real-time).
- Pause the series → dashboard & Tímar remove the upcoming row.
- Resume → next occurrence reappears.
- Cancel the upcoming occurrence → next matching date replaces it on dashboard.
- Delete series with confirmation dialog → list empty, past occurrences still present in *Liðnir tímar*.

**Real-time invariant test:** two browser contexts. Pause in context A → upcoming row disappears in context B without refresh.

## Explicitly NOT building (v1)

- Default driver on a series. Defeats the "prompt per occurrence" request.
- Skip-next / exception patterns. Cancel the individual appointment instead.
- Date-based auto-resume (*"hefjast aftur 24. apríl"*). Plain pause/play is enough.
- End date / termination date on the series. If it ends, pause or delete.
- Showing the next N future occurrences as a list in the Tímar view. That's the exact swamp the user asked us to avoid.
- Default-driver-per-weekday (e.g., "Helga always drives Tuesdays"). Not requested; adds state.

## Migration / deployment

- The new `recurringSeries` table and the `seriesId` field on `appointments` are purely additive. No data migration required; existing appointments have `seriesId === undefined` and behave identically.
- The new `by_series_and_startTime` index requires a deploy but no backfill.
- No seed data for recurring series in v1. The family will create *Virkni og Vellíðan* by hand from the UI as the first user story. The existing contacts-seed entry already documents the programme.

## Open questions (resolved during brainstorm — kept for record)

- **Who "creates" the spawned appointments?** `createdBy` / `updatedBy` on the spawned row = the series `createdBy`. This is a pragmatic choice; if a series outlives its creator's access we can revisit. No system user needed for v1.
- **Pause while a driver is already assigned to the upcoming row?** Pause still deletes the row — it was paused, the drive isn't happening. The driver was never *committed*; they just volunteered. If we want softer semantics later we can add a "paused appointments" bucket, but v1 favours simplicity.
- **Time format localisation (AM/PM vs 24h)?** Iceland uses 24h. `timeOfDay` stored as `HH:mm` 24h, displayed unchanged in Icelandic. English locale falls back to the same display (this app is Icelandic-first; English is for proofreading).

## Files to add / change

New:
- `convex/recurringSeries.ts`
- `src/app/[locale]/(app)/timar/reglulegir/page.tsx`
- `src/components/recurringSeries/SeriesList.tsx`
- `src/components/recurringSeries/SeriesCard.tsx`
- `src/components/recurringSeries/SeriesForm.tsx`
- `src/components/recurringSeries/DayPicker.tsx` (the seven-chip day selector)
- `src/lib/formatRecurrence.ts` — `formatDays`, `formatCadence`, `computeNextOccurrence`
- `tests/unit/convex/recurringSeries.test.ts`
- `tests/e2e/recurringSeries.spec.ts`

Changed:
- `convex/schema.ts` — add `recurringSeries` table; add `seriesId` field + `by_series_and_startTime` index to `appointments`.
- `convex/appointments.ts` — status-transition hook calls `ensureNextOccurrence`.
- `convex/crons.ts` — register daily job.
- `messages/is.json`, `messages/en.json` — `recurring` namespace.
- `src/app/[locale]/(app)/timar/page.tsx` — insert "Reglulegir tímar" entry-point row above the tabs.
- `src/components/appointments/AppointmentCard.tsx` — refactor to the borderless Bókasafn aesthetic (shared UI polish; explicitly in scope per user request).
- `docs/spec.md` — schema section, function contracts, UI description.
- `docs/implementation-plan.md` — new phase "Reglulegir tímar" inserted after current phase 8.
