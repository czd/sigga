# Desktop "Command Post" — Design

**Status:** Draft (brainstormed 2026-04-18, not yet planned)
**Supersedes:** `2026-04-18-desktop-support-design.md` (kept in repo for history; its implementation shipped as PR #3 and is the foundation this design builds on)
**Target branch:** `claude/desktop-command-post`, stacked on `claude/desktop-support` (PR #3)

## Why we're redesigning

The first-pass desktop implementation (PR #3) added a 248-px left sidebar, capped every route at a 608-px column, and converted bottom sheets to centered modals. Product-owner feedback after local testing:

> "The approach and overview is completely different [on desktop]. We aren't utilizing the space on the horizontal axis, and now it just looks like mobile with a sidebar instead of a bottom bar."

This was a correct reading. The earlier UX research optimized for the 60+ mobile audience and assumed desktop was the same app bigger. It isn't. Desktop Sigga is used by the *younger* daughters (30s–40s) on work laptops between meetings, coordinating care across siblings. These are fluent desktop users who expect to scan, compare, and work across multiple pieces of information at once. They are also the people who do the actual coordination — scheduling who drives mom to which appointment, logging observations after a visit, chasing pending entitlements with the municipality.

Mobile stays exactly as shipped. Desktop gets a different shape.

## Design summary — "Command Post"

Desktop Sigga becomes a **coordination surface**, not a reading surface. Three ideas define it:

1. **A time-first hero.** The dashboard gains a 7-day appointment strip with driver avatars per slot. The strip is the first thing the daughters see when they open the app on a laptop. Tímar's default desktop view likewise becomes a week grid.
2. **Always-available composer.** Dagbók on desktop is a two-pane view — entry list on the left, a permanent composer + selected-entry reader on the right. The composer being visible invites real paragraphs after a visit (the single most-requested desktop affordance implicit in the feedback).
3. **Kanban for coordination work.** Réttindi becomes a 4-column board with drag-to-move status changes. Fólk and Pappírar-Skjöl use the list+detail pattern. Umönnun-Lyf stays a flat list (widened, no detail pane).

Aesthetic stays Bókasafn — same palette, typography, radii, soft dividers. What relaxes: column-width caps go from 608 px to ~1400 px, cards give way to rows above a 7-item-visible threshold, density steps up ~1.3× without feeling cramped. A screenshot should still look recognizably Sigga (same warm paper, sage accents, serif headings); the *shape* of what's on screen differs.

## Breakpoint tiers

Three tiers replace the single `lg:` (1024 px) boundary in PR #3:

| Tier | Range | Shell | Content |
| --- | --- | --- | --- |
| `base` | <768 px | Sticky `Header` + fixed `BottomNav` | Single column, unchanged mobile UX |
| `md` | 768–1279 px | `Sidebar` appears; `Header`/`BottomNav` hide | Single column capped at ~720 px (tablet / small laptop) |
| `xl` | ≥1280 px | Same `Sidebar`, denser content | Multi-pane on surfaces that benefit (Tímar, Fólk, Pappírar-Skjöl, Dagbók, Dashboard) |

Rationale for promoting the sidebar boundary to `md`: 11–13" laptops benefit from the sidebar immediately, but don't have the width to carry multi-pane layouts. Tablets in portrait stay on mobile; landscape iPads land in `md` and get the single-column + sidebar treatment (fine).

The `2xl` (≥1536 px) tier gets modest max-width bumps only — no new IA tier, no extra panes. Don't introduce a fourth layout tier.

PR #3's `lg:hidden` on `BottomNav`/`Header` and `lg:flex` on `Sidebar` get rewritten to `md:hidden`/`md:flex`. PR #3's `lg:max-w-[704px]` / `xl:max-w-[816px]` per-page wrappers go away entirely — replaced by the layout primitives below.

## Layout primitives

Two small components in `src/components/layout/`:

### `<StackLayout>` — for single-column surfaces (Dashboard, Umönnun)

```tsx
<StackLayout>{children}</StackLayout>
```

Renders a column that's auto-centered within the post-sidebar content area, with responsive max-widths:

```
className="mx-auto px-6 pt-4 pb-28 md:pb-8 md:max-w-[720px] xl:max-w-[960px] flex flex-col gap-6"
```

At `md:+` the sidebar consumes 248 px on the left; `<StackLayout>` renders inside `<main>`'s post-sidebar area and `mx-auto` centers the column in that remaining space. No explicit gutter — the sidebar's own `border-r border-divider` is the visual separator; the natural margin from `max-w-*` inside a wider container provides breathing room.

Dashboard overrides the default with `xl:max-w-[1400px]` (it's the widest surface — see below). Everything else defaults to 960 px at `xl:`, which is enough for comfortable prose and card layouts without the "centered marketing page" look centering at full viewport would create.

### `<PaneLayout list detail rail?>` — for multi-pane surfaces

```tsx
<PaneLayout
  list={<TimarList activeId={activeId} />}
  detail={activeId ? <TimarDetail id={activeId} /> : <TimarEmpty />}
  rail={<UpcomingDriverAssignments />}      // optional, xl: only
/>
```

Internals: a CSS grid that collapses gracefully.

- At `base` and `md`: renders only `list` full-width. The `detail` prop is ignored (mobile uses a separate route `/:surface/[id]` for detail views — see the "URL-based selection" section).
- At `xl`: `grid-cols-[minmax(340px,400px)_1fr]`. List pane on the left, detail pane on the right.
- At `xl` with `rail`: `grid-cols-[minmax(340px,400px)_1fr_minmax(300px,320px)]`. Rail is a slim column on the far right.

The primitive owns the grid plumbing once; page files stay boring. Don't reach for `shadcn/ui`'s `resizable` primitive — drag handles are keyboard-trap liabilities for mixed-ability audiences and a complexity Sigga users won't use.

## Shared navigation

Move the `ITEMS` array (current structure in both `BottomNav.tsx` and `Sidebar.tsx` — both declare the same 4 items) to a shared module.

### `src/components/nav/navItems.ts` (new)

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

export function isActiveRoute(pathname: string, href: NavItem["href"]): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

Both `BottomNav` and `Sidebar` import from it. Parity is a single source of truth — when we add/remove primary items later, one edit.

### Sidebar gains two pieces below the nav

1. **Mini week calendar** (new component `src/components/nav/SidebarWeekCalendar.tsx`) — shows Mon–Sun of the current week, with a dot per day that has appointments and a bolder sage-deep color on the current day. Tapping a day navigates to `/timar?day=<YYYY-MM-DD>` which opens the week grid with that day focused (week grid handles the `?day=` param). Fantastical-inspired; helps orient "where in the week am I?" without leaving the current surface.
2. **Per-section attention badges** on each `PRIMARY_ITEMS` row — a small `bg-amber-bg-1 text-amber-ink` pill with a count on the right of the label. Each badge is driven by a Convex query:
   - `dashboard`: combined — unowned in-progress/not-applied entitlements + next unassigned upcoming appointment (if any) → `max(count, 1)`; we use the same data already surfaced in AttentionCard + DrivingCta.
   - `care`: count of log entries since the user's last visit.
   - `people`: no badge (contacts don't accumulate urgency).
   - `paperwork`: `unowned entitlements in not_applied or in_progress` count.

A new Convex query `users.attentionCounts` returns `{ dashboard, care, paperwork }` as a single object so the sidebar does one subscription instead of three. Badges are mobile-visible too — if we're going to compute them on the server, they should serve both shells. (Adds a subtle line to BottomNav items; fine.)

## Per-surface treatment

### Dashboard ("Yfirlit" — renamed from "Í dag")

The mental model shifts from "greeting + what's next" to "what happened, what's happening, what needs me." Uses `<StackLayout>` with `xl:max-w-[1400px]` override.

**`base` / `md` (mobile + tablet):** unchanged from PR #3 — greeting, AttentionCard, DrivingCta, NextAppointments, RecentLog stacked in a single column.

**`xl` (desktop):**

```
┌──────────────────────────────────────────────────────────────────┐
│  Góðan daginn, Anna.                                             │  greeting (full width)
├──────────────────────────────────────────────────────────────────┤
│  VIKA 16 · 13.–19. APRÍL                                         │  eyebrow
│  ┌────┬────┬────┬────┬────┬────┬────┐                            │
│  │Mán │Þri │Mið │Fim │Fös │Lau │Sun │                            │  7-day strip
│  │13  │14  │15  │16  │17  │18  │19  │                            │
│  │🟢  │🟢  │    │🟢  │    │    │    │                            │
│  │10:00│09:15│   │14:30│   │    │    │                            │
│  │Kraba│Virkn│   │GP   │    │    │    │                            │
│  │ [A] │ [B] │   │ [?] │    │    │    │                            │
│  └────┴────┴────┴────┴────┴────┴────┘                            │
├───────────────────────────────────┬──────────────────────────────┤
│  SÍÐAN SÍÐAST                     │  ÞARF ATHYGLI                │
│                                   │                              │
│  Anna · færsla · 14. apr kl 16:20 │  Ferðaþjónusta fatlaðra      │
│    "Mamma var þreytt eftir..."    │  [Ég tek þetta að mér]       │
│                                   │                              │
│  Helga · bætti við tíma · 13. apr │  Endurhæfingaráætlun         │
│                                   │  [Ég tek þetta]              │
│  Nic · nýtt skjal: reikningur.pdf │                              │
│                                   │  Enginn skutlar á fimmtud.   │
│  + older entries (loadMore)       │  [Ég keyri]                  │
└───────────────────────────────────┴──────────────────────────────┘
```

**Greeting:** full-width at top. Unchanged copy.

**7-day strip:** new component `src/components/dashboard/WeekStrip.tsx`. Grid of 7 day-cells (`grid-cols-7 gap-2`). Each cell shows day abbreviation, date, and up to 2 upcoming appointments that day (stacked as mini-rows: time + title in 14px, driver avatar if assigned or a small amber dot if not). If more than 2 on a day, show "+N til viðbótar" at the bottom of the cell. Current day gets `bg-paper ring-1 ring-sage/30`; other days `bg-paper/60`. Clicking a cell navigates to `/timar?day=<YYYY-MM-DD>`. Clicking an appointment within a cell navigates to `/timar?id=<apptId>`.

**"Síðan síðast" feed:** new component `src/components/dashboard/SinceLastVisit.tsx`. Stitches four streams into a reverse-chronological feed: new log entries, new appointments, new documents, changed entitlement statuses. Uses a new Convex query `activity.sinceLastVisit({ cursorMs })` (server-side union, paginated). The client tracks "last visit" in `localStorage` per user (simplest) and passes that to the query. Each row uses a compact `text-body-dense` (16 px) layout: avatar (20 px) + author + event + entity title + timestamp. Max 10 shown; "+N eldri" link expands to show more.

**"Þarf athygli" column:** promotes `AttentionCard`'s full list (not just the top item like on mobile), plus an "Enginn skutlar" entry if any upcoming appointment within 7 days has no driver. Two actions per card: "Ég tek þetta" (claim ownership) and "Seinna" (dismiss from this session only). At `xl`, this column is a flush-right sticky region (scrolls only if it overflows). Max width 400 px.

**Bottom:** no more separate `RecentLog` section on desktop dashboard — its content is already in "Síðan síðast". Mobile keeps `RecentLog` unchanged.

### Umönnun

Two tabs (Dagbók + Lyf) — same as today. Use `<StackLayout>` wrapping the tab UI; tab contents decide their own layout.

**Dagbók (`<LogFeed>`):**

- `base` / `md`: unchanged. Single-column feed + mobile compose via the existing `LogEntryForm` bottom Sheet.
- `xl`: **two-pane layout** (use `<PaneLayout>`).
  - **Left list pane:** dense rows (not cards) using the new `--text-body-dense` token. Each row: avatar (24 px) + author + date + first line of entry truncated + appointment tag if linked. Row height ~72 px. Selected row gets `bg-paper text-ink`.
  - **Right detail pane:** a persistent composer at the top (default state = empty textarea placeholder "Hvað gerðist?"), and below it the selected entry's full content (when a row is selected) with an edit button for the author. The composer is always visible; `cmd+enter` submits. Draft auto-saves to `localStorage` (not Convex — unpublished drafts aren't interesting for other family members).
  - No selection: detail pane shows just the composer, full-height, with a subtle empty-state hint below: "Veldu færslu til að lesa eða skrifaðu nýja hér að ofan."

Composer is a new component `src/components/log/LogComposer.tsx`. Mobile still uses the Sheet-based `LogEntryForm` for "write new" (unchanged); the desktop composer is an inline alternative that calls the same `api.logEntries.add` mutation.

**Lyf (`<MedicationTable>`):**

- `base` / `md`: unchanged.
- `xl`: stays single column but widens via `StackLayout`'s `xl:max-w-[960px]`. No detail pane. Medications are a reference list; nothing to drill into.

### Tímar

Tímar is the surface that benefits most from a week view. Use `<PaneLayout>` for the week-grid-centric desktop experience, with `<StackLayout>` as fallback for list view.

**`base` / `md`:** current list (upcoming + past tabs). Unchanged.

**`xl`:** new default is **week grid** (`src/components/timar/WeekGrid.tsx`). A "Vika" / "Listi" toggle at the top right of the view lets users flip back to the list if they prefer.

**Week-grid anatomy:**

```
┌─────────────┬──────────────────────────────────────────────────┐
│  ← Vika 16  │  WEEK GRID (detail pane)                         │
│   13.–19.   │                                                  │
│     apr     │  ┌──────────┬──────────┬──────────┬──────────┐   │
│  → Vika 17  │  │   MÁN    │   ÞRI    │   MIÐ    │   FIM    │   │
│             │  │   13     │   14     │   15     │   16     │   │
│  LISTI:     │  │          │          │          │          │   │
│             │  │ 10:00    │ 09:15    │          │ 14:30    │   │
│  Þri 14/4   │  │ Krabba-  │ Virkni   │          │ GP       │   │
│  → Virkni   │  │ meins... │  [Anna]  │          │  [?]     │   │
│    [Anna]   │  │  [Helga] │          │          │  drag    │   │
│             │  │          │          │          │  avatar  │   │
│  Fim 16/4   │  │          │          │          │  here    │   │
│  → GP       │  │          │          │          │          │   │
│    [?]      │  └──────────┴──────────┴──────────┴──────────┘   │
│             │                                                  │
│  (primary   │  [+ Nýr tími]        [ Vika | Listi ]            │
│   list in   │                                                  │
│   list pane)│                                                  │
└─────────────┴──────────────────────────────────────────────────┘
```

The list pane on the left uses the same row density as Dagbók — dense row per upcoming appointment, grouped by day. The grid cells on the right are the hero. Appointments show as blocks stacked by time. Driver assignment is a **drag-and-drop affordance**: each family member's avatar is draggable from a small "Skutlarar" strip at the bottom of the grid, and can be dropped onto an appointment to assign. Dropping one avatar where another is present replaces the driver. Keyboard alternative: click the appointment → right-rail detail with the existing `DriverPicker`.

**Drag-to-reassign implementation:** use `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, a11y-friendly, keyboard-accessible by default). New dep. Mobile never sees this — drag is `xl`-only.

**`rail` prop (optional, `2xl:` only):** a 320-px "Ófylltir tímar" strip listing upcoming appointments still without a driver. This is an advanced affordance and can be omitted from v1 — wiring the rail slot into `<PaneLayout>` is cheap enough to do up-front, but the specific `UpcomingDriverAssignments` component can be skipped if it blows up scope.

**Recurring-series management:** stays at `/timar/reglulegir` — no redesign as part of this work. It's a leaf-page and its current list is fine.

### Pappírar

Two tabs (Réttindi + Skjöl) — structure preserved. Contents reshape.

**Réttindi — 4-column kanban on desktop:**

- `base` / `md`: current single list. Unchanged.
- `xl`: `EntitlementKanban` (new component in `src/components/info/EntitlementKanban.tsx`). Four columns mapped to the 4 statuses: **Beðið** (`not_applied`), **Í vinnslu** (`in_progress`), **Samþykkt** (`approved`), **Hafnað** (`denied`). Cards are draggable between columns — drop fires `api.entitlements.update({ status })`. Card surface: existing `EntitlementList` card shape (title, description, owner avatar, last updated), slightly denser. Each column has a header with count + "+ Bæta við" button that opens the existing `EntitlementForm` sheet with the status pre-populated.

**Skjöl — grid + detail:**

- `base` / `md`: current single list.
- `xl`: `<PaneLayout>` with `list` = compact document-row list (filename, added by, date, size) and `detail` = a preview pane showing an `<iframe>` of the document (PDFs) or an `<img>` (images), with download button and notes below. Other file types show their metadata only.

### Fólk

- `base` / `md`: EmergencyTiles + ContactList. Unchanged.
- `xl`: EmergencyTiles stay full-width at top (they are primary; that's the point). Below, `<PaneLayout>` with:
  - **List:** contacts grouped by category (emergency/medical/municipal/family/other), each group a dense list. 16 px body.
  - **Detail:** selected contact's full card with large tappable phone/email buttons, notes, and log-mentions (log entries that contain the contact's name in their body). Log-mentions is a nice-to-have; can be a v2 enhancement if time pressure — ship the detail pane without it if needed.

## URL-based selection

All list-detail panes (Dagbók, Tímar, Fólk, Pappírar-Skjöl) track the selected item via `?id=...` in the URL. Tímar additionally uses `?view=week` | `?view=list` to toggle between the week grid and the list; `view` and `id` coexist (e.g., `/timar?view=week&id=abc`). Implementation:

```tsx
const searchParams = useSearchParams();
const router = useRouter();
const activeId = searchParams.get("id") as Id<"..."> | null;

function handleSelect(id: Id<"...">) {
  router.replace(`?id=${id}`, { scroll: false });
}
```

- Deep-linkable: sharing "look at this appointment" in Messenger works.
- Refresh-safe: reloading preserves selection.
- Convex-reactive: the detail component reads `api.timar.get({ id: activeId })`, list reads `api.timar.upcoming()` — two separate subscriptions, deduped by Convex, correct behavior.
- Mobile fallback: on mobile the list component uses `Link` (not a replace call) pointing at a full-page route `/timar/[id]` — wait, that route doesn't exist. The existing mobile behavior opens a sheet for edit; for desktop's list-detail to work on mobile we either:
  - **(a)** keep mobile unchanged (list items open the existing edit Sheet; no detail route), OR
  - **(b)** introduce `/timar/[id]` / `/folk/[id]` / `/dagbok/[id]` / `/pappirar/skjol/[id]` detail routes for a richer mobile drill-down.

Go with **(a)** for v1 — keeps mobile exactly as shipped, no regression. The list component checks the breakpoint via CSS-only means (render both a `Link` and a tap-handler, with one hidden at each breakpoint) or, more cleanly, a small wrapper component that provides `onSelect` at `xl:` and defers to the existing Sheet/edit behavior below. Prefer the wrapper-component pattern so list components aren't themselves breakpoint-aware (see "Component boundaries" below).

## Aesthetic — what stays, what relaxes

**Stays identical:**

- Palette (paper/ink/sage/wheat/amber tokens in `src/app/globals.css`).
- Source Serif headings; Source Sans body.
- Radii (`rounded-2xl` on cards, `rounded-xl` on nav items).
- Soft dividers (`border-divider`), amber for attention surfaces.
- 48 px minimum tap targets.
- Sheet bottom-up on mobile, centered modal at `md:+` (inherited from PR #3).

**Relaxes on `xl:`:**

- **Column widths.** Max 1400 px on Dashboard; 1280+ on other multi-pane surfaces; 960 px on single-column at `xl` (Umönnun-Lyf).
- **Card vs row.** Rule: switch from card to row at **7+ items likely visible simultaneously OR single-line primary content**. Applies to: Tímar list pane, Dagbók list pane, Fólk contact rows, Skjöl list. Keeps cards: Lyf (multi-field, 3–6 items), Réttindi kanban cards (each is a dense self-contained unit worth visual weight).
- **Body size for dense rows.** New token `--text-body-dense: 16px` (instead of the default 18 px) declared in `@theme inline`. Used only on list-row `<li>` content in the multi-pane surfaces. Icelandic diacritics at 16 px Source Sans are fine. Line-height 1.4 for dense, 1.5 elsewhere.
- **Pane backgrounds.** Three-step hierarchy:
  - App chrome (`<aside>`, `<body>`): `bg-page`.
  - List panes: `bg-page` (flush with chrome — feels like a leaf of the desk surface).
  - Detail panes: `bg-paper` (the "open book" — lifted onto the desk).
  - Optional rail: `bg-paper-deep`.
  - **No borders between panes.** Background steps do the work. Add `shadow-[0_1px_0_rgba(46,52,43,0.04)]` on the detail pane's leading edge only if separation feels too soft in testing — not as a default.
- **Card vs row dividers.** `border-divider` between list rows. `border-divider-strong` remains for emphasis within content (section breaks inside the detail pane), NOT for pane separation.

## Component boundaries

Pattern: **pure list + sibling detail view, both rendered from the page; selection lifted to the URL.** Lists don't know about desktop; they accept an optional `activeId` prop for row highlighting and an `onSelect?` callback. Detail components are pure functions of `id → data`.

Per surface:

- **Tímar:** `<TimarList activeId onSelect>` + `<TimarDetail id>` + `<WeekGrid>` (the week grid is its own component, rendered in the detail slot when no `activeId` is selected and the view toggle is on "Vika"). The list and week grid share a `api.appointments.upcoming` subscription; both render from it. Detail pane reads `api.appointments.get({ id })`.
- **Fólk:** `<ContactList activeId onSelect>` + `<ContactDetail id>`. EmergencyTiles still own their tap → tel: behavior (never list-detail).
- **Pappírar-Skjöl:** `<DocumentList activeId onSelect>` + `<DocumentDetail id>`.
- **Pappírar-Réttindi:** `<EntitlementKanban>` standalone; no list-detail separation (each card IS its own detail). Edit via the existing sheet.
- **Umönnun-Dagbók:** `<LogFeed activeId onSelect>` + `<LogComposer>` (always rendered on desktop) + `<LogEntryReader id>` (shown below composer when `activeId` set).

Mobile behavior unchanged: list components already navigate/open sheets on click; desktop's `onSelect` wraps them via a small breakpoint-aware wrapper in each page.

## i18n

New string keys to add (in `messages/is.json` and mirrored in `en.json`):

- `dashboard.weekStrip.title` — "Vika {week} · {dateRange}"
- `dashboard.weekStrip.more` — "+{count} til viðbótar"
- `dashboard.sinceLastVisit.title` — "Síðan síðast"
- `dashboard.sinceLastVisit.empty` — "Ekkert nýtt frá síðustu heimsókn."
- `dashboard.sinceLastVisit.showOlder` — "Sýna eldri"
- `dashboard.attentionColumn.title` — "Þarf athygli" (moved from `dashboard.attention.eyebrow`, mobile keeps using the eyebrow).
- `dashboard.attentionColumn.noDriver` — "Enginn skutlar {day}"
- `timar.view.week` — "Vika"
- `timar.view.list` — "Listi"
- `timar.weekGrid.prev` — "← Fyrri vika"
- `timar.weekGrid.next` — "Næsta vika →"
- `timar.weekGrid.drivers` — "Skutlarar"
- `timar.weekGrid.dragHint` — "Dragðu nafn á tíma til að skipa skutlara."
- `timar.weekGrid.noAppointments` — "Engir tímar þessa viku."
- `dagbok.composer.placeholder` — "Hvað gerðist?"
- `dagbok.composer.submit` — "Senda" (also Esc to clear, Cmd+Enter to submit)
- `dagbok.composer.submitHint` — "⌘+Enter" (visible hint on desktop)
- `dagbok.composer.draftSaved` — "Drög vistuð"
- `dagbok.detail.edit` — existing `common.edit` reused.
- `dagbok.detail.noSelection` — "Veldu færslu til að lesa eða skrifaðu nýja hér að ofan."
- `pappirar.kanban.beðið` — "Beðið"
- `pappirar.kanban.inProgress` — "Í vinnslu"
- `pappirar.kanban.approved` — "Samþykkt"
- `pappirar.kanban.denied` — "Hafnað"
- `pappirar.kanban.addInStatus` — "+ Bæta við"
- `pappirar.skjol.preview.download` — "Niðurhal"
- `pappirar.skjol.preview.unsupported` — "Get ekki birt forskoðun."
- `folk.detail.logMentions` — "Dagbók nefnir"
- `folk.detail.noContact` — "Veldu manneskju til að skoða."
- `nav.attention.badge` — ARIA-only: "{count} atriði þurfa athygli"
- `nav.attention.miniCal.today` — ARIA-only: "Í dag"

Translations authored Icelandic-first per project rules; English is a proofread mirror.

## Convex functions — new queries + mutations

### New

- `users.attentionCounts` (query) — returns `{ dashboard: number, care: number, paperwork: number }`. One query feeds both Sidebar badges and mobile BottomNav badges.
- `activity.sinceLastVisit` (query) — paginated union of log entries, new appointments, new documents, entitlement status changes, since a `cursorMs` timestamp. Each row is discriminated by `kind: "log" | "appointment" | "document" | "entitlement_status"`.
- `appointments.byWeek({ weekStartMs })` (query) — returns appointments where `startTime ∈ [weekStartMs, weekStartMs + 7*24*60*60*1000)`, status `upcoming`, ordered by `startTime`. Used by both WeekGrid and the dashboard 7-day strip — both surfaces use this same query (single subscription, Convex dedupes) rather than filtering `appointments.upcoming` client-side.
- `logEntries.get({ id })` (query) — returns a single entry or `null`.
- `appointments.get({ id })` — if not already present, add it. Follows the same pattern.
- `contacts.get({ id })` — if not already present, add it.
- `documents.get({ id })` — if not already present, add it.
- `entitlements.get({ id })` — if not already present, add it.

Implementation note: when implementing, grep `convex/{appointments,contacts,documents,entitlements,logEntries}.ts` for an existing `export const get` and only add the ones that are missing.

### Changed

- `appointments.update` — needs to accept `driverId` as part of a partial update (already likely supported via `volunteerToDrive`, but drag-to-reassign needs an explicit update call).

All new queries and mutations call the existing `requireAuth(ctx)` helper; no new auth model.

## Drag-and-drop dependency — `@dnd-kit`

Install `@dnd-kit/core` and `@dnd-kit/sortable` (not `@dnd-kit/modifiers` unless needed). The combined footprint is ~20 kB gz — acceptable. Rationale over alternatives:

- **`react-dnd`**: heavier, older API, requires a backend (HTML5 / touch), more ceremony.
- **Native HTML5 drag**: fragile across browsers, poor touch support, no keyboard a11y by default.
- **shadcn `resizable`**: different purpose (pane dividers) — not for our case.

Use pattern: `DndContext` at the Tímar week-grid level (for driver avatars) and at the Réttindi kanban level (for entitlement cards). Keyboard sensor enabled by default — cards have tabindex and support keyboard move.

## Real-time

All views remain Convex `useQuery` subscriptions. Real-time invariants inherited: two browsers with the kanban open; dragging a card in one updates the other. Week grid with two browsers; drag-reassigning a driver in one updates the other. The existing two-tab real-time discipline applies unchanged.

## Testing

Same approach as PR #3 — manual browser smoke at three viewports (375×812, 1024×768, 1920×1080), plus a new `1440×900` viewport specifically for the Command Post layouts (which sit between `md` and the widest desktop). Phase 16 (Vitest + Playwright) is still not in scope; when it lands, the Command Post surfaces get coverage alongside the mobile flows.

Manual smoke additions (beyond PR #3's mobile/tablet/desktop checklist):

- **1440×900 Dashboard:** greeting full-width, 7-day strip with correct days (use a known seed date), driver avatars on assigned appointments, amber dots on unassigned. "Síðan síðast" shows recent activity; "Þarf athygli" lists unowned entitlements and no-driver upcoming appointments.
- **1440×900 Dagbók:** two-pane layout, composer always visible on the right, clicking a left-pane row shows that entry's content below the composer.
- **1440×900 Tímar (week view):** 7-column grid, current week by default, prev/next week nav works, drivers strip at the bottom shows family members, drag a driver onto an appointment → driver updates (verify by opening another browser context at same viewport — real-time).
- **1440×900 Tímar (list view):** toggle back; list identical to mobile experience.
- **1440×900 Pappírar-Réttindi:** 4 kanban columns, drag a card between statuses, verify persistence (refresh and the card stays in the new column).
- **1440×900 Pappírar-Skjöl:** click a doc on left, preview appears on right.
- **1440×900 Fólk:** EmergencyTiles at top, contact list below, click a contact → detail pane with tel/email buttons.
- **Sidebar mini-calendar:** current week visible with dots on appointment days, today highlighted, clicking a day jumps to Tímar week view.
- **Sidebar attention badges:** badge counts match Dashboard's "Þarf athygli" column for dashboard/paperwork items; Dagbók badge reflects unseen-since-last-visit entries.

## Files to add / change

### New (~12)

- `src/components/layout/StackLayout.tsx`
- `src/components/layout/PaneLayout.tsx`
- `src/components/nav/navItems.ts` — shared `PRIMARY_ITEMS` + `isActiveRoute`
- `src/components/nav/SidebarWeekCalendar.tsx`
- `src/components/nav/SidebarAttentionBadge.tsx`
- `src/components/dashboard/WeekStrip.tsx`
- `src/components/dashboard/SinceLastVisit.tsx`
- `src/components/timar/WeekGrid.tsx`
- `src/components/timar/TimarDetail.tsx`
- `src/components/log/LogComposer.tsx`
- `src/components/log/LogEntryReader.tsx` — detail pane for the selected entry. Its own component (not folded into LogComposer), so LogComposer stays focused on "new entry" and LogEntryReader on "show + edit existing".
- `src/components/info/EntitlementKanban.tsx`
- `src/components/info/ContactDetail.tsx`
- `src/components/info/DocumentDetail.tsx`
- `convex/activity.ts` — sinceLastVisit query
- Optional: `convex/users.ts` gains `attentionCounts` if not split out.

### Changed (~14)

- `src/app/[locale]/(app)/layout.tsx` — replace `lg:pl-[248px]` / `lg:pl-24` / `lg:pb-12` with `md:` equivalents; inner wrapper is dropped in favor of per-page `<StackLayout>`/`<PaneLayout>`.
- `src/components/nav/Sidebar.tsx` — `hidden lg:flex` → `hidden md:flex`; import `PRIMARY_ITEMS`; render `SidebarAttentionBadge` per item; render `SidebarWeekCalendar` below the nav list; still show user block at bottom.
- `src/components/nav/BottomNav.tsx` — `lg:hidden` → `md:hidden`; import `PRIMARY_ITEMS`; render `SidebarAttentionBadge` inline per item (a tiny dot, not a numeric badge, on mobile).
- `src/components/shared/Header.tsx` — `lg:hidden` → `md:hidden`.
- `src/app/[locale]/(app)/page.tsx` (dashboard) — restructured: uses `<StackLayout>` with xl override; renders greeting + (at `xl`:) WeekStrip + (2-col grid:) SinceLastVisit + AttentionColumn; mobile/tablet falls back to the current stack.
- `src/app/[locale]/(app)/umonnun/page.tsx` + `UmonnunView.tsx` — wraps in `<StackLayout>`; Dagbók tab uses `<PaneLayout>` at `xl:`.
- `src/app/[locale]/(app)/timar/page.tsx` + `TimarView.tsx` — at `xl:` uses `<PaneLayout>` with list + WeekGrid detail; view toggle state in URL (`?view=week` | `?view=list`, default week on `xl:`, list on `base/md`).
- `src/app/[locale]/(app)/folk/page.tsx` — at `xl:` uses `<PaneLayout>`; EmergencyTiles stay full-width above the layout.
- `src/app/[locale]/(app)/pappirar/page.tsx` + `PappirarTabs.tsx` — Réttindi tab renders `<EntitlementKanban>` at `xl:`, current list below; Skjöl tab uses `<PaneLayout>` at `xl:`.
- `src/components/appointments/AppointmentList.tsx` — gains `activeId?` + `onSelect?` props; rows highlight when active; click in desktop calls `onSelect`, in mobile preserves current behavior.
- `src/components/info/ContactList.tsx` — same pattern.
- `src/components/info/DocumentList.tsx` — same pattern.
- `src/components/log/LogFeed.tsx` — same pattern; also compacts to rows at `xl:` when used inside the list pane.
- `src/app/globals.css` — add `--text-body-dense: 16px` to `@theme inline`.
- `messages/{is,en}.json` — new strings listed above.
- `package.json` — add `@dnd-kit/core` and `@dnd-kit/sortable`.

### Files PR #3 added that get revised

- `src/components/nav/Sidebar.tsx` — already exists; extended here.
- `src/app/[locale]/(app)/layout.tsx` — already modified in PR #3; further modified here.
- `src/components/nav/BottomNav.tsx`, `src/components/shared/Header.tsx` — breakpoint changes from `lg:` to `md:`.
- The `lg:max-w-[704px]` / `xl:max-w-[816px]` wrappers in the 6 page files get removed — replaced by `<StackLayout>` / `<PaneLayout>`.

### Files deliberately not touched

- `convex/schema.ts` — no schema changes.
- `src/app/[locale]/login/page.tsx` — unchanged; already centers correctly (verified in PR #3 Task 6).
- `src/components/recurringSeries/*` — unchanged.
- `src/components/ui/sheet.tsx` — inherits PR #3's responsive behavior; no further changes.

## Explicitly NOT building

- Drag-and-drop on mobile — kanban and week grid always fall back to click/tap actions below `xl`.
- A separate dark mode / theme switcher.
- Log mentions in Fólk contact detail — nice-to-have; defer to a future phase if implementation pressure.
- Per-user notification preferences — the attention badges are counts, not configurable alerts.
- A fully custom calendar library — WeekGrid is hand-rolled, scoped to this one surface.
- Calendar month view — week view is enough for coordination; month view adds no new information for this audience.
- Inline appointment creation in the week grid (click-and-drag on a day-cell) — add-via-sheet flow stays. Creating takes care; don't streamline it.
- Collapse/expand sidebar toggle — stays 248 px open always.

## Migration / deployment

Pure additive UI work on top of PR #3's foundation. Schema unchanged; Convex backend additions are new queries only (no writes to existing tables). New dependency `@dnd-kit/*` is the only package.json delta. Stacked on PR #3 so Vercel preview will diff against it correctly; once both merge and main is pushed to origin, desktop Command Post deploys in one release.

No feature flag. Mobile is unaffected; desktop users benefit without action.

## Risks

1. **Scope.** This is the biggest single UI phase in the project so far. Estimated ~20 implementation tasks. Mitigation: subagent-driven-development with per-task review, one task = one commit = small blast radius.
2. **Dnd-kit learning curve.** First use in this codebase. Mitigation: isolate drag logic in `<WeekGridDriverDrag>` and `<EntitlementKanbanDnd>` wrapper components; don't spread dnd concerns across unrelated code.
3. **Performance of real-time week grid.** Five simultaneous Convex subscriptions (list, grid, detail, attention counts, mini-cal) across one page is fine technically, but some query consolidation may be worth doing. Mitigation: don't optimize preemptively — ship correct code, measure only if a user complaint surfaces.
4. **Drift between mobile and desktop code paths.** Mitigation: shared list components with `activeId?`/`onSelect?` props; no parallel `*Desktop.tsx` files. Breakpoint-aware wrapping happens only at the page level.
5. **Mini week calendar in sidebar vs week grid in Tímar — potential redundancy.** Mitigation: mini-cal is a navigator (6 cells with dots + today highlight), not a second grid. Different purpose, different size.
