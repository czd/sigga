# Harness Improvements Queue

A log of observations about the Claude Code harness for this project — rules, agent prompts, slash commands, hooks, and the docs that support them. The `harness-auditor` agent consumes this file and decides how to resolve each open item (update CLAUDE.md, tighten an agent, add a hook, update docs, or mark as won't-fix).

## Who appends here

- **qa** — when it finds a convention followed in code but not documented, a check that should be automated, or a pattern worth catching next time.
- **docs-sync** — when a doc section is vague enough that drift is inevitable, or when a convention should be lifted into CLAUDE.md.
- **Main agent (Claude)** — when the user corrects my approach mid-session. Log it so the auditor can decide whether the rules or docs allowed the mistake.
- **Nic** — anything you want me to reconsider.

## Format

```markdown
### {YYYY-MM-DD} · {source} · {one-line summary}

**Context:** {what was happening}
**Observation:** {the gap / pattern / correction}
**Suggested action:** {optional — what the reporter thinks should change}
```

`source` is one of: `qa`, `docs-sync`, `user-correction`, `manual`.

## Auditor workflow

When the auditor processes an item, it moves the entry from `## Open Items` to `## Resolved`, adding a `**Resolution:**` line with the date, classification (rule/agent/command/hook/docs/won't-fix), and link to the change.

---

## Open Items

_(empty — all items processed in 2026-04-19 audit run)_

---

## Resolved

### 2026-04-19 · user-correction · Site-wide UX inconsistency — edit affordances and card-vs-detail patterns diverge across views

**Context:** User observed while reviewing the app that similar interactions are handled differently across views — e.g. some cards expose an inline pencil/edit icon, others require tapping the card itself to open detail, and the edit-sheet vs. inline-edit split is not consistent. The site has had rapid feature addition (Tímar, recurring series, analytics, admin gating, calendar polish, Dagbók, Réttindi, Skjöl, Símaskrá) with patterns added incrementally rather than audited holistically.
**Observation:** This is not a single missing rule — it's a systemic drift that needs a full-site audit + a canonicalization pass. Candidate inconsistencies to verify: (1) Edit affordance: pencil icon vs card-tap vs swipe vs kebab menu — which is canonical? (2) Destroy affordance: inline delete button vs confirm dialog vs long-press — canonical flow? (3) Empty-state copy tone and illustration style. (4) Headline style (font-serif size/weight) across Umönnun / Fólk / Gögn / Tímar. (5) Tap targets below 48px (already flagged in separate queue items for filter chips and claim CTA). (6) List-detail vs full-page-swap on mobile vs desktop. (7) Date formatting (relative vs absolute) across cards. (8) Form-sheet structure (Sheet vs Dialog, primary CTA position, Cancel placement, validation-error display).
**Resolution:** 2026-04-19 · docs · Classification: docs. Deferred to plan at `docs/superpowers/plans/2026-04-19-ux-alignment.md` — see plan for audit + remediation sequence. Root cause: rapid incremental feature addition with no holistic UX audit step. The plan IS the resolution vehicle; individual inconsistencies will be picked off there in sequence.

### 2026-04-19 · qa · spec.md describes 4-tab bottom nav and "Pappírar"; both are stale after this commit

**Context:** Reviewing the nav-redesign + Pappírar→Gögn rename commit. `docs/spec.md` references "4-tab bottom nav", Tímar as "not in bottom nav", and the label "Pappírar" in multiple places (file tree, nav table, view headers, seed data). The implementation now ships a 5-item mobile `MOBILE_ITEMS` array with Tímar included, and the label is "Gögn" in Icelandic / "Records" in English.
**Observation:** The spec is stale in at least: line 98 (BottomNav comment), lines 351/366 (messages seed), line 457 (4-tab description), line 548 (Tímar not in bottom nav), lines 613/623/657/682/713/715 (Pappírar view section and nav table). The user has explicitly deferred docs-sync to after this commit lands.
**Resolution:** 2026-04-19 · docs-sync · All of the above applied. Bottom nav table replaced with 5-item centre-home layout; "Pappírar" → "Gögn" in display-label contexts; View 3 Tímar updated; nav key namespace updated; `PRIMARY_ITEMS`/`MOBILE_ITEMS` split documented. Also added calendar visual language notes, `byRange` contract, `activity.ts` and `events.ts` contracts, `events.isAdmin` auth exception, `entitlements.claim`, Sentry stack entry, `nytjun` route, and `events` schema table.

### 2026-04-19 · docs-sync · `entitlements.claim` open item had wrong assertion — code DOES guard against owner overwrite

**Context:** The 2026-04-17 qa open item says `entitlements.claim` "does not guard against overwriting an existing `ownerId`". However, the actual code at `convex/entitlements.ts` lines 169-172 throws `ConvexError("Réttindi eru þegar í umsjón annars.")` when `existing.ownerId && existing.ownerId !== userId`. The guard exists and is correct.
**Resolution:** 2026-04-19 · won't-fix (already correct) · Guard verified present at lines 169-172 of `convex/entitlements.ts`. The spec was updated by docs-sync to document `claim` accurately. The 2026-04-17 `entitlements.claim` open item is closed — both its sub-items are resolved: the "no server-side guard" assertion was incorrect, and `docs-sync` added the missing spec documentation.

### 2026-04-19 · qa · `events.isAdmin` soft-returns `false` for unauthenticated callers — CLAUDE.md policy says throw, but this is a deliberate exception like `users.me`

**Context:** Reviewing admin-gating commit for `/nytjun`. `events.isAdmin` calls `getAuthUserId` directly and returns `false` rather than throwing `ConvexError("Ekki innskráður")` for unauthenticated callers. This mirrors the documented `users.me` exception.
**Observation:** CLAUDE.md stated one documented exception (`users.me`). `events.isAdmin` is a second exception but was not documented as such.
**Resolution:** 2026-04-19 · rule · docs-sync added `events.isAdmin` to `docs/spec.md` and `docs/implementation-plan.md`. Harness-auditor updated `CLAUDE.md` Architecture Notes to name both soft-returning exceptions (`users.me` and `events.isAdmin`) and define the pattern: "soft-returning queries that gate UI display" are exempt from the throw rule; any new one must be explicitly listed in CLAUDE.md. Also tightened `.claude/agents/qa.md` Convex section to name both exceptions explicitly so future QA runs do not flag them as violations.

### 2026-04-18 · docs-sync · Nav/route architecture diverged substantially from the original plan with no intermediate docs update

**Context:** Full reconciliation sweep. The original plan described four bottom-nav tabs: Í dag / Dagbók / Tímar / Upplýsingar. The shipped app has: Í dag / Umönnun / Fólk / Pappírar (later Gögn). This drift accumulated across multiple commits.
**Observation:** Large intentional design pivot happened without an intermediate docs-sync. The nav is a high-impact piece of the architecture and stale docs here are especially confusing.
**Resolution:** 2026-04-19 · rule · Added a "Route or nav changes require immediate docs-sync" bullet to the Conventions section of `CLAUDE.md`: when a phase renames a route, adds a tab, removes a bottom-nav item, or restructures the routing hierarchy, `docs-sync` must be invoked before or immediately after the commit — not deferred. Root cause: no written convention said nav changes were high-priority for docs-sync invocation.

### 2026-04-18 · docs-sync · `recurring.pauseToast` / `recurring.resumeToast` i18n keys exist but are not consumed

**Context:** Phase 8.5 recurring appointments. `messages/is.json` and `messages/en.json` both defined `recurring.pauseToast` and `recurring.resumeToast`, but no UI component used them.
**Resolution:** 2026-04-18 · code · Orphan keys removed from both `messages/is.json` and `messages/en.json` in the Phase 8 polish commit. No toast is planned for v1. The error state in `SeriesCard` (inline `<p role="alert">`) covers the failure-feedback gap instead. No harness rule needed.

### 2026-04-17 · qa · `appointments.past` query skips auth check, inconsistent with `users.list`

**Context:** Phase 7 QA. The new `appointments.past` query did not call `requireAuth`, while `users.list` did. Other read queries in `appointments.ts` also skipped auth at the time of the report. No documented policy existed for whether queries must check auth.
**Resolution:** 2026-04-19 · rule · Policy resolved: all data-returning queries call `requireAuth` (policy (a)). Verified — every Convex module (`appointments.ts`, `contacts.ts`, `documents.ts`, `entitlements.ts`, `logEntries.ts`, `medications.ts`, `recurringSeries.ts`, `users.ts`, `events.ts`, `activity.ts`) now has `requireAuth` on all queries. CLAUDE.md already states "Every mutation AND every data-returning query calls `requireAuth(ctx)`". Root cause was a missing policy at time of report; the policy was set and code was hardened in a subsequent commit. No further harness change needed beyond the `events.isAdmin` exception documentation handled above.

### 2026-04-17 · qa · `dialog.tsx` sr-only "Close" label should source from translations (medium-term)

**Context:** Phase 6 QA flagged `dialog.tsx` line 77 (`<span className="sr-only">Close</span>`). The short-term fix (`showCloseButton={false}` on confirm dialogs) is already applied. The underlying issue — any future `DialogContent` with `showCloseButton={true}` will render English to screen readers — remains.
**Resolution:** 2026-04-19 · code-fix-route + agent · The long-term code fix (threading `useTranslations("common")` into `dialog.tsx` / `sheet.tsx`) is routed to the UX-alignment plan at `docs/superpowers/plans/2026-04-19-ux-alignment.md`. Harness-auditor added a grep check to `.claude/agents/qa.md` i18n section: for any diff touching `src/components/ui/`, run `rg 'className="sr-only">(Close|Submit|Cancel|OK|Open)<' src/components/ui/` — any English sr-only label in the primitives folder is a FAIL.

### 2026-04-17 · qa · Filter chips (`h-10`, 40px) and claim CTA (`min-h-11`, 44px) are below the 48px minimum tap-target rule

**Context:** Phase 7-8 UI redesign — `EntitlementList.tsx` filter chips use `h-10` (40px) and the claim CTA uses `min-h-11` (44px), both below the 48px project minimum. This is a recurring pattern.
**Resolution:** 2026-04-19 · rule + code-fix-route · (1) Added explicit language to the CLAUDE.md Stack section: "48px min tap targets … this floor applies to all interactive elements, including filter chips and inline CTAs; use `min-h-12` + `px-4` for pill-shaped chips, not `h-10` or `min-h-11`." (2) The specific `EntitlementList.tsx` code violations are routed to the UX-alignment plan for remediation. Root cause: tap-target rule was stated for primary buttons but did not call out compact/decorative controls explicitly.

### 2026-04-17 · qa · QA gate should catch use of deprecated Convex cron helpers (`crons.daily`, `crons.hourly`, `crons.weekly`)

**Context:** A fix swapped deprecated `crons.daily` for `crons.cron`; the violation was caught by a human reading guidelines, not by any automated check. Code fix was in commit 58856bc.
**Resolution:** 2026-04-19 · agent · Added a "Deprecated cron helpers" bullet to the Convex conventions section of `.claude/agents/qa.md`: `rg "crons\.(daily|hourly|weekly)\(" convex/` — any match is a FAIL. Root cause: no grep check existed for deprecated helpers that compile cleanly but behave differently at runtime.

### 2026-04-17 · qa · `entitlements.claim` mutation not documented in spec; allows owner overwrite

**Context:** Phase 7-8 UI redesign adds `convex/entitlements.claim` — a new mutation not listed in `docs/spec.md`'s `entitlements.ts:` function contract table.
**Observation:** (1) `claim` was undocumented in spec. (2) A later docs-sync correction note (2026-04-19) confirmed the server-side guard does in fact exist at lines 169-172.
**Resolution:** 2026-04-19 · docs + won't-fix (guard already present) · `docs-sync` added `claim` to the entitlements function contract in `docs/spec.md` with accurate guard documentation. The "allows owner overwrite" assertion was incorrect — the guard was already present. Both sub-items closed.

### 2026-04-17 · qa · `ensureNextOccurrence` algorithm diverges from spec — blocked-slot walk not documented

**Context:** Phase 7-8 fix pass — skip-occurrence feature.
**Resolution:** 2026-04-18 · docs-sync · Updated `ensureNextOccurrence` algorithm description in `docs/spec.md` to describe the slot-by-slot walk with 14-iteration cap and `blockedStartTimes` set. Also updated the `appointments.upcoming` function contract to document the `includeCancelled: boolean` variant.

### 2026-04-17 · qa · `--color-divider` / `--color-divider-strong` missing from `@theme inline` block — `border-divider` class may silently no-op in Tailwind v4

**Context:** AppointmentCard refactor QA. The new code uses `border-divider`, which requires `--color-divider` to exist in the `@theme inline` block in `globals.css`. That token is absent; `--divider` is defined in `:root` and aliased to `--border` via `--color-border`, but no standalone `--color-divider` Tailwind alias exists.
**Observation:** `border-divider` is already used in ContactList, MedicationTable, DocumentList, EntitlementList (6+ usages). Either Tailwind v4 is silently dropping those classes (invisible bug — the border just doesn't appear) or there is a fallback mechanism not obvious from the CSS. The fact that the app visually renders suggests a fallback, but the missing alias is a latent risk.
**Suggested action:** Add `--color-divider: var(--divider)` and `--color-divider-strong: var(--divider-strong)` to the `@theme inline` block in `src/app/globals.css` to make the Tailwind utility classes explicit and guaranteed. Then verify the `border-divider` visual renders in a browser. This is a code fix for the implementer, not a harness rule change.
**Resolution:** 2026-04-18 · code · Fixed in commit c80a800 (`ui(theme): register --color-divider tokens so border-divider class resolves`). Both `--color-divider` and `--color-divider-strong` are now registered in the `@theme inline` block in `src/app/globals.css`.

### 2026-04-17 · docs-sync · `docs/spec.md` project structure tree is stale — missing Phase 9–12 components and `(app)` route group

**Context:** Phases 9–12 docs reconciliation. The project structure tree in `docs/spec.md` was written during initial planning and is missing `(app)` route group, `UpplysingarTabs.tsx`, `AppointmentCard.tsx`, `formatDate.ts`, `tabs.tsx`.
**Resolution:** 2026-04-17 · docs · Pure docs item. Routed to the next `docs-sync` run. No harness rule needed — the tree's staleness is a docs maintenance task, not a gap in agent behavior. The `(app)` route group is now noted in the Architecture Notes routing bullet in `CLAUDE.md` as the parent of authenticated routes.

### 2026-04-17 · qa · `docs/spec.md` proxy matcher example excludes `api`, but `/api/auth` must pass through Convex Auth middleware

**Context:** The old matcher `"/((?!api|...)"` excluded `api`, breaking Convex Auth's `POST /api/auth` sign-in flow.
**Resolution:** 2026-04-17 · rule + agent · (a) Added "Do not exclude `api` from the proxy matcher" with correct matcher and failure-mode fingerprint to the Next.js 16 bullet in `CLAUDE.md`. (b) Added a matching check to the Next.js 16 section of `.claude/agents/qa.md` ("Flag any proxy matcher that excludes `api`"). (c) Docs part (updating `docs/spec.md` proxy.ts example) routed to next `docs-sync` run.

### 2026-04-17 · qa · `@vercel/analytics` dependency added but not listed in `docs/spec.md` stack

**Context:** `@vercel/analytics@^2.0.1` shipped in `layout.tsx` without spec documentation.
**Resolution:** 2026-04-17 · docs · Pure docs item, no harness rule needed. Routed to next `docs-sync` run to add a brief observability note to `docs/spec.md` and the relevant phase in `docs/implementation-plan.md`. Privacy posture (page views only, no PII per Vercel docs) should be confirmed by Nic in that pass.

### 2026-04-17 · qa · shadcn scaffold UI components contain hardcoded English strings

**Context:** `dialog.tsx` and `sheet.tsx` installed via `bunx shadcn@latest add` contain hardcoded "Close" sr-only strings.
**Resolution:** 2026-04-17 · agent · Added a post-install sr-only string audit step to the i18n check section of `.claude/agents/qa.md`: "After any `bunx shadcn@latest add <component>` install, grep new files for hardcoded user-facing strings, especially `sr-only` close/dismiss labels, and replace with `tCommon('close')`." Root cause: the QA i18n check had no explicit mention of shadcn post-install hygiene.

### 2026-04-17 · qa · Icon-only edit button in LogFeed uses `size="icon-lg"` (36px), below 48px tap-target minimum

**Context:** `LogFeed.tsx:111` used `size="icon-lg"` (36px).
**Resolution:** 2026-04-17 · won't-fix (already done) · Verified current code at line 111 uses `size="touch-icon"` with `-my-1 -mr-1` margins — exactly the suggested fix. The code issue was corrected before this audit run. No harness change needed.

### 2026-04-17 · qa · `users.ts` requireAuth throws `new Error` instead of `ConvexError` on queries

**Context:** QA reported `convex/users.ts` using `new Error` instead of `ConvexError` for auth failures.
**Resolution:** 2026-04-17 · agent · Current `users.ts` code no longer has the `requireAuth` helper (the bug no longer exists). However, the underlying policy gap is real: QA Convex check only mentioned mutations. Tightened `.claude/agents/qa.md` Convex section to: (a) cover auth checks on both queries and mutations, (b) explicitly state `ConvexError` must be used in both — never `new Error`. Root cause: CLAUDE.md's Architecture Notes only mentioned mutations; QA check mirrored that gap.

### 2026-04-17 · qa · Tab toggle buttons use `min-h-11` (44px), below the 48px tap-target minimum

**Context:** `AppointmentList.tsx` tab buttons had `min-h-11` (44px).
**Resolution:** 2026-04-17 · won't-fix (already done) · Verified current code uses `min-h-12` (48px) — the suggested fix is already applied. No harness change needed; the existing UX check in qa.md ("check classes like `h-12`, `h-14`, `min-h-[48px]`") already covers this.

### 2026-04-17 · qa · shadcn Dialog close button "Close" sr-only string now reachable via AppointmentForm

**Context:** `AppointmentForm.tsx` confirmation dialog exposed the hardcoded "Close" sr-only string.
**Resolution:** 2026-04-17 · code (already done) + open (medium-term) · Short-term: `AppointmentForm.tsx` already has `showCloseButton={false}` on the confirmation dialog (verified at line 298). Longer-term fix — making `dialog.tsx` locale-safe at the source — moved to Open Items as a scoped code task for the next applicable phase.

### 2026-04-17 · qa · `bg-emerald-100 text-emerald-800` uses bare Tailwind palette, not a project CSS token

**Context:** `EntitlementList.tsx` uses bare `emerald-100/800` for the `approved` badge; other statuses use CSS variable tokens.
**Resolution:** 2026-04-17 · won't-fix · Dark mode is not planned (not in spec, not in implementation plan). The emerald values are named explicitly in the implementation plan for this status. Without dark mode, bypassing the token layer for a single status badge is acceptable and creates no breakage risk. If dark mode is ever added to the scope, this should be revisited as a `--success` token addition.

### 2026-04-17 · qa · `useSearchParams` in client components forces dynamic rendering — no Suspense required in this project, but worth documenting

**Context:** `UpplysingarTabs.tsx` uses `useSearchParams` without `<Suspense>` and the build succeeded cleanly.
**Resolution:** 2026-04-17 · rule · Added a note to CLAUDE.md Architecture Notes: "`useSearchParams` in a client component is sufficient to opt a route into dynamic rendering (ƒ) — no `export const dynamic = 'force-dynamic'` or `<Suspense>` wrapper is required in this project's routing setup."

### 2026-04-17 · qa · `documents.abandonUpload` mutation added but not listed in `docs/spec.md` function contracts

**Context:** `convex/documents.ts` gained `abandonUpload` but it wasn't in the spec.
**Resolution:** 2026-04-17 · docs-sync · Added `abandonUpload` contract to `documents.ts` section in `docs/spec.md`; replaced the stale `getUrl` separate-query entry with a note that `list` embeds signed URLs per row. Updated Phase 11 Convex functions list in `docs/implementation-plan.md` to match (`getUrl` removed, `abandonUpload` added).

### 2026-04-17 · qa · "Skrifa í dagbók" quick action navigates rather than opens form per Phase 5 spec

**Context:** Phase 5 QA. `docs/implementation-plan.md` Phase 5 items 3 and 4 say "Skrifa í dagbók" should open a quick-add form / bottom sheet. The implementation links to `/dagbok` instead, because the bottom sheet is Phase 6 work.
**Observation:** The exit criteria are partially met: navigation works, but the in-place form entry isn't there. This is a sensible pragmatic deferral (Phase 6 adds the Dagbók full view with its entry form), but the Phase 5 exit criteria don't call it out as deferred.
**Suggested action:** `docs-sync` should annotate Phase 5 item 3/4 in `docs/implementation-plan.md` to note that the "open quick-add form" behaviour is deferred to Phase 6, and that Phase 5 ships navigation-only links as a placeholder. No code change required — the behaviour is acceptable for the phase.
**Resolution:** 2026-04-17 · docs · `docs/implementation-plan.md` Phase 5 items 3 and 4 updated to note the deferral explicitly. Phase 5 Status block added, marking the navigation-only behaviour as intentional and listing the Phase 6 form as the completion point.

### 2026-04-17 · user-correction · Phases 4–5 shipped without shadcn/ui despite stack requirement

**Context:** Starting Phase 6, I noted that `src/components/ui/` and `components.json` don't exist, then proposed building the bottom sheet "with plain Tailwind + native `<dialog>`" instead of installing shadcn. Nic flagged this: shadcn was named in `CLAUDE.md`'s stack section and is required for all UI components. Phases 4 (`Header`, `BottomNav`, `UserAvatar`, `EmptyState`) and 5 (`NextAppointments`, `RecentLog`, `QuickActions`) all shipped using raw Tailwind primitives. The implementation plan's Phase 4 section does not call out an explicit shadcn install step.
**Observation:** The stack list in `CLAUDE.md` mentioned shadcn/ui, but neither `docs/implementation-plan.md` Phase 0 nor Phase 4 had a concrete install step. The QA agent did not catch the divergence either.
**Suggested action:** (a) `docs-sync` add an explicit shadcn install step to Phase 0; (b) add a shadcn note to Phase 4; (c) `harness-auditor` evaluate a qa check for components not importing from `@/components/ui`.
**Resolution:** 2026-04-17 · docs · (a) Added explicit `bunx shadcn@latest init` + component install step as item 3a in Phase 0 of `docs/implementation-plan.md`, immediately after the Convex init step, with notes on palette merging and the post-install i18n audit. (b) Added a "Note" block at the top of Phase 4 stating all shell components are built on shadcn primitives and the warm palette is merged into shadcn's `:root` CSS variable scheme. Item (c) remains open for `harness-auditor`.

### 2026-04-17 · qa · Phase 5: appointments schema index changed but docs/spec.md not updated

**Context:** Phase 5 QA. `convex/schema.ts` replaced `.index("by_status", ["status"])` on the `appointments` table with `.index("by_status_and_startTime", ["status", "startTime"])`. The `upcoming` Convex function was also absent from the spec's function list.
**Observation:** `docs/spec.md` showed the old index and was missing the `upcoming` and `past` function contracts, plus the `users.ts` file was undocumented.
**Suggested action:** `docs-sync` should update the schema index and add the missing function contracts.
**Resolution:** 2026-04-17 · docs · (a) The schema index was already corrected in the prior docs-sync pass. (b) `appointments.upcoming` was already present. (c) Added the missing `appointments.past` function contract and the missing `users.ts` section (`me` + `list`) to `docs/spec.md`; added `AppointmentCard.tsx` to the project structure tree.

### 2026-04-17 · qa · QuickActions section aria-label uses first-action text rather than a section label

**Context:** Phase 5 QA. `src/components/dashboard/QuickActions.tsx` set `aria-label={t("newAppointment")}` on the wrapping `<section>`, announcing it as "Nýr tími" instead of a section description.
**Observation:** Minor accessibility defect — screen readers announced the section using the first action's text.
**Suggested action:** Add a `dashboard.quickActions.title` translation key and use it on the section.
**Resolution:** 2026-04-17 · code · Fixed in Phase 6 shadcn retrofit (commit 59ee3e0). `QuickActions.tsx` now uses `aria-labelledby` pointing to a visually-hidden `<h2 id="quick-actions-heading">` with `{t("title")}`. `dashboard.quickActions.title` = "Flýtileiðir" in `is.json`; "Quick actions" in `en.json`.

### 2026-04-17 · docs-sync · code-followup — QuickActions `aria-label` announces first action text instead of section label

**Context:** Phase 5 docs-sync pass. Duplicate tracking of the aria-label defect noted above.
**Observation:** Redundant with the qa item above. Both were waiting for the code fix.
**Resolution:** 2026-04-17 · code · Resolved together with the sibling qa item — fixed in Phase 6 shadcn retrofit (commit 59ee3e0).

### 2026-04-17 · manual · Phase 3 contact count: plan says ~18, spec lists 14

**Context:** Executing Phase 3. `docs/implementation-plan.md` Phase 3 step 3 says "~18 contacts across emergency, medical, municipal categories" and Phase 9 says "All seeded contacts display in correct groups." But `docs/spec.md` "Seed Data — Real" only enumerates 14 contacts (3 emergency + 3 medical + 8 municipal). I seeded the 14 from spec since that's the canonical data source.
**Observation:** Numeric drift between the plan and spec. Could be that the plan was written when the spec had more contacts, or vice versa. The "Fjölskylda" and "Annað" categories are defined in the schema but have zero seed entries — those would push the count toward 18 if family phone numbers were filled in (also flagged as "Open Items" in the plan).
**Suggested action:** `docs-sync` should reconcile — either update the plan's count to "~14 (more once family phone numbers are gathered)" or, if there's missing seed data the plan expected, surface the gap.
**Resolution:** 2026-04-17 · docs · Pure docs reconciliation — delegated to `docs-sync` to align Phase 3/9 counts in `docs/implementation-plan.md` against the 14 contacts enumerated in `docs/spec.md` (recommend phrasing as "~14, plus family/other once phone numbers are gathered"). No harness rule change warranted; auditor does not edit docs directly per scope boundary.

### 2026-04-17 · qa · docs/spec.md has incorrect `by_creation` index on `logEntries`

**Context:** Phase 3 QA. The spec (`docs/spec.md`) defines `logEntries` with `.index("by_creation", ["_creationTime"])`. When this was tried, Convex rejected it because it auto-appends `_creationTime` to every index and forbids explicit references to it. The staged schema correctly omits this index.
**Observation:** `docs/spec.md` contains a Convex index definition that will fail at deploy time. Any developer copying the schema verbatim will hit a Convex error. The implementation notes the fix ("had to drop `by_creation` index") but docs still have the bad definition.
**Suggested action:** `docs-sync` should remove `.index("by_creation", ["_creationTime"])` from the `logEntries` definition in `docs/spec.md` and add a note: "Default Convex ordering is by `_creationTime` ascending — no explicit index needed."
**Resolution:** 2026-04-17 · docs · Delegated to `docs-sync` to drop the bad `by_creation` index from `docs/spec.md` `logEntries` and add the "default `_creationTime` ordering — no explicit index" note. Convex's "no explicit `_creationTime` in indexes" rule is already enforced at deploy time by Convex itself, so no separate hook/agent rule is needed; the only fix is the doc text.

### 2026-04-17 · manual · Phase 4 used Tailwind v4 CSS-only theming; plan still calls for `tailwind.config.ts`

**Context:** Phase 4 (App Shell). `docs/implementation-plan.md` Phase 4 step 1 lists `tailwind.config.ts` as a file to create with the warm palette tokens. The repo uses **Tailwind CSS v4**, where the `tailwind.config.ts`/`.js` file is no longer the idiomatic config surface — colors and tokens are declared inline in CSS via `@theme inline { --color-... }` in `src/app/globals.css`. I shipped Phase 4 with palette tokens entirely in `globals.css` and no `tailwind.config.ts`, which works correctly but contradicts the plan.
**Observation:** Plan was likely written with Tailwind v3 in mind. `docs/spec.md` and Phase 4 of `docs/implementation-plan.md` should be updated to describe the v4 idiom (CSS `@theme inline` block) instead of `tailwind.config.ts`. Also worth noting: shadcn/ui v4 examples follow the same pattern.
**Suggested action:** `docs-sync` should: (a) replace `tailwind.config.ts` references in Phase 4 with `globals.css` `@theme inline` block; (b) update spec's design-system section to show the v4 token form; (c) note in Stack bullet of `CLAUDE.md` that Tailwind v4 has no JS config file by default.
**Resolution:** 2026-04-17 · rule + docs · Applied (c) directly: `CLAUDE.md` Stack bullet for shadcn/ui + Tailwind now states "**No `tailwind.config.ts|js`** — v4 declares tokens inline in CSS via `@theme inline { --color-... }` in `src/app/globals.css`." Items (a) and (b) — Phase 4 plan rewrite and spec design-system section — delegated to `docs-sync`.

### 2026-04-17 · manual · Phase 4 browser verification skipped due to auth gate

**Context:** Phase 4 verification step. The auth proxy correctly redirects unauthenticated requests to `/login` (verified via curl: 307 → `/login`). I could not visually verify the post-login App Shell (Header, BottomNav active states, warm palette rendering, Icelandic chars) at 375×812 because there's no headless way to complete Google OAuth from the agent shell.
**Observation:** Phase 4 exit criteria include "the four tabs render correctly with the warm palette and Lucide icons." This is structurally verified (compiles, lints, typechecks, source matches spec) but not visually verified. Future UI phases will hit the same wall on every authenticated route.
**Suggested action:** Either (a) add a dev-only "skip auth" flag (e.g., `SIGGA_DEV_AUTOLOGIN=1` that stamps a session cookie when set), or (b) document in `qa.md` that visual verification of authenticated routes is the user's responsibility post-merge, not the agent's. Option (a) is more useful long-term but adds attack surface; option (b) is honest about a real limitation.
**Resolution:** 2026-04-17 · agent · Took option (b): `.claude/agents/qa.md` UX section now has a "Visual verification of authenticated routes" subsection requiring SKIP (not PASS) for visual checks behind the auth gate, with the QA report calling out which exit-criteria items the user needs to eyeball. Option (a) — `SIGGA_DEV_AUTOLOGIN` dev flag — left as a future consideration; adds attack surface and is a product/security decision for Nic, not an auditor judgment call.

### 2026-04-16 · user-correction · Default to the plan when repo state diverges from it

**Context:** Phase 0 review. I noticed the repo had ESLint installed while `docs/implementation-plan.md` prescribes Biome, and I recommended keeping ESLint to "reduce churn." Nic corrected me: the ESLint setup was accidental, and he wants me to follow the plan (Biome).
**Observation:** When implementation has drifted from the documented plan, I defaulted to "keep what's there" rather than "follow the plan." No rule tells me which way to default. A human reviewer would have the same problem, but agents rotate through this project and will re-discover the same ambiguity.
**Suggested action:** Add a rule to `CLAUDE.md` (or the `docs-sync` agent): when `docs/spec.md` or `docs/implementation-plan.md` diverges from repo state, the default is to treat the plan as canonical unless the user explicitly says otherwise. If you're about to recommend a change that contradicts the plan, raise it as a question to the user before recommending.
**Resolution:** 2026-04-17 · rule · Added "plan wins by default" bullet under **Source of Truth** in `CLAUDE.md`.

### 2026-04-16 · docs-sync · proxy.ts location should be `src/proxy.ts`, not project root

**Context:** Phase 1 auth setup. The spec (`docs/spec.md`) and plan (`docs/implementation-plan.md`) both say `proxy.ts` lives at project root. I initially created it there, and the proxy never ran — Next.js 16's file resolution for `proxy.ts|js` is "project root OR `src/` if `app/` is under `src/`." Since this project uses `src/app/`, the proxy must be at `src/proxy.ts`. After moving it, the redirect fired correctly (307 → `/login` for unauthed requests).
**Observation:** The plan and spec reference the wrong path. `docs/implementation-plan.md` Phase 1 file list says "`proxy.ts` — Auth redirect logic" and Phase 2 says "Merge i18n routing into `proxy.ts`." `docs/spec.md` file tree shows `proxy.ts` at the root alongside `convex/` and `src/`. Both should say `src/proxy.ts`.
**Suggested action:** `docs-sync` should update both files: (a) move `proxy.ts` into the `src/` branch of the file tree in `spec.md`; (b) update the Phase 1 and Phase 2 file lists in `implementation-plan.md`; (c) tighten `CLAUDE.md`'s "Breaking" note on Next.js 16 to mention the location requirement when using `src/app/`. Could also be caught by an automated check: if `app/` is under `src/`, `proxy.ts|js` must be under `src/` too.
**Resolution:** 2026-04-17 · rule + docs · `CLAUDE.md`'s Next.js 16 "Breaking" bullet and Architecture Notes bullet now prescribe `src/proxy.ts` when `app/` is under `src/`. Mirror into `docs/spec.md` + `docs/implementation-plan.md` delegated to `docs-sync`.

### 2026-04-16 · docs-sync · proxy.ts must use `export default`, not a named `proxy` export

**Context:** Phase 1 auth setup. Both `docs/spec.md` and `docs/implementation-plan.md` (plus `CLAUDE.md`'s Next.js 16 "Breaking" note) say `proxy.ts` should export a function named `proxy` (i.e. `export const proxy = ...` or `export function proxy`). I first did this. The app 500'd on every request with `TypeError: adapterFn is not a function` originating from `node_modules/next/dist/server/next-server.js` line where Next resolves the proxy via `middlewareModule.default || middlewareModule`. Switching to `export default convexAuthNextjsMiddleware(...)` fixed it. A plain named export works in simpler proxy bodies but breaks when the proxy is wrapped (Convex Auth's `convexAuthNextjsMiddleware` — and presumably next-intl's `createMiddleware` wrapper too) because Turbopack's server bundle only surfaces the default export in the adapter path.
**Observation:** The docs confidently prescribe the named-`proxy` convention as the Next.js 16 rename rule, but in practice every wrapped-middleware setup in this project must use default export. Phase 2 (i18n) combines two wrappers, which makes default export even more load-bearing. The docs/CLAUDE.md rule is actively misleading.
**Suggested action:** `docs-sync` should update `CLAUDE.md`'s Next.js 16 breaking-changes bullet, `docs/spec.md`'s proxy example, and `docs/implementation-plan.md` Phase 2 note. Replace "export named `proxy`" with "export default" (or, at most, "either a named `proxy` export or default export, but wrapped middlewares like Convex Auth require default"). Also note the failure signature (`adapterFn is not a function`) so the next agent recognizes it immediately.
**Resolution:** 2026-04-17 · rule + docs · `CLAUDE.md` Stack bullet now prescribes `export default` and notes the `adapterFn is not a function` failure signature. Mirror into `docs/spec.md` + `docs/implementation-plan.md` Phase 2 delegated to `docs-sync`.

### 2026-04-16 · qa · QA agent lacks guidance for harness-only / no-production-code diffs

**Context:** First real QA run. The staged diff was entirely `.claude/` harness setup plus `CLAUDE.md` / `.gitignore` — no production code. The qa.md playbook assumes a Next.js/Convex diff and lists Next16/Convex/i18n/UX/seed checks as "Always" or "once convex/ exists", but gives no explicit guidance for diffs that touch zero production code.
**Observation:** I had to invent a SKIP rationale for each product-domain check ("no production code in diff"). A future QA run on another harness-only change would re-derive the same reasoning. Worse, a less careful agent might run Next16 grep checks on `.claude/` markdown and produce spurious findings (e.g., "middleware" appears in agent prompts as a convention reference).
**Suggested action:** Add a short section to `.claude/agents/qa.md` titled "Harness-only diffs" that says: if the staged diff only touches `.claude/**`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`, or `docs/**`, skip Next16/Convex/i18n/UX/seed checks with reason "no production code", still run lint + typecheck, and additionally verify: hook scripts are executable, agent/command frontmatter parses, `settings.json` is valid JSON, `.claude/.qa-passed` remains gitignored.
**Resolution:** 2026-04-17 · agent · Added a `### Harness-only diffs` section to `.claude/agents/qa.md` with exactly the rules above.

### 2026-04-17 · qa · Root `metadata` description is hardcoded Icelandic, not per-locale

**Context:** Phase 2 QA. `src/app/[locale]/layout.tsx` exports a static `metadata` object with `title: "Sigga"` and `description: "Fjölskyldusamráð um umönnun Siggu"`. The description is Icelandic only — visitors on `/en/...` (and search/PWA-install previews) will see the Icelandic string. English is secondary in this project, so this is low-impact, but it is the exact kind of "hardcoded user-facing string in a TSX file" the `qa` playbook's i18n check is supposed to catch, and I nearly let it pass because the playbook's grep heuristic targets body-rendered strings.
**Observation:** (1) The i18n check in `.claude/agents/qa.md` focuses on strings inside JSX elements; it has no explicit mention of `metadata`/`generateMetadata`. (2) The correct next-intl pattern is `export async function generateMetadata({ params })` using `getTranslations`, which neither the spec nor the implementation plan's Phase 2 exit criteria call out. (3) `messages/{is,en}.json` already contain `app.name` and `app.tagline` — the translations exist and are unused for metadata.
**Suggested action:** (a) Tighten the qa playbook's i18n check to explicitly include `export const metadata` / `generateMetadata` strings. (b) `docs-sync` should add a `generateMetadata` example to the Phase 2 section of `docs/implementation-plan.md` and to the layout example in `docs/spec.md`. (c) Non-blocking follow-up for Nic: swap `src/app/[locale]/layout.tsx` to `generateMetadata` so `/en/...` gets the English tagline.
**Resolution:** 2026-04-17 · agent + docs · `.claude/agents/qa.md` i18n check now flags hardcoded `metadata`/`generateMetadata` strings in `src/app/[locale]/**`. `generateMetadata` example for spec/plan delegated to `docs-sync`. Code fix in `src/app/[locale]/layout.tsx` tracked in conversation as a Phase 2 follow-up.

### 2026-04-17 · qa · Datalist category suggestions are hardcoded Icelandic, not routed through next-intl

**Context:** Phase 11 QA. `DocumentUpload.tsx` uses a native `<datalist>` with 5 Icelandic category suggestions ("Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn", "Vottorð") hardcoded as `<option value="..." />` elements. All other user-facing strings in the component route through `useTranslations`.
**Observation:** The i18n rule ("no hardcoded user-facing strings in production UI") technically applies to datalist option values — they appear as autocomplete suggestions in the UI. However, the spec itself lists these as a fixed set tied to document types used by the family; they're not arbitrary strings. The English locale would also show Icelandic category names for these suggestions. In practice this is low-impact: the category field is free-text so English users can type any value, and the `/en/` locale is secondary (mainly for Nic to proofread). The spec (line 543) lists them as Icelandic strings with no mention of localization.
**Suggested action:** Either (a) add `documents.categories.*` keys to `messages/{is,en}.json` and render them via `t("categories.lyfseðill")` etc., or (b) explicitly document in `CLAUDE.md` / the i18n rule that `<datalist>` suggestion values for domain-specific fixed lists are exempt from the i18n requirement when the source language is Icelandic. Option (b) is more pragmatic given the project context. The QA agent should not FAIL a commit for this pattern once exempted.
**Resolution:** 2026-04-17 · agent · Took option (b). Added an explicit exemption note to the i18n check section of `.claude/agents/qa.md`: domain-specific `<datalist>` `<option>` values in a spec-defined fixed Icelandic list do not need `next-intl` routing and should not trigger an i18n FAIL. Root cause: the i18n rule had no carve-out for fixed-vocabulary domain hints that are inherently language-specific.

### 2026-04-17 · qa · spec.md has 4 category suggestions; implementation ships 5

**Context:** Phase 11 QA. `docs/spec.md` line 543 lists 4 category suggestions for the document upload form: "Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn". The implementation adds a 5th: "Vottorð". The Phase 11 status block in `docs/implementation-plan.md` already documents the 5-suggestion list.
**Observation:** `spec.md` is now stale on this point. The `docs-sync` agent should add "Vottorð" to the list in `spec.md` line 543 to keep the two docs consistent.
**Suggested action:** `docs-sync` should update `docs/spec.md` line 543 to read: `category (free text with suggestions: "Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn", "Vottorð")`. This is a docs-only fix with no code impact.
**Resolution:** 2026-04-17 · docs-sync · Updated `docs/spec.md` Skjöl upload form section and `docs/implementation-plan.md` Phase 11 upload form step to include "Vottorð" as the 5th suggestion.

### 2026-04-17 · qa · Route rename /upplysingr -> /upplysingar not reflected in docs

**Context:** Phase 8 fixes bundle — the Upplýsingar route directory was renamed from `upplysingr` (misspelling) to `upplysingar` (correct Icelandic). CLAUDE.md was updated in this commit, but `docs/spec.md` and `docs/implementation-plan.md` were intentionally left unstaged for a follow-up docs-sync run per CLAUDE.md convention.
**Observation:** `docs/spec.md` lines 76, 473, 564 and `docs/implementation-plan.md` lines 284, 325, 560, 617, 671, 729, 746, 755 all still reference the old `/upplysingr` path. This is a known-divergence between code and docs, not a QA failure, but it is a docs-sync task that should be completed promptly to prevent future confusion.
**Suggested action:** Invoke `docs-sync` agent after this commit lands to replace all occurrences of `upplysingr` with `upplysingar` in `docs/spec.md` and `docs/implementation-plan.md`. Also verify the route tree diagram in spec.md line 76 matches the actual directory structure.
**Resolution:** 2026-04-17 · docs-sync · All occurrences of `upplysingr` replaced with `upplysingar` in both `docs/spec.md` (route tree, View 4 header, bottom nav table) and `docs/implementation-plan.md` (Phase 4 nav table, Phase 4 files list, Phase 8/9/10/11 status blocks, Phase 12 "What to do" and files list).

### 2026-04-17 · qa · docs/spec.md authorization pattern section is stale after requireAuth-on-queries hardening

**Context:** Security hardening commit that adds `requireAuth` to all data-returning Convex queries. CLAUDE.md was updated to say "Every mutation AND every data-returning query calls the module-local `requireAuth(ctx)` helper (which uses `getAuthUserId`)". `docs/spec.md` line 643–648 still says "Every mutation should: 1. Get the current user via `ctx.auth.getUserIdentity()`" — which (a) omits queries and (b) uses the deprecated `ctx.auth.getUserIdentity()` API instead of `getAuthUserId`.
**Observation:** CLAUDE.md (the active agent instruction file) is now accurate. `docs/spec.md` Authorization pattern section diverges in two ways: scope (mutation-only) and API (`ctx.auth.getUserIdentity()` vs `getAuthUserId` from `@convex-dev/auth/server`). This creates risk that future contributors reading only `docs/spec.md` will add unguarded queries or use the wrong API.
**Suggested action:** `docs-sync` should update `docs/spec.md` §Authorization pattern to: (1) change "Every mutation should" to "Every mutation and every data-returning query should", (2) replace `ctx.auth.getUserIdentity()` with `getAuthUserId(ctx)` from `@convex-dev/auth/server`, (3) add a note that `users.me` is the one documented exception (returns null for unauthenticated callers by design), and (4) mention the public-URL threat model (`NEXT_PUBLIC_CONVEX_URL` ships in the client bundle).

### 2026-04-19 · qa · Sitewide token sweep left one redundant hover state unfixed in ReglulegirView

**Context:** Reviewing Phase D / task C2 a11y token-repointing commit (91 occurrences across 34 files). The task description said three `hover:text-ink-soft` on elements whose rest state was also `text-ink-soft` after the sweep were swapped to `hover:text-ink`. Two were fixed (`NextAppointments.tsx` link and `CalendarView.tsx` links). The third — the back-link in `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx` line 15 — was not fixed: rest state is `text-ink-soft` and hover remains `hover:text-ink-soft`.
**Observation:** Hover affordance on the Tímar back-link is lost (visually indistinguishable from rest state). The fix is one-line: `hover:text-ink-soft` → `hover:text-ink` to match the other two corrected links. Not a blocking FAIL (contrast still passes) but reduces pointer/keyboard interactivity signal.
**Suggested action:** Fix `ReglulegirView.tsx` line 15 hover class in the next polish pass. Also consider adding a qa grep: `rg 'text-ink-soft[^"]*hover:text-ink-soft' src/` — any element with identical rest and hover color is a candidate redundant-hover to flag.

### 2026-04-19 · qa · Button variant table shrunk to 4 floor-safe sizes — qa.md should have an automated grep guard

**Context:** C4 UX alignment — `button.tsx` collapsed from 10 variants to 4 that all meet 48 px. The removed variants (`xs`, `sm`, `lg`, `icon-xs`, `icon-sm`, `icon-lg`) were previously the most commonly misused controls (sub-floor heights).
**Observation:** There is no automated qa check that would catch a future `size="sm"` or `size="icon-sm"` prop on a `<Button>` — TypeScript catches it at compile time because the type is narrowed, but only if the consumer explicitly types the prop. A direct JSX string `size="sm"` on a `<Button>` will produce a TypeScript error, but a future contributor might re-add one of the old variants to `button.tsx` and the QA agent would not notice unless it actively greps. Additionally, after any future shadcn upgrade that resets `button.tsx` to stock, the sub-floor variants would silently return.
**Suggested action:** Add to `.claude/agents/qa.md` UX section: after any diff touching `src/components/ui/button.tsx`, run `rg 'size=.*(xs|sm|lg|icon-xs|icon-sm|icon-lg)' src/components/ui/button.tsx` — any match in the `size:` variant map is a FAIL (floor violation). Additionally, add to the general UX grep for the full `src/`: `rg '<Button[^>]*size="(sm|xs|lg|icon-sm|icon-xs|icon-lg)"' src/` — any Button consumer of a removed variant is a FAIL.

### 2026-04-19 · qa · --input token repoint changes disabled-input background in light mode

**Context:** C3 a11y fix repoints `--input` from `var(--divider-strong)` (a near-transparent alpha) to `var(--ink-soft)` (#5a6158, a dark muted green) to meet WCAG 1.4.11. Several shadcn primitives use `--input` as a background tint: `disabled:bg-input/50` on input and textarea, `data-unchecked:bg-input` on switch.
**Observation:** In light mode, `disabled:bg-input/50` now resolves to 50% opacity of a dark ink colour rather than 50% of a near-white divider, so disabled text inputs will render with a noticeably darker tinted background. Functionally this may improve disabled-state legibility (darker = more explicitly disabled), but it's a side-effect not called out in the WCAG fix scope. The switch unchecked track uses `data-unchecked:bg-input` at full opacity — this will now render as a solid dark-green track when unchecked, which is likely wrong. No switches are currently rendered in the UI (Phase 15), but this is a lurking visual regression.
**Suggested action:** Before Phase 15 adds any toggle controls: audit whether `data-unchecked:bg-input` on switch should be replaced with a dedicated `--switch-track` token (e.g. `var(--divider-strong)` or a new `--muted-surface` token), decoupled from `--input`. Add a qa rule: when `--input` token value changes, cross-check `bg-input/*` and `data-unchecked:bg-input` usages in `src/components/ui/`.
