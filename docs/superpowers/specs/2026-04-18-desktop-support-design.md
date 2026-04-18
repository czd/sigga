# Desktop Support — Design

**Status:** Draft (brainstormed 2026-04-18, not yet planned)
**Target phase:** Cross-cutting — touches every authenticated route. Slots in alongside Phase 15 (Polish) but stands on its own.

## Problem

Sigga's app today is mobile-only by construction: bottom nav, single-column content, no responsive breakpoints to speak of (~19 across the components folder, almost all narrow tweaks). On a desktop or laptop browser, the bottom nav floats incongruously at the bottom of a vast empty viewport, content clings to the left edge in a 375-ish-px wide ribbon, and the whole thing reads as a phone screen accidentally rendered in a window.

Two real desktop usage patterns exist:

1. **Daughters at work** — opening the app on a work laptop between meetings to check "is Mom OK today, anything new?" and occasionally log/edit.
2. **Family on shared computers** — the 60+ daughters and Helga sometimes use a desktop or library computer; they expect the same app, not a different one.

Per user direction (2026-04-18): keep the Bókasafn aesthetic intact, keep the bottom nav on mobile unchanged, and use the right pattern for *this* app on desktop — same overall look and feel. UX research (`UX Researcher` agent, 2026-04-18) returned an opinionated recommendation: persistent left sidebar replacing the bottom nav at ≥1024px, fixed ~600px content column left-aligned against the sidebar edge, identical density, no multi-pane, no dashboard cards, no shrinking. The extra horizontal space is intentional margin — the calm *is* the design.

## Design summary

A single responsive `lg:` breakpoint at 1024px swaps the app shell between two layouts:

- **<1024px (mobile):** unchanged. Sticky `Header`, fixed `BottomNav`, single-column content with `pb-32` for nav clearance.
- **≥1024px (desktop):** `BottomNav` and the mobile `Header` hide. A new `Sidebar` (248px wide, fixed left, full viewport height) takes their place — it carries the wordmark, the same four nav items (`BookIcon` + label), and the user avatar with sign-out at the bottom. The main content area shifts right by the sidebar width and renders in a fixed-width left-aligned column (608px default, 720px for Pappírar). The right side of the viewport stays empty cream. No top header on desktop.

Content **inside** each view stays exactly as-is — no per-view redesign, no card grid, no extra rows or columns. Sheets and dialogs become center-modal on desktop (`Dialog`-like) instead of bottom-sheet, since a bottom sheet on a 1920px screen is visually broken.

This delivers desktop support as a **shell change only**: page bodies are reused verbatim. The diff is concentrated in the `(app)/layout.tsx`, the new `Sidebar` component, the existing `BottomNav` and `Header` components, and the `Sheet` primitive's responsive behaviour.

## Layout architecture

### Breakpoint

One breakpoint, `lg` (Tailwind default 1024px). Below `lg`, the existing mobile shell renders. At and above `lg`, the desktop shell renders. There is no separate tablet treatment — a portrait iPad (810px) gets mobile, a landscape iPad (1080px) gets desktop. This matches the audience: nobody in this family has an iPad-as-primary-device for Sigga.

Rationale for a single breakpoint: simpler mental model, fewer edge cases for QA, and the visual delta is binary (sidebar vs. bottom nav). Sub-breakpoints (e.g., shrinking the column further at very wide viewports) add complexity without payoff because the column is already capped.

### Mobile shell — unchanged

```
┌─────────────────────────────────────┐
│ sigga                          (●)  │  Header (sticky top)
├─────────────────────────────────────┤
│                                     │
│  <view content>                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  [⌂]    [♥]    [☎]    [📂]          │  BottomNav (fixed bottom)
└─────────────────────────────────────┘
```

### Desktop shell — new

