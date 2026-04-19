# Sigga UX Patterns — Canonical Rulebook

> Phase B deliverable of the site-wide UX alignment initiative (`docs/superpowers/plans/2026-04-19-ux-alignment.md`). Phase C derives the remediation backlog from this file; Phase D executes it.

## Who this is for

This rulebook is the companion to `CLAUDE.md` for everyone shipping UI into Sigga. CLAUDE.md owns the stack, palette, 48 px tap floor, 18 px body floor, and "all user-facing strings in Icelandic" rule. This file owns *how those conventions compose into repeated interactions*.

The primary end-user is a **60-something Icelandic woman migrating from Facebook Messenger to her first purpose-built app.** She does not reward cleverness; she rewards consistency. When two surfaces do the same thing in two different ways she relearns the second one every time. Every rule below privileges *predictable > rich*.

Inputs this file reacts to: `docs/superpowers/audits/2026-04-19-ux-inventory.md` (19 patterns, file:line pointers) and `docs/superpowers/audits/2026-04-19-a11y-audit.md` (47 WCAG findings). Per-view specs live in `docs/spec.md`.

**When to update:** any time a Phase D slice reveals an edge case, append a short note to the affected pattern. Any time audience testing invalidates a rule, rewrite it and log the change in the commit. Never leave two canonical answers in force — pick one, document the other as an explicit exemption with rationale. Canonical answers are one or two sentences, no hedging.

---

## Rule index

