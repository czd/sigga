# Site-wide UX Alignment Plan

> **For agentic workers:** This is a multi-phase audit → decide → remediate plan. Phase A produces findings; Phases B–D are gated on those findings. Do not skip ahead to Phase D by picking off individual inconsistencies — the whole point is to align on canonical patterns first, so we don't thrash.

**Goal:** Audit the shipped Sigga app end-to-end, decide on a canonical pattern for each repeated interaction (edit, destroy, confirm, empty-state, headline, sheet, toast, tap-target, list-detail vs full-page), then execute a prioritized remediation pass so the whole site reads as one cohesive product rather than a stack of features added one by one.

**Why now:** Over ~2 weeks we've shipped Phases 0–12 + 8.5 + analytics + admin + desktop command-post + nav redesign + Gögn rename + calendar polish. Patterns were added incrementally. Concrete inconsistencies the user has already called out or the harness has logged:

- **Edit affordance:** some cards expose an inline pencil icon; others open detail on tap and expose edit from within; others use a kebab menu or sheet; no single rule.
- **Tap-target floor violations:** `EntitlementList.tsx` filter chips `h-10` (40 px) and claim CTA `min-h-11` (44 px) — both below the 48 px project minimum. CLAUDE.md was tightened to explicitly name chips/CTAs, but the existing violations still need fixing.
- **Hardcoded English in shadcn primitives:** `src/components/ui/dialog.tsx` and `sheet.tsx` render `sr-only` "Close" labels that bypass i18n. QA now greps for these, but the actual primitive needs a locale-safe fix.
- **Unused toast keys:** `recurring.pauseToast` / `recurring.resumeToast` exist in both locales but no component fires them. Symptom of a broader question: do we use toasts at all, and if so, when?
- **Desktop vs mobile detail pattern split:** some surfaces use list-detail at `md:`, others full-page swap, others bottom-sheet — the md/xl rules are inconsistent.

The primary audience — 60+ Icelandic women migrating from Messenger — benefits from strict consistency more than tech-fluent users do. Varied affordances force them to relearn each screen. Aligning now (before more features land) is cheaper than after.

**Tech stack (unchanged):** Next.js 16 · React 19 · Tailwind v4 (no config, tokens in `globals.css` `@theme inline`) · shadcn/ui · Convex · `next-intl` · Bun · Biome. No new dependencies should be introduced by this plan.

**Source docs:** `docs/spec.md` (design principles §), `CLAUDE.md` (UX conventions), this plan. The Bókasafn palette, typography scale, radii, and soft-divider rules are hard constraints; alignment work refines how they're *used*, not what they are.

---

## Scope

**In scope:**

- The five authenticated top-level routes: `/` (Í dag), `/umonnun` (Dagbók + Lyf), `/timar` (Tímar + `/timar/reglulegir`), `/folk` (Fólk), `/pappirar` (Gögn: Réttindi + Skjöl).
- The `/login` route (public, single-screen).
- Shared primitives: `Header`, `BottomNav`, `Sidebar`, `AppointmentForm`, `DocumentUpload`, `SeriesCard`, dialog/sheet/card/button/input.
- Breakpoints: mobile `<768 px`, tablet `md:` 768–1279 px, desktop `xl:` ≥1280 px.

