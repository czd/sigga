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

*Populated at the end of Phase C. Empty for now.*

---

## First step

Kick off Phase A by dispatching `UX Researcher` (primary, owns the matrix) and `Accessibility Auditor` (parallel, WCAG lens) with this plan as input. Both run concurrently; their findings merge into one file: `docs/superpowers/audits/2026-04-19-ux-inventory.md`. Nic reviews; then we move to Phase B. Do not start code changes before Phase B's rulebook is signed off — speculative fixes now will get redone once the rulebook lands.