| # | Short name | What it is | Anchor |
| --- | --- | --- | --- |
| 1 | Edit affordance | How a user starts editing any row / card | [#pattern-1](#pattern-1--edit-affordance) |
| 2 | Destroy affordance | How a user deletes / cancels a record | [#pattern-2](#pattern-2--destroy-affordance) |
| 3 | Create affordance | How a user adds a new row / record | [#pattern-3](#pattern-3--create-affordance) |
| 4 | Form container | When a Sheet, when a Dialog; CTA placement | [#pattern-4](#pattern-4--form-container-sheet-vs-dialog) |
| 5 | Empty state | Copy, composition, visual treatment of empties | [#pattern-5](#pattern-5--empty-state) |
| 6 | Headline style | Page / section / card heading scale | [#pattern-6](#pattern-6--headline-style) |
| 7 | Tap targets | Enforcing the 48 px floor everywhere | [#pattern-7](#pattern-7--tap-targets) |
| 8 | List-detail responsive | Mobile full-page vs desktop pane | [#pattern-8](#pattern-8--list-detail-responsive-behaviour) |
| 9 | Date format | Relative vs absolute time | [#pattern-9](#pattern-9--dateftime-formatting) |
| 10 | Actor attribution | Where "who did X" is surfaced | [#pattern-10](#pattern-10--actor-attribution) |
| 11 | Toast feedback | Whether toasts exist in v1 | [#pattern-11](#pattern-11--toast-feedback) |
| 12 | Loading state | What a loading surface looks like | [#pattern-12](#pattern-12--loading-state) |
| 13 | Error state | How form errors and mutation errors surface | [#pattern-13](#pattern-13--error-state) |
| 14 | Optimistic UI | Whether we optimistically update | [#pattern-14](#pattern-14--optimistic-ui) |
| 15 | Phone / tel: affordance | Every phone number is dialable | [#pattern-15](#pattern-15--phone--tel-affordance) |
| 16 | Colour semantics | What sage / amber / wheat / destructive mean | [#pattern-16](#pattern-16--colour-semantics) |
| 17 | i18n coverage | No hardcoded strings, including in primitives | [#pattern-17](#pattern-17--i18n-coverage) |
| 18 | Accessibility | Cross-link to the a11y audit + core rules | [#pattern-18](#pattern-18--accessibility) |
| 19 | Commitment confirmation | Dialog-gating any "I take this on" action | [#pattern-19](#pattern-19--commitment-confirmation) |
| 20 | Gaps needing Nic | Items the rulebook can't decide alone | [#pattern-20](#pattern-20--gaps-the-rulebook-cant-decide-without-nics-input) |

---

## Pattern 1 — Edit affordance

**What it is:** How a user begins editing any single record (log entry, appointment, contact, entitlement, medication, document metadata, recurring series).

**Canonical answer:** **Tap the card / row to open its detail view; edit lives inside the detail.** On mobile the detail is a full-page sheet; on `xl:` it is the right-hand pane. A single "Breyta" button (text + `Pencil` icon, `variant="outline" size="touch"`) inside the detail opens the edit sheet.

**When it applies:** Every list of editable records in the app — Dagbók, Tímar mobile/desktop, Tímar/Reglulegir, Fólk, Réttindi (list + kanban), Lyf, Skjöl (including metadata, which this pattern requires us to expose).

**Counter-examples (when NOT to use):** No exemptions. Pencil-in-corner, kebab menus, hover-reveals, expand-in-place, and "absolute inset-0 invisible edit button" are all retired. The Dashboard RecentLog preview is read-only and exposes no edit (tap the entry in Dagbók); that's consistent with the rule — you're not editing *from* the dashboard, you're navigating *to* Dagbók and editing there.

**Code recipe:**

```tsx
// List row / card — tap opens detail (mobile: Sheet; desktop: selects pane)
<button
  type="button"
  onClick={() => onSelect(entity._id)}
  className="flex w-full items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-left ring-1 ring-foreground/10 focus-visible:ring-2 focus-visible:ring-ring"
  aria-label={t("openNamed", { title: entity.title })}
>
  {/* visual card body — h3 title, meta, status dot */}
</button>

// Detail body — the ONE edit CTA lives here
<Button variant="outline" size="touch" onClick={() => setEditOpen(true)}>
  <Pencil aria-hidden />
  {tCommon("edit")}
</Button>
```

**Icelandic copy:** Button label `common.edit` → **"Breyta"**. Screen-reader-differentiating per-row label uses the existing `contacts.edit` pattern: key `<feature>.editNamed` → **"Breyta {title}"**. List-row open uses `<feature>.openNamed` → **"Opna {title}"**.

**English mirror:** `common.edit` → **"Edit"**. `<feature>.editNamed` → **"Edit {title}"**. `<feature>.openNamed` → **"Open {title}"**.

**A11y requirements:** Row `<button>` must have a visible focus ring (`focus-visible:ring-2 focus-visible:ring-ring`) — not `focus-visible:bg-paper-deep/60` which is near-invisible (a11y audit 2.4.7). Row `aria-label` must include the item title so screen-reader users don't hear "Opna, Opna, Opna…" (a11y audit 1.1.1 finding on LogFeed/AppointmentCard). Do **not** use `display: contents` on the focusable element (a11y audit 1.3.1 finding on ContactList).

**Rationale (brief):** Inventory Pattern 1 shows six distinct edit patterns shipped today. Messenger-audience muscle memory is "tap the message → options appear". Card-tap-to-open + explicit Breyta inside detail scales cleanly to mobile (full-page) and desktop (`PaneLayout`, Pattern 8), and it eliminates the `display: contents` focus-ring trap currently in ContactList.

---

## Pattern 2 — Destroy affordance

**What it is:** How a user deletes a record outright or cancels a series-bound occurrence.

**Canonical answer:** Every destroy is a `<Button variant="destructive" size="touch">` with `Trash2` icon, placed `self-start` below the Save / Cancel row inside the edit sheet, and funnelled through a **`ConfirmDialog`** (see Pattern 4) before the mutation fires. No exceptions — destroy never runs on first tap.

**When it applies:** Deleting an appointment, a recurring series, a contact, an entitlement, a document, any other record. Cancelling a series-bound occurrence (sets `status: "cancelled"`) uses the same UI shape with the verb swapped to "Hlaupa yfir" (see Icelandic copy below).

**Counter-examples (when NOT to use):** The Dagbók log entry has no destroy on purpose — logs are append-only per spec. Medications have no destroy — use the "Virkt" switch to retire them. These are spec-level carve-outs, not UI exemptions.

**Code recipe:**

```tsx
// Inside the edit sheet, below the Cancel / Save footer row.
<Button
  type="button"
  variant="destructive"
  size="touch"
  className="self-start"
  onClick={() => setConfirmOpen(true)}
>
  <Trash2 aria-hidden />
  {tCommon("delete")}
</Button>

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title={t("deleteConfirm.title", { title: entity.title })}
  body={t("deleteConfirm.body")}
  confirmLabel={tCommon("delete")}
  confirmVariant="destructive"
  onConfirm={async () => { await remove({ id: entity._id }); close(); }}
/>
```

**Icelandic copy:** Title key `<feature>.deleteConfirm.title` → **'Eyða „{title}"?'** (Icelandic curly quotes). Body key `<feature>.deleteConfirm.body` → **"Þetta er ekki hægt að afturkalla."** — short, calm, declarative. For destroy-with-context (documents, entitlements) the body extends: **"Skjalið eyðist varanlega. Þetta er ekki hægt að afturkalla."** Confirm button uses `common.delete` → **"Eyða"**; cancel uses `common.cancel` → **"Hætta við"**. For series-bound occurrences, the verb swaps: title **'Hlaupa yfir „{title}" {date}?'** / body **"Tíminn birtist sem sleppt og næsti tími verður til sjálfkrafa."** / confirm **"Hlaupa yfir"** (keys `appointments.skipConfirm.*`).

**English mirror:** Title **'Delete "{title}"?'** / body **"This cannot be undone."** Extended body **"The document will be permanently deleted. This cannot be undone."** Skip flow: **'Skip "{title}" on {date}?'** / **"This occurrence will be marked skipped and the next occurrence will be created automatically."**

**A11y requirements:** Destroy button must carry `aria-label` that includes the item title when the visible label is only "Eyða" (analogous to the LogFeed edit-button a11y finding). The dialog uses the `ConfirmDialog` wrapper (Pattern 4) which threads `tCommon("close")` through the primitive — no hardcoded English "Close". Destructive button must satisfy `size="touch"` → 56 px (project floor). The dialog footer must stack `flex-col` so destroy is first, cancel below — thumb-reachable and hard to tap in passing.

**Rationale (brief):** Inventory Pattern 2 flagged three destroy patterns shipped today, including the Tímar desktop pane's **no-confirm ghost cancel** — the riskiest single interaction in the audit. Unifying on `variant="destructive" size="touch"` + `ConfirmDialog` closes that gap and makes "this is permanent" legible every time.

---

## Pattern 3 — Create affordance

**What it is:** How a user adds a new record.

**Canonical answer:** A **full-width `<Button size="touch">`** at the top of the list content (directly under the page headline, above the list itself), labelled `<feature>.add` (e.g. "Nýr tími", "Skrifa í dagbók", "Bæta við tengilið") with the `Plus` icon on its left. Exactly one primary add button per view.

**When it applies:** Every list view that supports creation — Dagbók (mobile), Tímar, Tímar/Reglulegir, Fólk, Réttindi, Lyf, Skjöl.

**Counter-examples (when NOT to use):**
- **Dagbók on `xl:`** — the inline `LogComposer` textarea stays; it's the fastest way to capture a note while looking at the entry stream. The top button still exists for symmetry and opens the full sheet.
- **Kanban columns (Réttindi desktop)** — each column keeps its per-column `+` but the button must satisfy `size="touch-icon"` (56 px). The `size-6` (24 px) current implementation is retired.
- The `EmptyState` action (Pattern 5) is the *same* button copy and shape — not a separate "first-row add" — so empty states and populated states look like the same affordance.

**Code recipe:**

```tsx
<Button
  type="button"
  size="touch"
  className="w-full justify-center gap-2"
  onClick={() => setCreateOpen(true)}
>
  <Plus aria-hidden />
  {t("add")}
</Button>
```

**Icelandic copy:** Per-feature key `<feature>.add` — existing: **"Nýr tími"**, **"Bæta við tengilið"**, **"Bæta við réttindum"**, **"Bæta við lyfi"**, **"Bæta við skjali"**, **"Nýr reglulegur tími"**, **"Skrifa í dagbók"**. Keep these — do not normalise to "Bæta við" everywhere; the warm noun-verb pairing ("Nýr tími", "Nýr reglulegur tími") reads better than a generic "Bæta við".

**English mirror:** **"New appointment"**, **"Add contact"**, **"Add entitlement"**, **"Add medication"**, **"Add document"**, **"New recurring appointment"**, **"Write journal entry"**.

**A11y requirements:** 56 px tall (`size="touch"`). Icon `aria-hidden`; accessible name comes from the Icelandic label. Focus ring visible at 3:1. Must not use `size="sm"` (28 px) — the Tímar desktop toolbar and Fólk `size-10` violations are the targets of this rule.

**Rationale (brief):** Inventory Pattern 3 listed five distinct create affordances plus a sub-floor toolbar button. One full-width touch button at a predictable spot lets the audience build a single muscle memory. The per-column kanban exception is kept because status *is* the signal there — just sized up.

---

## Pattern 4 — Form container (Sheet vs Dialog)

**What it is:** Choosing between a bottom Sheet and a centred Dialog, and laying out the primary / cancel / destructive buttons inside.

**Canonical answer:** **Sheet = enter data or complete a task. Dialog = confirm a decision.** Forms (create/edit) are always `<Sheet side="bottom" max-h-[92vh] rounded-t-2xl showCloseButton={false}>` with footer CTAs `Cancel outline flex-1` + `Save primary flex-1` side-by-side. Confirmations are always `<Dialog>` wrapped by the new shared **`<ConfirmDialog>`** primitive that handles i18n, destructive-vs-affirmative variant, and focus-return. Read-only detail Sheets (Skjöl mobile detail) are the one Sheet that sets `showCloseButton={true}`.

**When it applies:**
- **Sheet (form):** LogEntryForm, AppointmentForm, MedicationForm, ContactForm, EntitlementForm, SeriesForm, DocumentUpload.
- **Sheet (read-only detail):** mobile document detail only — any other future "look but don't edit" surface takes this variant.
- **Dialog (confirm):** destroy confirmation (Pattern 2), commitment confirmation (Pattern 19), and no other use.

**Counter-examples (when NOT to use):** Do not use a Dialog for data entry. Do not use a Sheet for a yes/no question. Inline expansion (the current Fólk row-expand-and-edit pattern) is retired by Pattern 1.

**Code recipe:**

```tsx
// Form container — every create/edit Sheet
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent side="bottom" className="max-h-[92vh] rounded-t-2xl" showCloseButton={false}>
    <SheetHeader>
      <SheetTitle className="font-serif text-[1.6rem] font-normal tracking-tight">
        {t(editing ? "edit" : "add")}
      </SheetTitle>
    </SheetHeader>
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
      {/* fields … */}
      {error ? <p role="alert" className="text-base text-destructive">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="touch" className="flex-1" onClick={close}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" size="touch" className="flex-1" disabled={saving}>
          {saving ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
      {editing ? <DestroyButton className="self-start" /> : null}
    </form>
  </SheetContent>
</Sheet>

// Confirm container — destroy (Pattern 2) or commit (Pattern 19)
<ConfirmDialog
  open={open} onOpenChange={setOpen}
  title={t("confirmTitle", { title })}
  body={t("confirmBody", { title })}
  confirmLabel={t("confirmAction")}
  confirmVariant="destructive" /* or "default" for commitment */
  onConfirm={handleConfirm}
/>
```

**Icelandic copy:** `common.cancel` → "Hætta við". `common.save` → "Vista". `common.saving` → "Vista...". `common.close` → "Loka" (used by `showCloseButton={true}` Sheets and by the `ConfirmDialog` primitive's internal accessibility label). Document upload keeps its verb **"Hlaða upp"** on the primary button because the action is materially different from save (transfers a blob); no other form overrides the save verb.

**English mirror:** `common.cancel` → "Cancel". `common.save` → "Save". `common.saving` → "Saving…". `common.close` → "Close". Document upload primary → "Upload".

**A11y requirements:** Sheets and Dialogs must be built through the local wrappers — never the raw shadcn primitives with hardcoded `<span className="sr-only">Close</span>`. The shared `<ConfirmDialog>` wrapper uses `useTranslations("common")` internally so the close label is always localised (a11y audit findings 1 & 2 on `dialog.tsx` / `sheet.tsx`). Sheets must pass `aria-describedby` or provide a `<SheetDescription>` so screen readers announce context, not just the title. Focus returns to the trigger on close. Validation errors carry `role="alert"` (see Pattern 13).

**Rationale (brief):** Inventory Pattern 4 showed sheet/dialog choice is already consistent; what isn't is the English "Close" in primitives and destructive-button placement. A shared `<ConfirmDialog>` wrapper fixes both and gives Patterns 2 and 19 a single visual rhythm.

---

## Pattern 5 — Empty state

**What it is:** What a list looks like when it has zero rows, and what a detail pane looks like when nothing is selected.

**Canonical answer:** List-empty uses the `<EmptyState>` primitive (re-themed away from dashed/`bg-muted` to the standard **`bg-paper ring-1 ring-foreground/10 rounded-2xl`** surface) with a mandatory trio: **Lucide icon above + warm serif title + exactly one action button** (the same `size="touch"` add button from Pattern 3, or a "Go to …" link when the action lives elsewhere). Detail-pane-deselected uses a plain centred italic line in `text-ink-soft` — no icon, no button.

**When it applies:** Every list (Dagbók, Tímar, Reglulegir, Fólk, Réttindi, Lyf, Skjöl, Week grid). Every desktop detail pane (Fólk, Skjöl, Tímar) when nothing is selected. Filter-applied empties inside a populated list (Réttindi `emptyFilter`) use the *pane-deselected* line style — they are "not really empty, just filtered".

**Counter-examples (when NOT to use):** Dashboard status cards (`NextAppointments`, `SinceLastVisit`, `RecentLog`) are not lists — they are summary widgets. Their empties remain the plain `<p className="text-ink-soft py-2">` line; they must not gain icons or CTAs which would visually outrank the surrounding content.

**Code recipe:**

```tsx
// Primitive (update EmptyState.tsx to this baseline)
<div className="flex flex-col items-center gap-4 rounded-2xl bg-paper px-6 py-8 text-center ring-1 ring-foreground/10">
  <Icon aria-hidden className="size-8 text-ink-soft" />
  <h3 className="font-serif text-[1.4rem] tracking-tight text-balance">{title}</h3>
  {description ? <p className="text-base text-ink-soft text-balance">{description}</p> : null}
  {action}
</div>
```

**Icelandic copy:** Title keys already exist and are warm — keep them: `umonnun.logEmpty` → **"Engar færslur í dagbók ennþá."** (note trailing period, uniform), `timar.empty` → **"Engir tímar á næstunni."**, `folk.empty` → **"Engir tengiliðir skráðir."**, `rettindi.empty` → **"Engin réttindi skráð."**, `pappirar.skjolEmpty` → **"Engin skjöl skráð."**, `recurring.empty.title` → **"Engir reglulegir tímar."**. **Standardise punctuation: every title ends in a period.** Detail-pane line: `<feature>.selectHint` → **"Veldu {noun} til að skoða."** (keep existing "Veldu manneskju til að skoða." / "Veldu skjal til að skoða."). Filter-empty: `<feature>.emptyFilter` → **"Ekkert í þessum flokki."**.

**English mirror:** Titles end in a period: "No journal entries yet.", "No upcoming appointments.", "No contacts yet.", etc. Pane hint "Select a {noun} to view." Filter-empty "Nothing in this category."

**A11y requirements:** The `<EmptyState>` root is a `<div role="status" aria-live="polite">` so screen-reader users announced the empty condition when the view first loads but not on every re-render (see a11y audit 4.1.3). The icon is `aria-hidden`. The title is the accessible name via DOM order.

**Rationale (brief):** Inventory Pattern 5 showed three empty-state tiers plus the primitive styled off-brand (`bg-muted/40 border-dashed`). Unifying on icon+title+action with paper-surface styling makes the empty state a proper on-ramp to the create action.

---

## Pattern 6 — Headline style

**What it is:** The typography scale and tone for page headlines, section headings, and card titles.

**Canonical answer:** Two serif sizes and one sans eyebrow. **Page headline** `<h1 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">`. **Section / detail heading** `<h2 className="font-serif text-[1.4rem] font-normal tracking-tight text-ink">`. **Eyebrow** `<p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">`. Page headlines read as warm sentences with a final period ("Hvernig Siggu líður."); the dry-noun style ("Tímar", "Reglulegir tímar") is retired.

**When it applies:** Every top-level route's page headline. Every major section (Lyf, Réttindi list header, Skjöl list header, Dashboard "Næstu tímar", dashboard "Síðan síðast"). Every detail-pane title. Every Sheet title.

**Counter-examples (when NOT to use):** The Dashboard greeting ("Góðan daginn, {name}.") is the one page headline allowed at `text-[2.5rem]` — it's the first thing Sigga's family sees and the warmer-larger scale works for that single surface. Login page uses `text-3xl font-semibold` without serif because it pre-dates the palette and ships auth provider chrome around it — leave as-is. The WeekStrip eyebrow size is its own thing (tiny uppercase `text-xs`) and stays.

**Code recipe:**

```tsx
// Page headline — one h1 per route (a11y audit finding 9)
<h1 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
  {t("headline")}
</h1>

// Section / detail / sheet heading
<h2 className="font-serif text-[1.4rem] font-normal tracking-tight text-ink">
  {t("sectionTitle")}
</h2>

// Eyebrow
<p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
  {t("eyebrow")}
</p>
```

**Icelandic copy:** Existing headlines remain: **"Hvernig Siggu líður."**, **"Sími, læknar, þjónusta."**, **"Réttindi í vinnslu."** / **"Allt í höfn."** / **"Engin réttindi enn."** Rewrite Tímar mobile from **"Tímar"** to **"Tímar framundan."** and Reglulegir from **"Reglulegir tímar"** to **"Reglulegir tímar í gangi."** to match the warm-sentence convention. Add `text-balance` on empty-state descriptions so Icelandic word-wrap doesn't produce ragged two-line breaks.

**English mirror:** "How Sigga is doing.", "Phone, doctors, services.", "Entitlements in progress." / "All taken care of." / "No entitlements yet.", "Upcoming appointments.", "Recurring appointments in place."

**A11y requirements:** Exactly one `<h1>` per page (a11y audit finding 9 — every current authenticated page starts at `<h2>`). Heading hierarchy is h1 → h2 → h3 with no skips. Serif rendering depends on `Source Serif 4` being loaded via `next/font` — do not load it conditionally.

**Rationale (brief):** Inventory Pattern 6 found six rem values in use and Tímar mobile outside the serif system. Two sizes + one eyebrow is enough hierarchy for a five-route app; the warm-sentence pattern is already the majority.

---

## Pattern 7 — Tap targets

**What it is:** Minimum size for any tappable UI element.

**Canonical answer:** **48 px hard floor on everything interactive, 56 px preferred (= `size="touch"` / `size="touch-icon"`).** The shadcn `size="xs" | "sm" | "default" | "lg" | "icon-xs" | "icon-sm" | "icon-lg"` variants are deprecated from user-facing use and removed from `button.tsx`. The only legal button sizes are `touch` (56 × text) and `touch-icon` (56 × 56). Chips, inline CTAs, native checkboxes, and tel pills all honour the same floor.

**When it applies:** Every tappable element on every surface, at every breakpoint. Desktop included — "it's a bigger screen" is not a defence.

**Counter-examples (when NOT to use):** Inline day-numbers inside month-grid cells are rendered as `<button>` but are never the primary tap target on mobile (the whole cell is); they may remain visually smaller so long as the cell hit area is ≥ 48 px. Avatar visuals inside a larger button (e.g. `size-9` Avatar inside a `size-12` `<button>`) are fine — the *button* hits the floor; the avatar is decoration.

**Code recipe:**

```tsx
// button.tsx — delete sub-48 variants; keep only:
const buttonVariants = cva(/* base */, {
  variants: {
    size: {
      touch: "h-14 px-5 text-base",       // 56 px — default for every CTA
      "touch-icon": "size-14",              // 56 × 56 — icon-only
    },
  },
  defaultVariants: { size: "touch" },
});

// Chips — min-h-12, never h-10
<button className="inline-flex min-h-12 items-center gap-1 rounded-full px-4 text-base">…</button>

// Tel pill inside a contact row
<a href={telHref(phone)} className="inline-flex size-12 items-center justify-center rounded-full bg-sage/30 text-sage-shadow" aria-label={t("call", { name })}>
  <Phone aria-hidden />
</a>
```

**Icelandic copy:** n/a — this pattern governs shape, not copy.

**English mirror:** n/a.

**A11y requirements:** 48 px satisfies WCAG 2.2 AA target-size (24 × 24) comfortably. The *project* 48 px floor is the one developers code to. The `MedicationForm` native checkbox at 20 px is a WCAG **blocker** (a11y audit Blocker #1) — it must be replaced by a shadcn `<Checkbox>` primitive sized to fit inside a 48 px tap area (label row). Focus rings must be `focus-visible:ring-ring` full alpha (the `/50` variant is 2.25:1 and fails 1.4.11 — a11y finding #8).

**Rationale (brief):** Inventory Pattern 7 surfaced six concrete sub-floor violations plus a 20 px checkbox that fails WCAG. Removing sub-48 variants at the primitive level eliminates the whole class of future regressions — nobody can type `size="sm"` and compile.

---

## Pattern 8 — List-detail responsive behaviour

**What it is:** How a list + detail interaction lays out across breakpoints.

**Canonical answer:** **Mobile (< `xl:`) = full-page routes.** Tap a row → navigate to `/<feature>/<id>` (or open a full-page sheet if no route exists) → back button returns. **`xl:` (≥ 1280 px) = list-detail via the existing `PaneLayout` primitive** with the selected item's id held in the `?id=` URL query param so refresh and deep-linking work. The `md:` (768–1279 px) breakpoint is not a distinct experience — mobile and tablet share the same layout.

**When it applies:** Catalog-shaped views — Fólk, Skjöl, Dagbók (entry reader). Tímar inherits a hybrid because the calendar is its own primitive (exemption below). Réttindi uses kanban on `xl:`, not list-detail — exemption documented.

**Counter-examples (when NOT to use):**
- **Tímar calendar on `xl:`** keeps its bespoke calendar + right-hand pane — the calendar is sui generis.
- **Réttindi on `xl:`** keeps the 4-column kanban — entitlement status *is* the primary signal, and the kanban makes status columns navigable.
- **Dashboard on `xl:`** keeps the bespoke Command Post (WeekStrip + SinceLastVisit + attention column) — it is not a list-detail at all.
- All three exemptions are documented in this pattern; no other view invents its own `xl:` shape.

**Code recipe:**

```tsx
// Use the existing PaneLayout primitive — retire bespoke xl: grids in FolkView, PappirarTabs
<PaneLayout
  list={<ContactList selectedId={selectedId} onSelect={setSelectedId} />}
  detail={selectedId ? <ContactDetail id={selectedId} /> : <PaneEmpty hintKey="folk.selectHint" />}
/>

// Selected id lives in the URL for refresh-safety
const searchParams = useSearchParams();
const selectedId = searchParams.get("id");
```

**Icelandic copy:** Pane-empty hints use `<feature>.selectHint` — see Pattern 5. Back-link text: `common.back` → **"Til baka"**, prefixed with a contextual noun where useful (e.g. existing "Til baka í Tíma" on Reglulegir).

**English mirror:** "Back", "Back to Appointments", etc.

**A11y requirements:** Keyboard Escape must dismiss the detail pane on desktop (the a11y audit flagged that the Tímar pane today has only a mouse-reachable close X). The selected-row `<button>` in the list carries `aria-current="true"` so screen readers announce selection. Heading hierarchy across list + pane is: page `<h1>`, pane-item title `<h2>`, pane-item sub-sections `<h3>`.

**Rationale (brief):** Inventory Pattern 8 found four `xl:` strategies plus an unused `PaneLayout` primitive. Adopting `PaneLayout` as the default plus three named exemptions gives contributors a four-branch decision tree, not eight.

---

## Pattern 9 — Date/time formatting

**What it is:** When a timestamp is rendered as absolute ("17. apr. kl. 14:00") vs relative ("Fyrir 2 klst.").

**Canonical answer:** **Future events render absolute; past events written by a family member render relative if ≤ 7 days old, absolute thereafter.** Always include a time component ("kl. HH:mm") for events that have a time. Weekday abbreviation prefixes the absolute form ("fös. 18. apr. kl. 14:00"). The existing `formatDate.ts` helpers (`formatAbsoluteWithTime`, `classifyRelative`) are the only formatters — no component rolls its own `Intl.DateTimeFormat`.

**When it applies:** Every timestamp surface — Dagbók feed entries, log reader, RecentLog eyebrow, activity feed (`SinceLastVisit`), appointment cards, appointment detail, week / month grid, document row meta, document detail, "last updated" strings.

**Counter-examples (when NOT to use):** The week grid's column headers ("þri. 15") and month grid's cell day-numbers ("15") are not timestamps — they're coordinates. They render day-of-week abbreviation + number, never a year. Document row meta uses short absolute ("17. apr.") without time — documents don't have times.

**Code recipe:**

```tsx
import { formatAbsoluteWithTime, classifyRelative } from "@/lib/formatDate";

// Past event (log entry, document upload, activity feed item)
const label = classifyRelative(entry.date, { now, cutoffDays: 7 })
  ?? formatAbsoluteWithTime(entry.date, { locale });

// Future event (appointment, upcoming series occurrence)
const label = formatAbsoluteWithTime(appt.startDate, { locale, includeWeekday: true });
```

**Icelandic copy:** Relative keys already exist in `common.*` — `justNow` "Rétt í þessu", `minutesAgo` "Fyrir {count} mín.", `hoursAgo` "Fyrir {count} klst.", `yesterday` "Í gær", `today` "Í dag", `daysAgo` "Fyrir {count} dögum". Absolute with time reads "fös. 18. apr. kl. 14:00" — the `kl.` prefix is mandatory for time (per spec). Dagbók feed currently forces absolute even for today/yesterday; align it to relative-first per this rule.

**English mirror:** "Just now", "{count} min ago", "{count} hr ago", "Yesterday", "Today", "{count} days ago". Absolute with time "Fri 18 Apr at 14:00".

**A11y requirements:** Screen-reader text uses the full absolute form even when the visible text is relative — wrap the visible relative label with `<time dateTime={iso}>{relativeLabel}</time><span className="sr-only">{absoluteLabel}</span>` so AT users hear the exact time.

**Rationale (brief):** Inventory Pattern 9 found the rule was almost intuitive but unwritten, with Dagbók feed breaking the "past = relative" half. Writing it down + documenting the `<time>` / sr-only pattern makes it enforceable.

---

## Pattern 10 — Actor attribution

**What it is:** Whether and how "{name} did X" is shown on rows that represent an authored action.

**Canonical answer:** Every list row that represents an authored or owned record surfaces the actor as a **subject-first line** using the existing avatar + name pattern: `<Avatar size-9>` + `<span className="text-base">{name} {verb}…</span>`. In detail panes the same actor is shown full-width with date. In activity-feed templates (`SinceLastVisit`), the copy template is always "{name} {verb} {object}". No row hides the actor.

**When it applies:** Dagbók feed + reader (author), document row + detail (uploader), entitlement card (owner, with verb "sér um"), appointment card + detail (driver if present; creator/updater stays hidden — appointments are facts, not authored content), `SinceLastVisit` items.

**Counter-examples (when NOT to use):** Contact rows and medication rows don't show an actor — contacts and medications are shared family data without meaningful authorship. Appointment cards expose the **driver** (an assignment), not the creator; the creator is intentionally hidden because assigning blame for a dentist appointment is not useful.

**Code recipe:**

```tsx
// Subject-first row attribution
<div className="flex items-center gap-2 text-base">
  <Avatar user={actor} className="size-9" />
  <span className="text-ink">
    <span className="font-medium">{actor.firstName}</span>{" "}
    {t("verb.log")}
  </span>
</div>
```

**Icelandic copy:** Verbs are plain past tense, gender-neutral where possible: **"skrifaði færslu"** (log), **"bætti við skjali: {fileName}"** (document), **"uppfærði réttindi „{title}" í {newStatus}"** (entitlement), **"bætti tíma: {title}"** (appointment — add this missing key; the current `SinceLastVisit.appointment` omits the actor). Entitlement ownership uses **"sér um"** consistently in both list and kanban (kanban currently drops the suffix).

**English mirror:** "wrote a journal entry", "added a document: {fileName}", "updated entitlement "{title}" to {newStatus}", "added an appointment: {title}", "owns".

**A11y requirements:** Avatar `<img>` carries `alt={actor.name}`. If the actor is known but the avatar fails to load, a visible initial fallback replaces it. The sentence reads naturally top-to-bottom for a screen reader — avoid structures where the verb appears before the subject.

**Rationale (brief):** Inventory Pattern 10 found inconsistent actor visibility, including one SinceLastVisit item that uniquely omits the actor. Codifying "subject-first, established sentence template" makes "should this row show who?" trivially decidable.

---

## Pattern 11 — Toast feedback

**What it is:** Whether the app uses toasts (the ephemeral bottom-screen confirmation messages).

**Canonical answer:** **No toasts in v1.** Success feedback is the sheet closing, the list re-rendering live via Convex subscription, and a silent `aria-live="polite"` announcement from a single polite live-region in `(app)/layout.tsx`. The orphan keys `recurring.pauseToast` / `recurring.resumeToast` are deleted.

**When it applies:** Every mutation path across the app — save, delete, commit, pause, claim, volunteer, drag-to-assign.

**Counter-examples (when NOT to use):** No exemptions in v1. A future slow-network complaint — especially for "Ég get skutlað" on a 3G connection — is the trigger to reopen this decision; re-evaluate under audience testing, not in this file.

**Code recipe:**

```tsx
// One polite live-region in (app)/layout.tsx
<div id="live-status" role="status" aria-live="polite" className="sr-only" />

// Mutation handlers push short confirmation into it via a tiny helper
import { announce } from "@/lib/announce";
await save({ … });
announce(t("saved", { title })); // e.g. "Færsla vistuð."
```

**Icelandic copy:** Live-region strings are intentionally short and calm: **"Færsla vistuð."**, **"Tíma bætt við."**, **"Tengilið vistað."**, **"Skjal hlaðið upp."**, **"Eytt."** — one sentence, ends in a period. Keys live under `<feature>.announce.*`.

**English mirror:** "Journal entry saved.", "Appointment added.", "Contact saved.", "Document uploaded.", "Deleted."

**A11y requirements:** The live-region must be in the layout, not per-page, so route changes don't reset it. `role="status"` + `aria-live="polite"` (never `"assertive"` — interruption is wrong tone for Sigga's audience). Empty the region after 4 s so a screen reader revisiting the node doesn't re-announce stale text.

**Rationale (brief):** Inventory Pattern 11 flagged orphan toast keys and no toast system. Shipping toasts now adds moving parts for an audience that dislikes animation, while the Convex subscription already provides the visual "it happened" signal. A polite live-region covers the one genuine AT gap without a popup.

---

## Pattern 12 — Loading state

**What it is:** What a surface renders while data is in flight.

**Canonical answer:** **A single shared `<LoadingLine />` component everywhere.** It renders the word "Hleð..." in Source Serif 4 italic, centred, at `text-ink-soft`, with a gentle motion-safe opacity breath (1.8 s ease-in-out, fades to 0.55 and back). No frame, no tile, no ring — the surrounding Card / tab panel / sheet carries the structure. No skeletons, no spinners, no shimmer — except the already-shipped aria-hidden empty `<div>` placeholders on the week/month grids, which are retained because grid-shaped loading would flash jarringly as an empty list.

**When it applies:** Every `useQuery` first-render. Every mutation that blocks the UI (rare — see Pattern 14). Any Convex subscription waking up from a stale state. Paginated list's "LoadingMore" slot too, not just first-page.

**Counter-examples (when NOT to use):** Below-1-second round-trips show nothing — flashing "Hleð..." for 200 ms is worse than silence. Button-pending states (e.g. Login during OAuth redirect) keep inline text on the button — the button itself is the context, a sibling LoadingLine would compete. The "render nothing while loading" variant is retired everywhere (including Dashboard RecentLog) — all data-fetch surfaces render `LoadingLine` so the page doesn't appear empty.

**Retired:**
- Paper-block list tile (`rounded-2xl bg-paper ring-1 ring-foreground/10`). The boxed-in frame around short text read as a placeholder shape, which subtly fought the "no skeletons" rule.
- Plain sans-serif italic detail line (`text-ink-soft italic`). Matched body copy weight instead of the library-tone typography the rest of the app uses for state text.
- shadcn Card variant (`<Card><CardContent>Hleð…</CardContent></Card>`). Imported shadcn default styling against the Bókasafn aesthetic.

**Code recipe:**

```tsx
import { LoadingLine } from "@/components/shared/LoadingLine";

// List, detail, widget — all the same:
{loading ? <LoadingLine /> : …}

// With custom padding override (rare — e.g. tighter in a compact widget):
<LoadingLine className="py-3" />

// With custom label (rare — e.g. an upload-in-flight state):
<LoadingLine label={t("uploading")} />
```

The component itself:

```tsx
export function LoadingLine({ className, label }: LoadingLineProps) {
  const tCommon = useTranslations("common");
  return (
    <p
      role="status"
      className={cn(
        "font-serif italic text-ink-soft text-center py-6 motion-safe:animate-[loading-breath_1.8s_ease-in-out_infinite]",
        className,
      )}
    >
      {label ?? tCommon("loading")}
    </p>
  );
}
```

`loading-breath` is defined in `src/app/globals.css` as a 0% 100% → 50% opacity fade. `motion-safe:` gates the animation so `prefers-reduced-motion` users get static text.

**Icelandic copy:** `common.loading` → **"Hleð..."** (three dots, not ellipsis character).

**English mirror:** `common.loading` → **"Loading..."**.

**A11y requirements:** `LoadingLine` sets `role="status"` so screen readers announce the wait. It does **not** carry `aria-live="assertive"` — do not interrupt. Reduced-motion users see a static italic line.

**Rationale (brief):** The audit pass (2026-04-19) landed on plain text over skeletons because skeletons' shape-morphing motion confuses the 60+ audience. A follow-up user review (2026-04-19) judged the paper-block list variant and sans-serif detail line as inelegant — boxy and utilitarian against the Bókasafn aesthetic. This revision keeps the anti-skeleton/anti-shimmer bans but promotes the treatment to match the app's typographic voice: Source Serif 4 italic with a breath-slow opacity pulse. One component, one treatment, everywhere.

---

## Pattern 13 — Error state

**What it is:** How the app surfaces validation errors (form-level) and mutation errors (network / server).

**Canonical answer:** **Form validation errors → inline `<p role="alert" className="text-base text-destructive">` under the offending field or at the bottom of the form body.** **Mutation errors → inline banner above the submit footer using the same `text-destructive` style.** Silent `try/catch` with `console.error` and no user feedback is **banned everywhere** — every mutation handler either renders an error message or announces via the live-region (Pattern 11).

**When it applies:** Every form, every mutation handler across the app (including the currently-silent `volunteerToDrive`, Tímar cancel, Kanban drag-to-status, AppointmentCard volunteer, Document delete).

**Counter-examples (when NOT to use):** Background reads (Convex `useQuery`) use the app-level `error.tsx` boundary — they don't need per-surface error UI. But any handler that writes data must surface.

**Code recipe:**

```tsx
// Mutation handler pattern — no more silent catch
const [error, setError] = useState<string | null>(null);
const onConfirm = async () => {
  setError(null);
  try {
    await mutation(args);
    announce(t("announce.saved"));
    close();
  } catch (err) {
    setError(err instanceof ConvexError ? err.data : t("errors.generic"));
  }
};

// Render
{error ? <p role="alert" className="text-base text-destructive">{error}</p> : null}
```

**Icelandic copy:** Generic fallback `common.errors.generic` → **"Eitthvað fór úrskeiðis. Reyndu aftur."** Per-feature errors keep their existing keys (`rettindi.claim.error` → "Ekki tókst að taka réttindin að sér.", etc.). Login errors wrap in `auth.signInFailed` — raw OAuth / Convex error strings never reach the user.

**English mirror:** `common.errors.generic` → **"Something went wrong. Try again."**

**A11y requirements:** `role="alert"` — forces immediate screen-reader announcement. Use `text-destructive` token (never raw `text-red-600` — login is the outlier to fix). Contrast of `#b85a5a` on paper is 4.22:1 which passes AA for normal text at ≥ 18 px body size (a11y audit 3.3.1 — verified).

**Rationale (brief):** Inventory Pattern 13 named five silent-swallow sites. Messenger itself shows a red exclamation on send failure; silent failure is strictly worse. Pairing this with the live-region announce (Pattern 11) means sighted and AT users learn about every outcome.

---

## Pattern 14 — Optimistic UI

**What it is:** Whether the UI updates before the server confirms.

**Canonical answer:** **No optimistic updates in v1.** Every mutation waits for the Convex round-trip; the live re-render from the subscription is the feedback. Document this choice explicitly so future contributors don't add one-off optimistic updates piecemeal.

**When it applies:** Every mutation across the app — volunteering, claiming, kanban drag, week-grid drag-to-assign, pause toggle, form save, form delete.

**Counter-examples (when NOT to use):** Pure local-state UI (e.g. "expand this row" in-memory toggles) are instant by definition — those aren't mutations. That's the only exception.

**Code recipe:** n/a — the canonical code is the absence of optimistic helpers. Contributors should not import or roll their own `useOptimisticUpdate`. If a surface feels slow in QA, discuss the specific surface before adding a framework-wide optimism; the top candidate under audience pressure is `DrivingCta`.

**Icelandic copy:** n/a.

**English mirror:** n/a.

**A11y requirements:** Because nothing updates optimistically, the `aria-busy="true"` attribute should be set on the triggering control during the round-trip, and the live-region announces completion (Pattern 11). This is how AT users get the same "it worked" signal sighted users get from the list re-render.

**Rationale (brief):** Inventory Pattern 14 confirmed nothing is optimistic today. The audience tolerates a visible half-second on Messenger already. Future DrivingCta complaints reopen this.

---

## Pattern 15 — Phone / tel: affordance

**What it is:** Making phone numbers tappable so tapping initiates a call.

**Canonical answer:** **Every phone number in the app is a `<a href={telHref(phone)}>` link, without exception.** Structured `phone` fields already are; phone numbers embedded in free-text (contact notes, entitlement notes, medication notes, appointment notes, document notes) are linkified at render time with a regex autolinker. The contact-row tel pill is **`size-12`** (48 px), not `size-11`.

**When it applies:** Everywhere a phone number might appear — emergency tiles, contact rows, contact detail, free-text notes on any record, AttentionCard items that reference a contact (e.g. Brjóstamiðstöð 543 9560), and the few seed-data contexts where a phone number is part of a longer string.

**Counter-examples (when NOT to use):** The phone input field inside the ContactForm edit path is a typing surface, not a dial surface — it stays `<Input type="tel" inputMode="tel" autoComplete="tel">`. No other exemptions.

**Code recipe:**

```tsx
import { telHref } from "@/lib/telHref";

// Structured field
<a
  href={telHref(phone)}
  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-sage/30 px-4 text-lg text-sage-shadow"
  aria-label={t("call", { name })}
>
  <Phone aria-hidden />
  {phone}
</a>

// Free-text — render-time linkifier
<LinkifyPhones text={contact.notes} />
// LinkifyPhones is a new component wrapping a regex autolinker; implementation TBD in Phase C.
```

**Icelandic copy:** Accessible name `<feature>.call` → **"Hringja í {name}"**. For emergency tiles where the name *is* the phone (e.g. Neyðarlínan 112), the aria-label reads **"Neyðarlínan: 112"**.

**English mirror:** "Call {name}", "Emergency Line: 112".

**A11y requirements:** Tel links carry the accessible name "Hringja í {name}" — not just the phone number. Tap area is ≥ 48 px (Pattern 7). The `Phone` icon is `aria-hidden`. On iOS Safari the `tel:` protocol is handled natively without confirmation — this is fine for the audience (one tap from "I need to call" to the call starting, per CLAUDE.md).

**Rationale (brief):** Inventory Pattern 15 confirmed structured phone fields are tappable but notes-embedded numbers aren't, and the row pill is under-floor. CLAUDE.md calls `tel:` the single most-used feature; the notes gap is a regression from that claim.

---

## Pattern 16 — Colour semantics

**What it is:** What sage / amber / wheat / sage-deep / destructive *mean*.

**Canonical answer:** Lock one meaning per colour:
- **Sage** = calm / assigned / handled (driver set, entitlement approved or in-progress-with-owner).
- **Sage-deep** = selected / focused (the active day pill, the current kanban column header).
- **Amber (amber-bg-1 / amber-bg-2 / amber-ink)** = needs attention **now** (driver missing, urgent entitlement, AttentionCard).
- **Wheat** = neutral-pending (entitlement status `not_applied` — not urgent, just not yet in progress).
- **Destructive (`#b85a5a`)** = destroy-only (buttons that delete, and the `denied` entitlement status which is reassigned from the current grey).
- **No inline hex** in any component — all colours flow through `@theme inline` tokens in `globals.css`. The emergency-tile coral, DocumentList PDF-thumbnail coral, and the AttentionCard `#C9A35C` dot are either replaced by existing tokens or registered as named tokens (e.g. `--tone-coral-bg`, `--tone-coral-ink`) without growing the primary palette.

**When it applies:** Every surface that ships a colour — cards, pills, dots, icons, left rails, progress segments, CTAs.

**Counter-examples (when NOT to use):** No exemptions. If a designer proposes a new colour, register a token or reject it — the palette does not grow.

**Code recipe:**

```tsx
// Status dot — one function, one mapping, zero inline hex
const statusStyle = {
  in_progress: "bg-sage-deep",
  approved:    "bg-sage-shadow",
  not_applied: "bg-wheat-deep",
  denied:      "bg-destructive",  // was bg-ink-faint — reassigned per this pattern
} as const;

// Selection vs attention — two different sages
<button className={cn(
  selected ? "bg-sage-deep text-paper" : "bg-sage/20 text-sage-shadow",
)}>…</button>

// Attention surface
<div className="bg-[image:linear-gradient(to_right,var(--amber-bg-1),var(--amber-bg-2))] text-amber-ink-deep">…</div>
```

**Icelandic copy:** n/a — this is a token rule.

**English mirror:** n/a.

**A11y requirements:** Colour alone never carries meaning — every status dot is accompanied by a visible status label (already the case in EntitlementList; kanban must keep the same). `text-amber-ink` at 3.87:1 against amber-bg-1 (a11y audit finding 5) fails AA — escalate to `text-amber-ink-deep` in AttentionCard eyebrows. `text-paper/75` and `text-paper/90` on sage-deep (DrivingCta) drop below 4.5:1 — use `text-paper` at full alpha (a11y finding 6). `ring-sage` drag-over (2.44:1) upgrades to `ring-sage-shadow` (a11y finding 7).

**Rationale (brief):** Inventory Pattern 16 found two semantic drifts (denied-as-grey, not_applied-as-wheat) and five raw-hex colours bypassing tokens. Locking semantics + banning inline hex freezes the palette; a11y fixes follow mechanically.

---

## Pattern 17 — i18n coverage

**What it is:** All user-visible strings come from `messages/is.json` (primary) and `messages/en.json` (proofread mirror).

**Canonical answer:** **Zero hardcoded user-visible English.** Including inside shadcn primitives — `dialog.tsx` and `sheet.tsx` thread `useTranslations("common")` through their `showCloseButton` branch and render `tCommon("close")` for the sr-only label. Short acronyms rendered as categorical labels (PDF / IMG / DOC thumbnails) are considered i18n-neutral and stay. All new primitives added to the app must accept locale-aware labels as props.

**When it applies:** Every component that renders text, including `ui/` primitives. Every validation message. Every error that reaches the user.

**Counter-examples (when NOT to use):** Icelandic-first, English-second: when authoring a new string always write the Icelandic key first, then mirror. Do not English-first + translate-later — tone drifts every time.

**Gender convention for Icelandic copy:** **Default to feminine forms** (e.g. `skráð`, not `skráð(ur)`, not `skráður`). All current primary users are women, and parenthetical gender forms read as clinical to the 60+ audience. Apply to new keys and sweep existing parenthetical keys (`rettindi.claim.confirmBody` etc.) in Phase C. If a future user flow introduces a mixed-gender surface (onboarding for external contributors, admin console), that specific surface can revisit the convention — until then, feminine is the default. See `MEMORY.md`: "Feminine-first Icelandic copy".

**Code recipe:**

```tsx
// Wrap the shadcn primitive so the close label is always localised
// src/components/ui/dialog.tsx
import { useTranslations } from "next-intl";

export function DialogContent({ showCloseButton = true, children, ...props }) {
  const tCommon = useTranslations("common");
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content {...props}>
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            aria-label={tCommon("close")}
            className="…"
          >
            <XIcon aria-hidden />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}
```

**Icelandic copy:** Already-existing `common.close` → **"Loka"**, `common.cancel` → **"Hætta við"**, `common.save` → **"Vista"**. For raw OAuth/Convex errors on login, wrap with `auth.signInFailed` → **"Ekki tókst að skrá inn. Reyndu aftur."** Kanban drag-overlay aria-label **"view"** → new key `timar.calendar.viewAriaLabel` → **"Skoðunarstilling"**.

**English mirror:** "Close", "Cancel", "Save", "Sign-in failed. Try again.", "View".

**A11y requirements:** All primitive-internal sr-only strings are localised (a11y audit findings 1, 2, 12). Login error wraps rather than passes `err.message` through (a11y finding — surface raw English to Icelandic users).

**Rationale (brief):** Inventory Pattern 17 named three English sr-only "Close" strings and one "view" aria-label. Fixing at the primitive level eliminates every consumer-side bug in one commit.

---

## Pattern 18 — Accessibility

**What it is:** WCAG 2.2 AA compliance + project-floor (18 px body, 48 px targets) — the cross-cutting a11y rules the rulebook defers to.

**Canonical answer:** Follow `docs/superpowers/audits/2026-04-19-a11y-audit.md` for the 47 findings. Every new feature lands with: **(1) exactly one `<h1>` per page; (2) a skip-to-content link in the `(app)` layout; (3) `aria-label` on every icon-only button including the item title where disambiguation matters; (4) focus-visible rings at full alpha (never `/50`); (5) `<time>` + sr-only absolute for every relative timestamp; (6) a11y-compliant contrast (remap `--muted-foreground` from `ink-faint` to `ink-soft`); (7) `prefers-reduced-motion` respected on Sheet/Dialog animations.**

**When it applies:** Every PR. Every new component. Every primitive wrapper.

**Counter-examples (when NOT to use):** None. The a11y audit lists one **blocker** (MedicationForm native checkbox at 20 px below WCAG 24 px) that must be resolved independently of the rest of the remediation queue.

**Code recipe:**

```tsx
// (app)/layout.tsx — skip link + live-region + main landmark
<a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:bg-paper focus:px-4 focus:py-2 focus:rounded">
  {tCommon("skipToMain")}
</a>
<Sidebar />
<Header />
<main id="main" tabIndex={-1} className="…">
  {children}
</main>
<div id="live-status" role="status" aria-live="polite" className="sr-only" />

// Per-page — exactly one h1
<h1 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-balance">…</h1>
```

**Icelandic copy:** New key `common.skipToMain` → **"Hoppa yfir í efni"**. All other required strings already exist.

**English mirror:** `common.skipToMain` → **"Skip to main content"**.

**A11y requirements:** See the audit. The core fixes (by severity) are listed in the audit's "Findings by severity" index — Phase C consumes that list directly.

**Rationale (brief):** Pattern 18 delegates rather than duplicates the a11y audit. Cross-linking keeps this file shorter and the audit authoritative.

---

## Pattern 19 — Commitment confirmation

**What it is:** Any button that commits the current user (or someone else) to a responsibility — volunteering to drive, claiming an entitlement, assigning a driver via dropdown, or assigning via the week-grid drag.

**Canonical answer:** **Every commitment action is gated by a `<ConfirmDialog>` modelled on `entitlements.claim`.** The dialog body names the specific subject ("...að þú viljir skutla í „{apptTitle}" fös. 18. apr. kl. 14:00?"); the primary button is affirmative first-person ("Já, ég skutla"); the cancel button is `common.cancel`. This applies uniformly — no silent-commit paths.

**When it applies:** `DrivingCta` "Ég get skutlað", `NextAppointments` volunteer CTA, `AppointmentCard` "Ég skutla", `TimarDetail` driver-select dropdown (when assigning self *or* someone else — assigning someone else is arguably higher-stakes), and `entitlements.claim` which is already correct and is the template.

**Counter-examples (when NOT to use):** **Week-grid drag-to-assign (desktop)** is the one exemption. Drag is already an intentional two-step gesture — start drag, move across the grid, release. A confirmation modal on drop interrupts the gesture and feels wrong on desktop. **This exemption is documented here** and no other drag-based commitment flow inherits it automatically — if another drag flow ever ships, re-evaluate.

**Code recipe:**

```tsx
// The shared ConfirmDialog wrapper — used by Pattern 2 (destroy) AND Pattern 19 (commit)
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  title={t("driving.confirm.title")}
  body={t("driving.confirm.body", { title: appt.title, when: formatAbsoluteWithTime(appt.startDate) })}
  confirmLabel={t("driving.confirm.action")}      // "Já, ég skutla"
  confirmVariant="default"                         // sage-deep primary, NOT destructive
  onConfirm={handleVolunteer}
/>
```

**Icelandic copy:** New keys under `driving.confirm.*` mirroring the existing `rettindi.claim.*` shape:
- `driving.confirm.title` → **"Skutla þennan tíma?"**
- `driving.confirm.body` → **"Þú verður skráð sem skutlari í „{title}" {when}. Þú getur breytt þessu aftur seinna."** (uses Icelandic curly quotes and the feminine `skráð` per the feminine-first convention in Pattern 17; includes the specific event + time).
- `driving.confirm.action` → **"Já, ég skutla"**.

For the dropdown-assign case (assigning someone else), a parallel set of keys: `driving.confirm.assignOtherTitle` → **"Setja {name} sem skutlara?"**, `driving.confirm.assignOtherAction` → **"Já, setja {name}"**.

Existing `rettindi.claim.*` stays unchanged and is the template.

**English mirror:** "Drive to this appointment?", "You'll be listed as the driver for "{title}" {when}. You can change this later.", "Yes, I'll drive", "Set {name} as driver?", "Yes, set {name}".

**A11y requirements:** `<ConfirmDialog>` renders via the primitive wrapper from Pattern 4 — all a11y requirements (localised close label, focus trap, Escape dismiss, focus return) flow from there. The affirmative primary button carries `variant="default"` (sage-deep background) — explicitly not `destructive`, so the tone reads "you're taking something on", not "you're destroying something". Screen readers announce dialog title → body → primary button in that order.

**Rationale (brief):** Inventory Pattern 19 found five of six commitment surfaces commit instantly with no gate, and the instant-commit surfaces silently swallow errors (Pattern 13) — accidents are invisible until noticed. Family members have already self-assigned as drivers by mistake. `entitlements.claim` is the proven template; copying it across five more surfaces is the minimum intervention.

---

## Pattern 20 — Gaps the rulebook can't decide without Nic's input

The rulebook has a canonical answer for all 19 interaction patterns. After Nic's 2026-04-19 sign-off, one item remains deferred but does not block Phase C:

1. ~~The `driving.confirm.body` copy in Pattern 19.~~ **Resolved 2026-04-19:** default to feminine forms (`skráð`, not `skráð(ur)`), since all current users are women. Codified as a cross-cutting rule in Pattern 17; existing `skráð(ur)` keys get swept in Phase C.
2. **Whether `DrivingCta` should be the one v1 surface to add optimistic UI** (Pattern 14 default-no) — today's blocking round-trip on LTE is probably tolerable, but it's the highest-frequency commit in the app and a candidate if audience feedback surfaces slowness. Decision deferred to post-Phase-D audience testing. Nic has accepted the default-no for now.

Everything else — edit, destroy, create, sheet vs dialog, headline scale, tap floor, list-detail, date format, actor, loading, error, tel, colour, i18n, a11y, commitment — has a single canonical answer above.

---

## Appendix — Terminology glossary

- **Commit (UI sense)** — in this rulebook, "commit" means a UI action that creates responsibility-bearing state (volunteering to drive, claiming an entitlement, assigning a driver). Not the git sense. Every commit goes through Pattern 19.
- **Destructive** — permanently deletes data (a record, a file, a series). Destructive buttons use `variant="destructive"`; destructive confirmations use `confirmVariant="destructive"` in `ConfirmDialog`. Cancelling a series-bound occurrence is **not** destructive — it sets `status: "cancelled"` — but it uses the same UI shape with different verb copy.
- **Self-assignment** — a subset of commitment (Pattern 19) where the user is assigning themselves. All Pattern 19 rules apply; the copy template is first-person affirmative ("Já, ég skutla").
- **Sheet vs Dialog** — Sheet = data entry (bottom, 92–95 vh). Dialog = decision confirmation (centred, max-w-sm). Pattern 4 is the authority on this distinction; no surface uses them interchangeably.
- **ConfirmDialog** — a new shared wrapper (specified by this rulebook, to be implemented in Phase C) that encapsulates the Dialog primitive for destroy + commit. Threads `tCommon("close")`, handles focus-return, and accepts `confirmVariant: "default" | "destructive"`.
- **PaneLayout** — existing primitive at `src/components/layout/PaneLayout.tsx` used for the `xl:` list + detail layout (Pattern 8). Currently unused in shipped code; Phase C adopts it for Fólk and Skjöl.
- **EmptyState** — existing primitive at `src/components/shared/EmptyState.tsx` — re-themed in Phase C to match the Bókasafn paper/ring-1 surface (Pattern 5).
- **Eyebrow** — the small uppercase letter-spaced label above a section title (e.g. "DAGBÓKIN · Í morgun"). Styled `text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft`.
- **Announce** — pushing a short confirmation string into the `#live-status` polite live-region. The only "toast-like" feedback in v1 (Pattern 11).
- **The floor** — shorthand for the 48 px project-minimum tap target. "Below the floor" means < 48 px.
- **Sage-deep** — the darker sage token used exclusively for **selection / focus state**, distinct from plain sage (which means "calm / assigned").
