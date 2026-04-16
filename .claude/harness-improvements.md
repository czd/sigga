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

### 2026-04-16 · user-correction · Default to the plan when repo state diverges from it

**Context:** Phase 0 review. I noticed the repo had ESLint installed while `docs/implementation-plan.md` prescribes Biome, and I recommended keeping ESLint to "reduce churn." Nic corrected me: the ESLint setup was accidental, and he wants me to follow the plan (Biome).
**Observation:** When implementation has drifted from the documented plan, I defaulted to "keep what's there" rather than "follow the plan." No rule tells me which way to default. A human reviewer would have the same problem, but agents rotate through this project and will re-discover the same ambiguity.
**Suggested action:** Add a rule to `CLAUDE.md` (or the `docs-sync` agent): when `docs/spec.md` or `docs/implementation-plan.md` diverges from repo state, the default is to treat the plan as canonical unless the user explicitly says otherwise. If you're about to recommend a change that contradicts the plan, raise it as a question to the user before recommending.

### 2026-04-16 · docs-sync · proxy.ts location should be `src/proxy.ts`, not project root

**Context:** Phase 1 auth setup. The spec (`docs/spec.md`) and plan (`docs/implementation-plan.md`) both say `proxy.ts` lives at project root. I initially created it there, and the proxy never ran — Next.js 16's file resolution for `proxy.ts|js` is "project root OR `src/` if `app/` is under `src/`." Since this project uses `src/app/`, the proxy must be at `src/proxy.ts`. After moving it, the redirect fired correctly (307 → `/login` for unauthed requests).
**Observation:** The plan and spec reference the wrong path. `docs/implementation-plan.md` Phase 1 file list says "`proxy.ts` — Auth redirect logic" and Phase 2 says "Merge i18n routing into `proxy.ts`." `docs/spec.md` file tree shows `proxy.ts` at the root alongside `convex/` and `src/`. Both should say `src/proxy.ts`.
**Suggested action:** `docs-sync` should update both files: (a) move `proxy.ts` into the `src/` branch of the file tree in `spec.md`; (b) update the Phase 1 and Phase 2 file lists in `implementation-plan.md`; (c) tighten `CLAUDE.md`'s "Breaking" note on Next.js 16 to mention the location requirement when using `src/app/`. Could also be caught by an automated check: if `app/` is under `src/`, `proxy.ts|js` must be under `src/` too.

### 2026-04-16 · docs-sync · proxy.ts must use `export default`, not a named `proxy` export

**Context:** Phase 1 auth setup. Both `docs/spec.md` and `docs/implementation-plan.md` (plus `CLAUDE.md`'s Next.js 16 "Breaking" note) say `proxy.ts` should export a function named `proxy` (i.e. `export const proxy = ...` or `export function proxy`). I first did this. The app 500'd on every request with `TypeError: adapterFn is not a function` originating from `node_modules/next/dist/server/next-server.js` line where Next resolves the proxy via `middlewareModule.default || middlewareModule`. Switching to `export default convexAuthNextjsMiddleware(...)` fixed it. A plain named export works in simpler proxy bodies but breaks when the proxy is wrapped (Convex Auth's `convexAuthNextjsMiddleware` — and presumably next-intl's `createMiddleware` wrapper too) because Turbopack's server bundle only surfaces the default export in the adapter path.
**Observation:** The docs confidently prescribe the named-`proxy` convention as the Next.js 16 rename rule, but in practice every wrapped-middleware setup in this project must use default export. Phase 2 (i18n) combines two wrappers, which makes default export even more load-bearing. The docs/CLAUDE.md rule is actively misleading.
**Suggested action:** `docs-sync` should update `CLAUDE.md`'s Next.js 16 breaking-changes bullet, `docs/spec.md`'s proxy example, and `docs/implementation-plan.md` Phase 2 note. Replace "export named `proxy`" with "export default" (or, at most, "either a named `proxy` export or default export, but wrapped middlewares like Convex Auth require default"). Also note the failure signature (`adapterFn is not a function`) so the next agent recognizes it immediately.

### 2026-04-16 · qa · QA agent lacks guidance for harness-only / no-production-code diffs

**Context:** First real QA run. The staged diff was entirely `.claude/` harness setup plus `CLAUDE.md` / `.gitignore` — no production code. The qa.md playbook assumes a Next.js/Convex diff and lists Next16/Convex/i18n/UX/seed checks as "Always" or "once convex/ exists", but gives no explicit guidance for diffs that touch zero production code.
**Observation:** I had to invent a SKIP rationale for each product-domain check ("no production code in diff"). A future QA run on another harness-only change would re-derive the same reasoning. Worse, a less careful agent might run Next16 grep checks on `.claude/` markdown and produce spurious findings (e.g., "middleware" appears in agent prompts as a convention reference).
**Suggested action:** Add a short section to `.claude/agents/qa.md` titled "Harness-only diffs" that says: if the staged diff only touches `.claude/**`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`, or `docs/**`, skip Next16/Convex/i18n/UX/seed checks with reason "no production code", still run lint + typecheck, and additionally verify: hook scripts are executable, agent/command frontmatter parses, `settings.json` is valid JSON, `.claude/.qa-passed` remains gitignored.

### 2026-04-17 · qa · Root `metadata` description is hardcoded Icelandic, not per-locale

**Context:** Phase 2 QA. `src/app/[locale]/layout.tsx` exports a static `metadata` object with `title: "Sigga"` and `description: "Fjölskyldusamráð um umönnun Siggu"`. The description is Icelandic only — visitors on `/en/...` (and search/PWA-install previews) will see the Icelandic string. English is secondary in this project, so this is low-impact, but it is the exact kind of "hardcoded user-facing string in a TSX file" the `qa` playbook's i18n check is supposed to catch, and I nearly let it pass because the playbook's grep heuristic targets body-rendered strings.
**Observation:** (1) The i18n check in `.claude/agents/qa.md` focuses on strings inside JSX elements; it has no explicit mention of `metadata`/`generateMetadata`. (2) The correct next-intl pattern is `export async function generateMetadata({ params })` using `getTranslations`, which neither the spec nor the implementation plan's Phase 2 exit criteria call out. (3) `messages/{is,en}.json` already contain `app.name` and `app.tagline` — the translations exist and are unused for metadata.
**Suggested action:** (a) Tighten the qa playbook's i18n check to explicitly include `export const metadata` / `generateMetadata` strings. (b) `docs-sync` should add a `generateMetadata` example to the Phase 2 section of `docs/implementation-plan.md` and to the layout example in `docs/spec.md`. (c) Non-blocking follow-up for Nic: swap `src/app/[locale]/layout.tsx` to `generateMetadata` so `/en/...` gets the English tagline.

---

## Resolved

_(empty)_
