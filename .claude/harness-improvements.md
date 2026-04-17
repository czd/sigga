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

### 2026-04-17 · qa · `appointments.past` query skips auth check, inconsistent with `users.list`

**Context:** Phase 7 QA. The new `appointments.past` query does not call `requireAuth`, while `users.list` (added in the same commit) does. Other read queries in `appointments.ts` (`list`, `upcoming`, `get`) also skip auth. The app is behind an auth proxy so unauthenticated browser access is blocked, but the Convex backend itself enforces no auth on these reads.
**Observation:** There is currently no documented policy for whether Convex *queries* must check auth. CLAUDE.md says "every mutation calls `ctx.auth.getUserIdentity()` and throws…" — queries are not mentioned. In practice some queries check auth (`users.list`) and some don't (`appointments.*`). This inconsistency could confuse future contributors and leaves appointment data accessible to any Convex client with the deployment URL. Note: `users.ts` no longer has the `requireAuth` helper from the original QA report; `users.list` currently has no auth check either.
**Suggested action:** Decide on a policy and document it: either (a) all queries also require auth (best for defence-in-depth — recommended), or (b) mutations require auth, queries may or may not (current implicit state). If (a), update CLAUDE.md's Architecture Notes to say "every Convex function — query or mutation — calls `getAuthUserId(ctx)` and throws `ConvexError('Ekki innskráður')` if null", then add `requireAuth` calls to the unauthenticated queries. **Needs Nic's decision on policy.**

### 2026-04-17 · qa · `dialog.tsx` sr-only "Close" label should source from translations (medium-term)

**Context:** Phase 6 QA flagged `dialog.tsx` line 77 (`<span className="sr-only">Close</span>`). Phase 7 triggered it; the short-term fix (`showCloseButton={false}` on the confirm dialog in `AppointmentForm.tsx`) is already applied. The underlying issue remains: any future `DialogContent` with the default `showCloseButton={true}` will render English to screen readers.
**Observation:** `dialog.tsx` is a shared primitive used by all dialogs. Making it locale-safe at the source is better than requiring every caller to pass `showCloseButton={false}`.
**Suggested action:** Update `src/components/ui/dialog.tsx` to accept an optional `closeLabel` prop (defaulting to a value sourced from context or passed by the caller), or thread `useTranslations("common")` into `DialogContent` so the sr-only span reads `tCommon("close")` = "Loka". Apply the same pattern to `sheet.tsx` which has the same hardcoded string. This is a code fix, not a harness fix — route to the next applicable phase.

### 2026-04-17 · qa · QA gate should catch use of deprecated Convex cron helpers (`crons.daily`, `crons.hourly`, `crons.weekly`)

**Context:** Reviewing a fix that swapped `crons.daily(name, { hourUTC, minuteUTC }, fn)` for `crons.cron(name, "10 0 * * *", fn)` to comply with the Convex guidelines in `convex/_generated/ai/guidelines.md`. The violation was only caught by a human reading the guidelines file, not by any automated check.
**Observation:** There is no grep-level check in the QA agent for deprecated Convex cron registration helpers. They compile fine (TypeScript accepts them), so lint and typecheck cannot catch the regression. A simple grep for `crons\.daily\b|crons\.hourly\b|crons\.weekly\b` in `convex/` would surface this instantly.
**Suggested action:** Add a Convex conventions check to `.claude/agents/qa.md`: "Grep `convex/` for `crons\.daily(`, `crons\.hourly(`, `crons\.weekly(` — any match is a FAIL; the Convex guidelines require only `crons.interval` or `crons.cron`."

---

## Resolved

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