```
┌────────┬──────────────────────────────────────────────────────────────┐
│ sigga  │                                                              │
│        │   <view content — 608px column, left-aligned>                │
│ ⌂ Í dag│                                                              │
│ ♥ Umön.│                                                              │
│ ☎ Fólk │                                                              │
│ 📂 Pap.│                                                              │
│        │                                                              │
│        │                                                              │
│   ──   │                                                              │
│  (●) N │                                                              │
└────────┴──────────────────────────────────────────────────────────────┘
 248px      96px gutter   608px column                  empty cream
```

Sidebar is a single fixed-width (248px) full-height column anchored left. Content area gets `lg:pl-[248px]` (or, equivalently, the layout uses CSS grid with `grid-cols-[248px_1fr]` at `lg:`). Inside the content area, `<main>` uses `lg:pl-24` (96px gutter from the sidebar edge) and content children use `lg:max-w-[608px]` (or `lg:max-w-[720px]` for Pappírar — see per-view notes).

`pb-32` (mobile's bottom-nav clearance) becomes `lg:pb-12` since there's no bottom nav to clear.

### Why left-aligned and not centered

UX research was explicit: a centered 608px column on a 1920px viewport reads as a marketing landing page. Left-aligning the column against the sidebar edge keeps the "journal flipped open" feel of the mobile experience scaled up. The empty right side of the viewport is intentional margin — exactly how a printed book treats wide gutters.

### Sticky and scroll behaviour

- **Sidebar:** `position: fixed; inset-y-0; left-0; w-[248px]` — full viewport height, never scrolls. Internally, the sidebar is `flex-col` with the wordmark at top, nav items in the middle (its own scroll if it ever overflows, which it won't), and the user block pinned to the bottom.
- **Content area:** scrolls normally inside the rest of the viewport.
- **Mobile header:** unchanged (still `sticky top-0`).
- **Mobile bottom nav:** unchanged (still `fixed bottom-0`).

## Components — what changes

### New: `src/components/nav/Sidebar.tsx`

Client component (uses `usePathname`). Renders only at `lg:` and up — i.e., wrapper has `hidden lg:flex`. Uses the existing `Link` from `@/i18n/navigation` so locale prefixes work, and the same `BookIcon` from `@/components/shared/BookIcon` so the iconography is identical to the bottom nav.

**Visual rules** (matching Bókasafn):

- Container: `fixed inset-y-0 left-0 z-30 w-[248px] bg-page border-r border-divider flex flex-col`. The `border-r` is the only "structural" border in the layout — it reads as a quiet hairline, not a chrome edge. Use `border-divider` (the soft 8% ink), not `border-divider-strong`.
- Wordmark area: top of sidebar, `px-6 pt-7 pb-6`. Same wordmark treatment as the mobile `Header`: `font-serif italic text-base font-normal text-ink-faint tracking-wide` — but at desktop, lowercased and just sitting there. Not a link (clicking the wordmark to "go home" is a power-user convention; this audience uses the explicit "Í dag" item).
- Nav list: vertical, `flex-col gap-1 px-3`. Each item is a `Link`, `flex items-center gap-3 px-3 min-h-12 rounded-2xl text-base`, hover `bg-paper`, active `bg-paper text-sage-shadow font-semibold` (mirrors the mobile bottom nav's active treatment using the same `text-sage-shadow` token). Icon: 22px, same `BookIcon` `kind` per item. Label: same `t(labelKey)` string from the `nav` namespace.
- User block at bottom: `mt-auto px-3 pb-6`. A single `DropdownMenu` (same primitive as today's `Header.tsx`) trigger styled as a flush row: `<UserAvatar /> + name + chevron`. Dropdown contents identical to current header dropdown (label = name + email, separator, sign-out).
- No "Tímar" item in the sidebar — Tímar is reached from the dashboard, same as on mobile. This preserves the four-item structural symmetry across devices and keeps the sidebar unsurprising.

### Changed: `src/components/nav/BottomNav.tsx`

Two-line change. The wrapper `<nav>` gains `lg:hidden` so it disappears on desktop. Everything else stays as-is.

### Changed: `src/components/shared/Header.tsx`

The mobile header (wordmark + avatar dropdown) hides on desktop because both pieces have moved into the sidebar. Add `lg:hidden` to the outer `<header>`.

### Changed: `src/app/[locale]/(app)/layout.tsx`

Wrap children in the new shell:

```tsx
<>
  <Sidebar />                                      {/* new — hidden on mobile */}
  <Header />                                       {/* hidden on desktop */}
  <main className="flex-1 pb-32 lg:pb-12 lg:pl-[248px]">
    <div className="lg:pl-24">                     {/* 96px gutter from sidebar edge */}
      {children}
    </div>
  </main>
  <BottomNav />                                    {/* hidden on desktop */}
</>
```

The layout applies the sidebar offset (`lg:pl-[248px]`) and the gutter (`lg:pl-24`) but **not** a max-width — that lives in each `page.tsx` so per-route widths can vary (Pappírar widens at `xl:`; everything else stays at 608px). See "Per-view notes" below.

### Changed: `src/components/ui/sheet.tsx` — responsive sheet

This is the one shadcn primitive that needs an actual UX swap on desktop. On mobile a `<Sheet side="bottom">` slides up from the bottom and feels native. On desktop, a sheet pinned to the bottom of a 1920px viewport looks like a half-broken modal — the content is far from the click that triggered it, and there's an enormous empty cream void above.

**Approach:** alter `sheet.tsx` so a `side="bottom"` sheet renders as a centered dialog at `lg:` and up. Concretely:

- The `SheetContent` element's variant for `side="bottom"` gets responsive classes: at `lg:` it switches from `inset-x-0 bottom-0 border-t rounded-t-2xl` to `lg:left-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-lg lg:w-[min(560px,calc(100vw-4rem))] lg:rounded-2xl lg:border` — i.e., it becomes a centered modal with the same Bókasafn look (paper background, rounded, ring/border).
- The animation similarly swaps from `slide-in-from-bottom` to `zoom-in-95` at `lg:`.
- Body padding stays the same. The grab-handle (the small horizontal bar some bottom sheets show) is mobile-only — give it `lg:hidden` if present.
- All call sites continue to use `<Sheet side="bottom">`. No call-site changes.

Other `Sheet` sides (`top`, `left`, `right`) are not used in the app today; if they appear later, they can keep their slide-from-edge behaviour without modification.

### Changed: `src/app/[locale]/login/page.tsx`

The login page is its own route outside `(app)/`. It needs a desktop treatment because the daughters might first sign in on a desktop. Minimal change: wrap the existing card in `min-h-dvh flex items-center justify-center px-6` (most projects already have this; verify). On desktop the card centers naturally; no sidebar to compete with. No new components needed.

## Per-view notes — where the column rules differ

The 608px default applies to all four authenticated tabs *except* Pappírar.

- **Dashboard (`page.tsx` — Í dag):** 608px. The greeting, AttentionCard, DrivingCta, NextAppointments, and inline-expand RecentLog all read comfortably at 608px. Verify on a 1920px monitor that the AttentionCard amber background doesn't dominate visually — at 608px it stays a card, not a banner.
- **Umönnun:** 608px. Tabs (Dagbók + Lyf) sit at the top of the column; tab content (log entries / medication list) flows below. Log entries are prose-heavy and benefit from the 45–75 char measure 608px enforces.
- **Fólk:** 608px. EmergencyTiles + ContactList both read fine. Skip the multi-pane temptation; tap-to-expand stays.
- **Pappírar:** 608px at `lg:` (1024–1279px), widening to **720px at `xl:` (≥1280px)**. Document and entitlement lists benefit from the extra width to fit filename + meta on one line, but at exactly 1024px the math doesn't work (sidebar 248 + gutter 96 + column 720 = 1064 > 1024). Gating the widening to `xl:` cleanly resolves the overflow. Override on the Pappírar `page.tsx` wrapper: `lg:max-w-[704px] xl:max-w-[816px]` (i.e., 608+96 then 720+96).
- **Tímar (and `/timar/reglulegir`):** 608px. Same as the rest. The "Reglulegir tímar" entry-point row reads beautifully at 608px.

**Where the width is set — locked decision:** `(app)/layout.tsx` does **not** apply a `max-w-*` itself. Each `page.tsx` wraps its body in a `<div className="lg:max-w-[704px]">` (or the Pappírar variant) so the responsive concern stays in the leaf — and stays in server-component land, since all `page.tsx` files are server components. View client components (`UmonnunView`, `TimarView`, `PappirarTabs`) do not need responsive classes for this. See "Files to add / change" below.

## Sticky-positioned content inside views

A few mobile views currently have things like `sticky top-12`-style headers inside content (search bars, tab strips). These should keep working unchanged — `sticky` inside the scrollable `<main>` works identically on desktop. Verify during QA: PappirarTabs, UmonnunView, TimarView. If anything looks wrong, the fix is local (adjust the offset), not architectural.

## Aesthetic preservation rules — non-negotiables

These exist because the temptation to "use the extra desktop space" is strong and wrong for this app:

1. **Do not introduce a card grid on the dashboard.** Today stays a single reverse-chronological column. No "weekly overview", no "stats card", no "today vs yesterday" grid.
2. **Do not add a right-side panel, drawer, or inspector.**
3. **Do not change typography size at desktop.** 18px body stays 18px body. Headings stay the same. The `font-serif` h1s stay the same.
4. **Do not shrink tap targets.** 48px minimum stays.
5. **Do not add a search bar in the sidebar, a notifications bell, a settings cog, or anything else not present on mobile.** The sidebar mirrors the bottom nav exactly — same items, same icons, same labels.
6. **Do not change card hover states to be aggressive.** A subtle `hover:bg-paper` on nav items is fine. Body content cards keep their current treatment (hover lifts are fine where they exist on mobile via tap-active states; do not add new ones).
7. **Do not introduce keyboard shortcuts in v1.** UX research suggested `/` for search; deferred. The audience does not expect them and they raise the QA surface.

These rules apply equally to subagents executing pieces of this — if a sub-step "feels like it could use a sidebar widget", it can't.

## Real-time and reactivity

No changes. All views already use Convex `useQuery` subscriptions. The desktop layout is purely structural; reactivity is preserved end-to-end. The two-tab real-time invariant test from `docs/spec.md` continues to pass on desktop because nothing in the data path changed.

## i18n

No new strings. The sidebar reuses the same `nav.dashboard / nav.care / nav.people / nav.paperwork` keys the bottom nav already uses. The user dropdown reuses the same `auth.signOut` key. English locale at `/en/...` works automatically.

## Testing

Follow `superpowers:test-driven-development` discipline where it applies. Most of the work here is layout/CSS, where TDD has limited leverage; the boundary tests live at the component level (does Sidebar render the right items, does it hide below `lg:`) and the e2e level (does the desktop shell behave end-to-end at 1440×900).

**Component tests (`vitest`):**

Skip — this project does not yet have a Vitest harness in place (Phase 16). Do not introduce one as part of this work; that's a separate phase.

**Playwright e2e — add a desktop viewport project:**

The current Playwright config tests at 375×812 (mobile). Add a second project at 1440×900 (desktop) and parametrise the test suite so the existing flows run at both viewports. Most existing tests pass on desktop unchanged; a few will need viewport-conditional selectors (e.g., bottom-nav vs. sidebar).

New desktop-specific e2e cases:

- At 1440×900, the bottom nav is not visible and the sidebar is.
- Clicking a sidebar nav item navigates to the right route and that item shows the active state.
- The user-avatar dropdown in the sidebar opens and shows the same name/email/sign-out as the mobile header.
- Opening any "+ add" sheet on desktop renders as a centered modal (visible at `lg:`), not a bottom sheet, and clicking the backdrop dismisses it.
- The dashboard at 1440×900: greeting + cards stay in a single 608px column left-aligned with empty cream to the right. (Snapshot or width-check.)
- Pappírar at 1440×900: column is wider (720px) than other views.
- Real-time invariant at desktop: open two desktop browser contexts, mutate in one, see the change in the other.

**Manual smoke at three viewports:** 375×812 (iPhone SE-ish), 1024×768 (smallest desktop — the `lg:` boundary), 1920×1080 (large desktop). All four tabs + Tímar + Reglulegir tímar + login. Verify nothing is cut off, nothing is comically wide, sheets behave, focus states work.

## Files to add / change

**New:**

- `src/components/nav/Sidebar.tsx` — desktop sidebar component.

**Changed:**

- `src/app/[locale]/(app)/layout.tsx` — add Sidebar; add `lg:` shifts to `<main>`.
- `src/components/nav/BottomNav.tsx` — add `lg:hidden` to wrapper.
- `src/components/shared/Header.tsx` — add `lg:hidden` to outer `<header>`.
- `src/components/ui/sheet.tsx` — responsive `side="bottom"` variant (centered modal at `lg:`).
- `src/app/[locale]/login/page.tsx` — verify center layout works on desktop; tweak only if it breaks.
- Each of `src/app/[locale]/(app)/page.tsx`, `umonnun/page.tsx`, `folk/page.tsx`, `pappirar/page.tsx`, `timar/page.tsx`, `timar/reglulegir/page.tsx` — wrap returned content in `<div className="lg:max-w-[704px]">{...}</div>` (and Pappírar uses `lg:max-w-[704px] xl:max-w-[816px]` instead). Width lives in the page wrapper, not the layout, not the View client component. Same wrapper everywhere except Pappírar.
- `playwright.config.ts` — add a desktop project (1440×900).
- `tests/e2e/*.spec.ts` — extend selected tests to run at desktop or add desktop-only checks (depending on what's currently in `tests/`).

**No changes to:**

- `convex/**` — backend untouched.
- `messages/**` — no new strings.
- `src/app/globals.css` — palette and tokens unchanged.
- Any non-shell component (cards, forms, lists, sheets' contents) — visuals untouched.

## Explicitly NOT building (v1 desktop)

- A separate desktop "dashboard" view with cards.
- Multi-pane / list-detail views anywhere.
- Right-side inspector / drawer / preview pane.
- Density toggle ("compact mode").
- Keyboard shortcuts (defer to a future phase if usage data justifies).
- Sidebar collapse/expand toggle (always at 248px).
- A separate `/desktop` route or any device sniffing — pure CSS responsiveness.
- New iconography. Sidebar reuses existing `BookIcon` kit.
- A theme switcher (dark mode is not in scope; the Bókasafn palette is the design).

## Risks and gotchas

- **Sheet primitive change** is the most visually impactful single edit because it touches *every* "+" / "edit" surface across the app. QA must walk through each one (AppointmentForm, SeriesForm, EntitlementForm, ContactForm, log-entry add, document upload) at desktop to confirm the centered-modal swap reads correctly and the close affordances work.
- **Stickiness inside views** (`sticky top-N`) was tuned for the mobile sticky `Header`. On desktop the sticky offset can be 0 since there's no header; verify each `sticky` instance.
- **Login page** isn't inside `(app)/`, so the sidebar/header logic doesn't affect it. Just confirm the existing card centers cleanly on desktop.
- **Server vs client components.** The Sidebar uses `usePathname` and so must be `"use client"` (mirrors `BottomNav`). The `(app)/layout.tsx` is a server component and stays so — it just renders both `<Sidebar />` and `<BottomNav />` with the responsive hide rules.
- **Hydration.** Both shells render in the same DOM (responsive CSS, no `useEffect`-based detection). No hydration mismatch risk.
- **Playwright desktop suite cost.** Doubling the suite roughly doubles CI time. Acceptable for the value; if it becomes a problem later, run desktop only on `main`.

## Migration / deployment

Pure additive UI work. No schema changes, no Convex changes, no env vars, no migration. A merge to `main` just renders the desktop shell at `lg:` immediately upon deploy. No feature flag needed; the audience benefits without action.
