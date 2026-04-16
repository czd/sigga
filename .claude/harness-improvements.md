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

### 2026-04-17 · qa · Phase 5: appointments schema index changed but docs/spec.md not updated

**Context:** Phase 5 QA. `convex/schema.ts` replaced `.index("by_status", ["status"])` on the `appointments` table with `.index("by_status_and_startTime", ["status", "startTime"])`. The new composite index is strictly more capable (its prefix serves any `by_status`-only query) and is required for the efficient `upcoming` query.
**Observation:** `docs/spec.md` line 162 still shows `.index("by_status", ["status"])` on the appointments table. The `upcoming` Convex function (not present in the spec's function list) is also undocumented. Any developer reading the spec and copying the schema verbatim will get a less optimal index and a missing function.
**Suggested action:** `docs-sync` should: (a) replace `.index("by_status", ["status"])` with `.index("by_status_and_startTime", ["status", "startTime"])` in `docs/spec.md`; (b) add `appointments.upcoming` to the Convex function contracts section (same file, near `appointments.list`); (c) optionally update `docs/implementation-plan.md` Phase 5 query list to reference `appointments.upcoming` instead of describing it inline as a filter of `appointments.list`.

### 2026-04-17 · qa · QuickActions section aria-label uses first-action text rather than a section label

**Context:** Phase 5 QA. `src/components/dashboard/QuickActions.tsx` sets `aria-label={t("newAppointment")}` on the wrapping `<section>`. This means assistive technology announces the section as "Nýr tími" — only the first action's text, not a description of the section.
**Observation:** The `quickActions` namespace in `messages/*.json` has no `title` or `label` key. The `aria-label` borrowing one action's text is a minor accessibility defect that will confuse screen reader users. Best practice: add a `"title": "Flýtileiðir"` (or similar) key and use it as the section's `aria-label`.
**Suggested action:** Add `"title": "Flýtileiðir"` (is) / `"title": "Quick actions"` (en) to `messages/{is,en}.json` under `dashboard.quickActions`, then use `t("title")` as the `aria-label` on the `<section>` in `QuickActions.tsx`. Non-blocking — no QA block, just a future-fix item.

### 2026-04-17 · qa · "Skrifa í dagbók" quick action navigates rather than opens form per Phase 5 spec

**Context:** Phase 5 QA. `docs/implementation-plan.md` Phase 5 items 3 and 4 say "Skrifa í dagbók" should open a quick-add form / bottom sheet. The implementation links to `/dagbok` instead, because the bottom sheet is Phase 6 work.
**Observation:** The exit criteria are partially met: navigation works, but the in-place form entry isn't there. This is a sensible pragmatic deferral (Phase 6 adds the Dagbók full view with its entry form), but the Phase 5 exit criteria don't call it out as deferred.
**Suggested action:** `docs-sync` should annotate Phase 5 item 3/4 in `docs/implementation-plan.md` to note that the "open quick-add form" behaviour is deferred to Phase 6, and that Phase 5 ships navigation-only links as a placeholder. No code change required — the behaviour is acceptable for the phase.
**Resolution:** 2026-04-17 · docs · `docs/implementation-plan.md` Phase 5 items 3 and 4 updated to note the deferral explicitly. Phase 5 Status block added, marking the navigation-only behaviour as intentional and listing the Phase 6 form as the completion point.

### 2026-04-17 · docs-sync · code-followup — QuickActions `aria-label` announces first action text instead of section label

**Context:** Phase 5 docs-sync pass. `src/components/dashboard/QuickActions.tsx` sets `aria-label={t("newAppointment")}` on the wrapping `<section>`, which makes screen readers announce the entire section as "Nýr tími" — the text of the first action, not a description of the section.
**Observation:** This is a minor accessibility defect. The correct fix is a dedicated translation key (e.g., `dashboard.quickActions.title = "Flýtileiðir"` in `is.json`, `"Quick actions"` in `en.json`) used as the `aria-label`. The fix touches `src/components/dashboard/QuickActions.tsx` and both `messages/*.json` — out of scope for docs-sync, which only edits `docs/` and the improvements queue.
**Suggested action:** In a future code session: (1) add `"title": "Flýtileiðir"` under `dashboard.quickActions` in `messages/is.json`; (2) add `"title": "Quick actions"` in `messages/en.json`; (3) replace `aria-label={t("newAppointment")}` with `aria-label={t("title")}` in `QuickActions.tsx`. Non-blocking — no QA gate impact.

---

## Resolved

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