**Out of scope (v1, don't widen here):**

- Medication check-off, push notifications, Google Calendar sync, AI log summaries, multi-patient, full offline CRUD — these are v2 features listed in CLAUDE.md and explicitly deferred.
- Palette/typography changes (refinement only — no new tokens).
- Route-shape changes (renames OK via translation; URL structure stays).
- Content rewrites beyond what alignment requires (e.g. standardising empty-state tone — yes; rewriting seed data — no).

---

## Phase A — Audit (produce findings)

**Objective:** Produce a single document listing every repeated interaction in the app and how each view currently handles it, so we can see the inconsistencies in one table.

**Primary worker:** `UX Researcher` agent owns the audit and produces the matrix. `Accessibility Auditor` runs a parallel WCAG-focused pass whose findings fold into pattern #18. Both agents role-play the actual audience — a 60+ Icelandic woman migrating from Messenger — rather than a tech-fluent reviewer.

**Inputs:**

- Current working tree.
- `docs/spec.md` design principles section and per-view sections.
- `CLAUDE.md` conventions section.
- Harness queue `.claude/harness-improvements.md` (for already-logged inconsistencies).

**Deliverable:** `docs/superpowers/audits/2026-04-19-ux-inventory.md` — a matrix. Rows = interaction patterns. Columns = the five routes + any sub-surface (e.g. `/timar/reglulegir`, `/pappirar?tab=skjol`). Each cell names what's there today with a short descriptor + file:line pointer.

**Interaction patterns to audit (starting set — the audit team should add any they spot):**

1. **Edit affordance.** How does a user start editing a log entry, an appointment, a recurring series, a contact, an entitlement, a document's metadata, a medication?
2. **Destroy affordance.** How does a user delete any of those? Confirmation mechanism, wording, button tone.
2b. **Commitment confirmation** (distinct from destroy — same UX weight). Volunteering to drive, claiming an entitlement, assigning a driver to somebody else — any button that creates unwanted state on a misclick. Does every such action have a confirm gate? What's the canonical copy template?
3. **Create/new affordance.** FAB? Header button? Empty-state CTA? Bottom sheet trigger? Position.
4. **Form container.** `Sheet` (bottom sheet mobile / centered modal desktop) vs `Dialog` vs inline expansion. Primary-CTA position (top-right header vs bottom-anchored footer). Cancel button placement and label. Validation-error placement and style.
5. **Empty state.** Text tone, icon usage, secondary-CTA presence. The Bókasafn principle is warm/reassuring — check every empty state conforms.
6. **Headline style.** `font-serif` size, weight, spacing. Check per-view headline sizes — they should scale consistently.
7. **Tap targets.** Every interactive control ≥48 px per CLAUDE.md. Chips, inline CTAs, kebab buttons, avatar triggers — measure each.
8. **List-detail responsive behaviour.** At `md:` and `xl:`, do we show list-detail, stacked, or full-page swap? Which surfaces use which?
9. **Date/time formatting.** Relative ("2 klst.") vs absolute ("14. apr. kl. 10:00"). When is each used? Is the rule articulated?
10. **Actor attribution.** "{name} gerði X" — where is the actor surfaced, where is it omitted? (Activity feed has it; confirm elsewhere.)
11. **Toast feedback.** Do we use toasts? Where? What for? Why do `pauseToast`/`resumeToast` keys exist with no consumer?
12. **Loading state.** "Hleð…" text vs skeleton vs spinner vs nothing — per surface.
13. **Error state.** `ConvexError` surfacing — inline under form, toast, dialog, silent-log? Per-surface pattern.
14. **Optimistic UI.** Where do we optimistically update (driver assignment, status change)? Where do we wait for round-trip?
15. **Phone/tel affordance.** CLAUDE.md says tel links are the most-used feature. Verify every phone number everywhere is tappable.
16. **Color semantics.** Sage = calm/assigned; amber = needs attention; sage-deep = selected. Is that applied consistently, or does sage also mean "selected" elsewhere, or amber mean "warning" elsewhere?
17. **i18n coverage.** Any hardcoded user-facing strings that slipped through.
18. **Accessibility.** `aria-label` on icon-only buttons, `aria-current` on nav, focus rings, keyboard-reachable dialogs, screen-reader labels.

**Exit gate for Phase A:** The matrix is complete for every in-scope surface, and each cell has enough detail that a remediation step can be written from it without re-reading source.

---

## Phase B — Define canonical patterns (decide)

**Objective:** Turn the matrix into a short rulebook. For each interaction pattern in Phase A, pick the canonical answer and write it as a rule that a future contributor can follow without ambiguity.

**Primary worker:** `UX Architect` agent, drafting; Nic approves.

**Deliverable:** `docs/ux-patterns.md` — one-page-per-pattern document. Each section: **Pattern name** → **Canonical answer** → **When it applies** → **Counter-examples / when NOT to use** → **Code recipe** (component import + minimum props + accessibility requirements). Cross-linked from CLAUDE.md.

**Constraints on the decisions:**

- **Single canonical pattern per interaction.** No "well, sometimes X and sometimes Y." If a surface truly needs a different pattern, document the specific exemption with its rationale.
- **Audience first.** When in doubt, favor the pattern with fewer moving parts and more obvious affordance. Pencil icons ARE a discoverable affordance if used consistently; card-tap-to-edit is ALSO fine but must be used everywhere if chosen. Pick one.
- **Mobile is the source of truth.** Desktop adapts mobile; not the other way around.
- **Icelandic tone consistency.** Warm, direct, no jargon. Established seed phrasings ("Allt í höfn", "Hleð…", "Enginn eigandi") are the template for new copy.
- **No new tokens.** Use the existing Bókasafn palette and type scale; if a decision seems to need a new color or size, stop and re-examine.

**Exit gate for Phase B:** Nic has signed off on `docs/ux-patterns.md`. CLAUDE.md links to it from the Conventions section.

---

## Phase C — Remediation queue (prioritize)

**Objective:** Translate the gap between Phase A's matrix and Phase B's rulebook into an ordered backlog of concrete code changes.

**Primary worker:** Main agent, drafting; Nic approves order.

**Deliverable:** A list of remediation tasks appended to this plan under `## Remediation backlog` (below). Each task names its pattern, affected files, canonical answer it's enforcing, estimated size (S/M/L), and any dependencies (e.g. "waits on dialog/sheet primitive i18n fix").

**Prioritization criteria (in order):**

1. **Accessibility violations** (missing `aria-*`, untranslated screen-reader strings, undersized tap targets) — before anything else.
2. **Copy/tone inconsistencies** that affect comprehension for the 60+ audience.
3. **Primary-journey affordance mismatches** — the interactions a user does many times a day (opening an appointment, writing a log entry, calling a contact).
4. **Secondary affordances** (editing a recurring series, reassigning a driver, changing an entitlement status).
5. **Visual/token drift** (off-palette colors, inconsistent radii, shadow usage).
6. **Polish** (hover states, micro-animations, empty-state illustrations).

Within each tier, prefer tasks that can be done without waiting on primitive fixes.

**Exit gate for Phase C:** The backlog is ordered, each task has a clear exit criterion, and Nic has approved tackling them in that order.

---

## Phase D — Execute in slices (remediate)

**Objective:** Work the backlog, one coherent slice per PR. A slice = all the changes needed to make a single pattern canonical across the whole app (not one per file).

**Primary worker:** Standard implementation loop. Every slice uses `superpowers:test-driven-development` when testable, `superpowers:verification-before-completion` always, and the project's `qa` agent before every commit.

**Per-slice workflow:**

1. Pick the top unblocked task from the backlog.
2. Make the change everywhere the pattern applies — do not leave half the app on the old pattern and half on the new. Visual schizophrenia is worse than either pattern alone.
3. Add a brief note to `docs/ux-patterns.md` if the execution revealed an edge case worth documenting.
4. QA gate → commit → push → merge → mark the backlog task done.
5. Return to step 1.

**Stopping condition:** Either the backlog is empty, or Nic decides the remaining items are not worth the churn and closes them explicitly.

---

## Deliverables summary

| Phase | Deliverable | Location |
| --- | --- | --- |
| A | UX inventory matrix | `docs/superpowers/audits/2026-04-19-ux-inventory.md` |
| B | Canonical patterns rulebook | `docs/ux-patterns.md` (cross-linked from CLAUDE.md) |
| C | Ordered remediation backlog | `## Remediation backlog` section appended to this plan |
| D | Merged PRs, each a cohesive slice | `main` |

Any learning from Phase D that changes a canonical answer gets back-ported to `docs/ux-patterns.md` so the rulebook stays the source of truth.

---

## Suspected inconsistencies (seed list — audit confirms or refutes)

*These are already suspected from user observation, QA logs, or the harness queue. The audit should verify each, expand where relevant, and add what it finds. This list is not the audit — it is input to the audit.*

- **Edit affordance split**: pencil icon vs card-tap vs kebab vs sheet.
- **Destroy affordance split**: inline delete vs confirm dialog vs long-press. Destructive button tone.
- **Commitment-action confirmation missing on 5 of 6 surfaces**: "Ég skutla" / "Ég get skutlað" / driver-assignment dropdown / week-grid drag-to-assign all commit instantly with no confirm. Family members have repeatedly assigned themselves as drivers by accident. The one surface that *does* confirm — `entitlements.claim` — is the template. (Seeded from user report 2026-04-19; see Pattern 19 in the inventory matrix.)
- **Tap-target floor**: `EntitlementList.tsx` chips (`h-10`, 40 px) and claim CTA (`min-h-11`, 44 px) are below 48 px.
- **Hardcoded English in primitives**: `dialog.tsx` / `sheet.tsx` `sr-only` "Close" labels bypass i18n.
- **Unused toast keys**: `recurring.pauseToast` / `recurring.resumeToast` defined but not fired — signals a missing site-wide toast decision.
- **Form-container split**: Sheet vs Dialog; CTA-in-header vs CTA-in-footer; Cancel-top-left vs Cancel-bottom-right.
- **List-detail vs full-page on `md:` and `xl:`**: Tímar uses week-grid + detail pane; Fólk uses list-detail; `/pappirar?tab=skjol` uses list-detail; `/pappirar?tab=rettindi` uses kanban. Is there a rule, or is each view one-off?
- **Headline sizes**: `font-serif text-[1.4rem]` in dashboard; other views use different sizes — check consistency.
- **Date format split**: relative ("2 klst.") in activity feed; absolute ("14. apr. kl. 10:00") on appointment cards. Define when each applies.
- **Actor attribution**: the activity-feed sentence now includes `{name}` thanks to today's fix; check whether per-row actor visibility exists elsewhere (log entries, documents, entitlements, appointments) and whether the pattern matches.
- **Color semantics audit**: sage = assigned/calm; amber = needs attention; sage-deep = selected. Spot-check every use of these colors to confirm they mean the same thing everywhere.
- **Empty-state tone**: "Engin réttindi enn.", "Skjalasafnið er tómt.", "Ekkert nýtt frá síðustu heimsókn." — all share a warm direct tone; check that every empty state in the app does too, and that none regressed to "No data" or similar.
- **Phone `tel:` coverage**: CLAUDE.md says this is the most-used feature — verify every phone-number display in the app is tappable.

---

## Remediation backlog

*Drafted 2026-04-19 from the signed-off rulebook (`docs/ux-patterns.md`) + Phase A audit findings. Organised into three tiers; within each tier, tasks are ordered by the plan's prioritisation criteria. Sizes: **S** = ≤1 day, **M** = 1–3 days, **L** = 3+ days (likely a small sub-plan of its own). Each task is one PR = one cohesive slice. **Pattern N** refs point to `docs/ux-patterns.md`.*

### Tier 1 — Blockers and systemic root-cause fixes

Do these first. Token-level fixes cascade through the whole app, so later tasks assume they've landed.

**C1. Fix MedicationForm 20 px checkbox.** Pattern 7, 18 · a11y **blocker** (fails WCAG 2.5.8 24 px minimum).
- *Files:* `src/components/info/MedicationForm.tsx` (native `<input type="checkbox">`).
- *Exit:* Replace with shadcn `<Checkbox>` sized to ≥48×48 tap area (label + control). A11y audit item cleared.
- *Size:* S · *Deps:* none.

**C2. Repoint `--muted-foreground` token and sweep text-bearing usage.** Pattern 7, 18 · a11y systemic #1 (2.87:1 → 5.97:1).
- *Files:* `src/app/globals.css` (token definition), ~30 `text-ink-faint` call sites across dashboard/timar/umonnun/folk/pappirar.
- *Exit:* `--muted-foreground` points to `ink-soft`; every `text-ink-faint` used as body or meta text swapped to `text-ink-soft`; decorative-only icon tints may stay. Spot-measure contrast on three sample views at 375 px.
- *Size:* M · *Deps:* none.

**C3. Fix `--input` border + `focus-visible:ring-ring/50`.** Pattern 18 · a11y systemic #2 (form boundaries + focus rings invisible).
- *Files:* `src/app/globals.css` input/ring tokens; `src/components/ui/button.tsx` + `src/components/ui/input.tsx` default variants.
- *Exit:* Form boundaries ≥3:1 against paper; focus rings at full alpha, never `/50`; keyboard navigation leaves an obvious trail on every interactive control.
- *Size:* S · *Deps:* none.

**C4. Deprecate sub-48 px shadcn button variants + fix dialog/sheet close X.** Pattern 7, 18 · a11y systemic #3 (every dialog/sheet has a sub-floor control today).
- *Files:* `src/components/ui/button.tsx` (re-size or remove `xs`/`sm`/`default`/`icon-sm`); `src/components/ui/dialog.tsx:74`, `src/components/ui/sheet.tsx:75` (`icon-sm` → `touch-icon`); 10+ call-site changes.
- *Exit:* No shadcn button variant under 48 px remains in the codebase. QA grep for `size="sm"` or `size="icon-sm"` returns zero.
- *Size:* L · *Deps:* none — but batch with C2/C3 since they share primitives.

**C5. Localise primitive sr-only labels.** Pattern 17, 18.
- *Files:* `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`.
- *Exit:* `DialogContent` / `SheetContent` read `tCommon("close")` = "Loka"; no English sr-only string in `src/components/ui/`. QA grep clean.
- *Size:* S · *Deps:* none.

### Tier 2 — Core pattern alignment

The substance of the initiative. **C6 introduces the `<ConfirmDialog>` primitive — several later tasks depend on it.**

**C6. Introduce `<ConfirmDialog>` primitive.** Pattern 2, 19.
- *Files:* `src/components/ui/confirm-dialog.tsx` (new).
- *Exit:* One component accepting `{title, body, confirmLabel, confirmVariant, onConfirm, onCancel}` encapsulates the destroy and commitment dialog layouts per rulebook Pattern 2 & 19. All existing destroy + claim dialogs migrate to use it in subsequent tasks.
- *Size:* M · *Deps:* C4 (close X fixed).

**C7. Add commitment confirmation to every volunteer/assign surface.** Pattern 19 — **addresses user-reported pain (accidental self-assignment).**
- *Files:* `src/components/dashboard/DrivingCta.tsx`, `src/components/dashboard/NextAppointments.tsx`, `src/components/appointments/AppointmentCard.tsx`, `src/components/timar/TimarDetail.tsx` driver `Select`. Week-grid drag-to-assign (`src/components/timar/WeekGrid.tsx:208-237`) is exempt per rulebook.
- *Exit:* 4 of 5 instant-commit surfaces route through `<ConfirmDialog>`; new `driving.confirm.{title,body,action,assignOtherTitle,assignOtherAction}` keys in both locales with feminine-first copy; no `try/finally` error-swallowing (errors surface per Pattern 13).
- *Size:* M · *Deps:* C6.

**C8. Remove Tímar desktop cancel-without-confirm bypass.** Pattern 2 — **single highest-risk UX finding (one misclick = cancelled appointment).**
- *Files:* `src/components/timar/TimarDetail.tsx:170-181`.
- *Exit:* Cancel button routes through `<ConfirmDialog>` with `variant="destructive"` and the standard destroy copy template; keyboard-reachable; Escape dismisses (fixes the related cross-cutting observation).
- *Size:* S · *Deps:* C6.

**C9. Unify destroy confirm copy.** Pattern 2.
- *Files:* `messages/{is,en}.json` (new keys `common.deleteConfirm.{title,body}` + per-subject override keys), plus per-subject consumers.
- *Exit:* Two canonical templates per rulebook: "standard destroy" (Ertu viss? Þetta er ekki hægt að afturkalla.) and "destroy-with-context" (subject-specific body). Skjöl's stronger copy moves to the context template.
- *Size:* S · *Deps:* C6.

**C10. Feminine-first Icelandic sweep.** Pattern 17.
- *Files:* `messages/is.json` (`rettindi.claim.confirmBody` and any other `skráð(ur)` / `viss(ur)` / parenthetical gender patterns).
- *Exit:* No parenthetical gender forms remain; English mirror untouched.
- *Size:* S · *Deps:* none.

**C11. Curly-quote sweep.** Pattern 17.
- *Files:* `messages/is.json` `entitlements.claim.confirmBody` (currently `\"{title}\"` straight — breaks ICU in principle, reads inconsistent with `activity.entitlementStatus` which uses `„…"`).
- *Exit:* All confirm/prompt copy uses Icelandic curly quotes; grep for `\\\"` in is.json returns only non-interpolated literal contexts.
- *Size:* S · *Deps:* none.

**C12. Unify edit affordance to tap-card-opens-detail.** Pattern 1.
- *Files:* list components with pencil-in-corner: `src/components/info/ContactList.tsx`, `src/components/info/EntitlementList.tsx`, `src/components/info/MedicationTable.tsx`, `src/components/info/DocumentList.tsx`, `src/components/appointments/AppointmentCard.tsx` (where edit icons appear today). Kanban cards keep their own treatment.
- *Exit:* Every list row opens detail on tap; edit lives inside the detail/sheet; no pencil-icon-in-corner on cards. Contact row's 3-target layout collapses to one tap target.
- *Size:* L · *Deps:* C4 (touch targets), C6 (ConfirmDialog for destroy inside detail).

**C13. Unify create affordance.** Pattern 3.
- *Files:* `src/components/timar/CalendarView.tsx` (drop `size="sm"` toolbar button), `src/components/info/ContactList.tsx` (replace `size-10` + button), `src/components/info/EntitlementKanban.tsx` (enlarge `size-6` per-column +), plus any other non-canonical creates surfaced by the matrix.
- *Exit:* Every "add X" uses the full-width touch button at a predictable position OR, for kanban, uses per-column adds at ≥48 px. No `size="sm"` create button remains.
- *Size:* M · *Deps:* C4.

**C14. Finish list-detail responsive pattern uniformly.** Pattern 8.
- *Files:* any route not yet on `PaneLayout` + `?id=` URL param at `md:`. Resolve the DocumentList/DocumentDetail duplication (two separate detail implementations) by consolidating to one.
- *Exit:* Mobile = full-page routes with back; desktop `md:` = list-detail via `PaneLayout`; kanban stays as the Réttindi-only third pattern. Single DocumentDetail component used for both mobile sheet and desktop pane.
- *Size:* M · *Deps:* C12.

### Tier 3 — Polish and consolidation

Visual and semantic tightening once the primitives and affordances are canonical.

**C15. Heading hierarchy: one `<h1>` per page + skip-link.** Pattern 6, 18 · a11y major.
- *Files:* `src/app/[locale]/(app)/layout.tsx` (skip-link); every route page head.
- *Exit:* Lighthouse/axe reports exactly one `<h1>` per page; Tab from page load reaches the skip-link first; skip-link jumps to `<main>`.
- *Size:* S · *Deps:* none.

**C16. Consolidate headline scale.** Pattern 6.
- *Files:* every route page head + EmptyState headlines.
- *Exit:* Two sizes — `text-[2.5rem]` for page `<h1>`, `text-[1.4rem]` for section `<h2>`. `text-balance` on both. Dashboard greeting scales down to match the other page heads.
- *Size:* S · *Deps:* C15.

**C17. Empty-state restyle to Bókasafn surface.** Pattern 5.
- *Files:* `src/components/shared/EmptyState.tsx`.
- *Exit:* `bg-paper ring-1 ring-foreground/10` replaces `bg-muted/40 border-dashed`. All consumers render the new surface without further per-caller changes.
- *Size:* S · *Deps:* none.

**C18. Replace silent error swallowing with inline banners + live-region.** Pattern 11, 13 · a11y major.
- *Files:* `src/app/[locale]/(app)/layout.tsx` (polite live-region landmark); mutation-call sites in DrivingCta/NextAppointments/AppointmentCard, dnd-kit drag handlers (`WeekGrid.tsx:208-237`, `EntitlementKanban.tsx`), document delete paths. Delete the unused `recurring.pauseToast`/`resumeToast` keys.
- *Exit:* No `try/finally` that swallows mutation errors; every failure surfaces inline or via live-region; save/delete success announced through the live-region.
- *Size:* M · *Deps:* C7 (overlaps on DrivingCta).

**C19. Relative vs absolute date formatting consolidation.** Pattern 9.
- *Files:* activity feed (`SinceLastVisit`), appointment cards, dagbók entries, document list, entitlement cards.
- *Exit:* Relative for events within 7 days, absolute otherwise; every rendering calls `formatDate.ts` helpers. `<time>` wrappers + sr-only absolute per a11y audit.
- *Size:* S · *Deps:* C15/C16 if they revise heading structure nearby.

**C20. Colour-semantics audit + inline-hex purge.** Pattern 16.
- *Files:* `src/components/dashboard/AttentionCard.tsx`, `src/components/dashboard/DrivingCta.tsx` (inline hex), any other surface where sage/amber/sage-deep usage doesn't match the rulebook's semantic meaning.
- *Exit:* No inline hex remains; every sage/amber usage is semantically correct (sage = handled, amber = needs attention, sage-deep = selected). Spot-check BRÝNT pill contrast on real entitlement data.
- *Size:* M · *Deps:* C2 (token-level contrast may already cascade).

**C21. Loading-state standardisation.** Pattern 12.
- *Files:* any surface using spinners or skeletons.
- *Exit:* "Hleð…" text only; no spinners below 1 s round-trips; no skeletons.
- *Size:* S · *Deps:* none.

**C22. Actor-attribution sweep.** Pattern 10.
- *Files:* any log-event rendering not already subject-first (`SinceLastVisit.appointment` still omits actor per rulebook).
- *Exit:* Every actor-relevant event row reads "{name} verb …" subject-first; new `appointment` key adds actor per rulebook.
- *Size:* S · *Deps:* none.

**C23. Hoist author/date semantics to proper headings + time elements.** Pattern 6, 18 · a11y minor.
- *Files:* Dagbók entry author `<div>`s that should be `<h3>`; timestamp `<div>`s that should be `<time>`; reduced-motion respected on Sheet/Dialog animations.
- *Exit:* Axe reports no heading-hierarchy or semantic-role issues on Dagbók; reduced-motion honoured in primitives.
- *Size:* S · *Deps:* C15 (establishes h1 baseline).

---

### Suggested execution order

One PR per task, in this sequence:

`C1 → C2 → C3 → C4 → C5` (Tier 1, can partly parallelise)
`→ C6` (primitive)
`→ C7 · C8 · C9` (confirm-dialog consumers, parallelisable)
`→ C10 · C11` (copy sweeps, parallelisable)
`→ C12 → C13 → C14` (affordances and list-detail)
`→ C15 → C16 → C17 → C18 → C19 → C20 → C21 → C22 → C23` (polish)

Expected total effort: ~3–5 weeks of focused work if sequential; ~2 weeks if C-tier items parallelise where their deps allow.

**Exit gate for Phase C (per plan):** Nic approves this ordered backlog. Phase D execution begins with C1.

---

## First step

Kick off Phase A by dispatching `UX Researcher` (primary, owns the matrix) and `Accessibility Auditor` (parallel, WCAG lens) with this plan as input. Both run concurrently; their findings merge into one file: `docs/superpowers/audits/2026-04-19-ux-inventory.md`. Nic reviews; then we move to Phase B. Do not start code changes before Phase B's rulebook is signed off — speculative fixes now will get redone once the rulebook lands.
