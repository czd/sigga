# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project: Sigga

Mobile-first PWA for a family (4 daughters + extended family) to coordinate care of Sigga — 90, Kópavogur, in active breast cancer treatment. Replaces a Facebook Messenger group chat as the "one simple spot" for stable-but-updatable information (appointments, log, meds, contacts, entitlements, documents).

**Primary users are 60+ Icelandic women with low tech comfort.** Every design decision defers to radical simplicity over feature richness. Icelandic (`is`) is the default locale with no URL prefix; English is secondary at `/en/...` and exists mainly so Nic can proofread translations.

## Source of Truth

Two long-form docs in `docs/` are the canonical spec — always read them before proposing changes that touch schema, views, or seed data:

- `docs/spec.md` — complete technical spec: stack, Convex schema, auth strategy, i18n strategy, per-view UI design, Convex function contracts, **real seed data** (medications, contacts, entitlements gathered from the family chat — not placeholders).
- `docs/implementation-plan.md` — phase-by-phase build plan (Phases 0–17), each with files to create, exit criteria, and gotchas.

**When the repo diverges from the plan, the plan wins by default.** If you find existing code/config that contradicts `docs/spec.md` or `docs/implementation-plan.md`, do not recommend keeping the divergent state to "reduce churn" — surface it to the user and align with the plan unless the user explicitly overrides. (Doc errors themselves go to `docs-sync`.)

## Current Repo State

**Built out through Phase 12 + Phase 8.5 (recurring appointments).** The scaffold, auth, i18n, schema/seed, app shell, dashboard, Dagbók, Tímar (incl. recurring series), and all four Upplýsingar sub-pages (Lyf, Símaskrá, Réttindi, Skjöl) are shipped. Remaining phases: 13 (PWA config), 14 (backup cron — `convex/crons.ts` exists, cron handler in `convex/backup.ts` still to wire up), 15 (polish), 16 (tests), 17 (deploy & onboard). Consult `docs/implementation-plan.md` for the authoritative phase-by-phase status.

What's in the tree now (high level):

- `src/app/[locale]/(app)/{page,umonnun,folk,pappirar,timar}/page.tsx` — the five top-level tab routes (Dashboard, Umönnun/Dagbók, Fólk, Pappírar, Tímar). Note: four originally-separate "upplýsingar" sub-pages (Lyf, Símaskrá, Réttindi, Skjöl) were consolidated into tabs inside Umönnun / Fólk / Pappírar — there is no `upplysingar` route.
- `src/app/[locale]/(app)/timar/reglulegir/` — recurring-series management (Phase 8.5).
- `src/app/[locale]/login/` — public sign-in.
- `convex/` — `schema.ts`, `auth.ts`, `auth.config.ts`, `http.ts`, plus per-table modules: `appointments.ts`, `contacts.ts`, `documents.ts`, `entitlements.ts`, `logEntries.ts`, `medications.ts`, `recurringSeries.ts`, `users.ts`, `seed.ts`, `crons.ts`.
- `src/components/{appointments,dashboard,info,log,nav,recurringSeries,shared,timar,ui}/` — feature folders plus shadcn primitives under `ui/`.
- `messages/{is,en}.json`, `src/i18n/`, `src/proxy.ts` — i18n + auth middleware wired together.
- `src/app/globals.css` — Bókasafn palette tokens (paper/ink/sage/wheat/amber) declared inline via Tailwind v4 `@theme`. There is no `tailwind.config.ts`.
- `biome.json` — Biome is the linter/formatter; ESLint was removed in Phase 0.

## Stack

- **Next.js 16** (App Router, Turbopack default). **Breaking**: `middleware.ts` → `proxy.ts`, which must live at `src/proxy.ts` when `app/` is under `src/` (project root only when `app/` is at root); use `export default` — wrapped middlewares like `convexAuthNextjsMiddleware` and next-intl's `createMiddleware` require it, and a named `proxy` export with a wrapper throws `TypeError: adapterFn is not a function` at request time. `next lint` removed (use Biome or ESLint directly); parallel route slots require explicit `default.tsx`; `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`. **Do not exclude `api` from the proxy matcher** — Convex Auth POSTs to `/api/auth` and requires the middleware to intercept it; excluding `api` causes sign-in to 404 (Safari surfaces this as "The string did not match the expected pattern"). The correct matcher is `"/((?!_next|_vercel|.*\\..*).*)"`. See `@AGENTS.md` — consult `node_modules/next/dist/docs/` before writing Next-specific code.
- **Convex** — backend, DB, real-time subscriptions, file storage, scheduled functions. Single source of truth for data.
- **Convex Auth** (`@convex-dev/auth`) with Google OAuth. Whitelist enforced server-side via `ALLOWED_EMAILS` env var — no invite system.
- **next-intl** for i18n. `is` default (no prefix), `en` at `/en/...`. Auth redirect + locale routing both live in `proxy.ts`.
- **shadcn/ui + Tailwind CSS 4**, mobile-first. **No `tailwind.config.ts|js`** — v4 declares tokens inline in CSS via `@theme inline { --color-... }` in `src/app/globals.css`; that's where the **Bókasafn palette** lives (paper/ink/sage/wheat/amber — paper cream backgrounds, muted sage accent, wheat/amber surfaces for callouts). 48px min tap targets (56px+ preferred), 18px min body text, Lucide icons always paired with text labels. When you need a border color token (e.g. `border-divider`), make sure the corresponding `--color-divider*` is registered in `@theme inline` — otherwise the Tailwind class silently no-ops.
- **Bun** package manager. **Vercel** hosting — deploys are triggered by pushing to `main` on GitHub. **Never run `vercel deploy`, `vercel --prod`, or any Vercel MCP deploy tool from local.** The `main` branch on GitHub is the source of truth for what's in production; preview deployments for other branches happen automatically.
- **Vitest** for unit/integration, **Playwright** for e2e at 375×812 viewport.

## Commands

```bash
bun install
bun dev            # next dev (Turbopack)
bun run build      # next build (Vercel CI also runs `convex deploy` when CONVEX_DEPLOY_KEY is set)
bun start          # next start
bun run lint       # biome check
bun run lint:fix   # biome check --write
bun run format     # biome format --write
bunx tsc --noEmit  # typecheck

# Convex
npx convex dev     # dev backend, auto-writes CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL to .env.local
npx convex env set <KEY> "<value>"
# Do NOT run `npx convex deploy` locally — prod deploys happen from Vercel CI on push to main.
```

## Architecture Notes

- **Routing**: Authenticated routes live under `src/app/[locale]/(app)/` (an `(app)` route group); public routes (`login`) live directly under `src/app/[locale]/`. The five tab routes are `(app)/{page,umonnun,folk,pappirar,timar}/page.tsx` — Dashboard ("Í dag"), Umönnun (Dagbók + Lyf tabs), Fólk (Símaskrá), Pappírar (Réttindi + Skjöl), Tímar (with `timar/reglulegir/` for recurring-series management). Bottom nav is fixed and always visible.
- **`src/proxy.ts` is load-bearing**: it combines next-intl locale routing with Convex Auth redirect-to-login. The two concerns must not conflict — adapt `convexAuthNextjsMiddleware` and `export default` the wrapped middleware.
- **Convex function naming**: `[table].[action]` (e.g., `appointments.volunteerToDrive`, `logEntries.add`). **Every mutation AND every data-returning query** calls the module-local `requireAuth(ctx)` helper (which uses `getAuthUserId` from `@convex-dev/auth/server`) and throws `ConvexError("Ekki innskráður")` if null. `NEXT_PUBLIC_CONVEX_URL` ships in the client bundle, so anyone who inspects the JS can call `api.*.list` directly — only server-side auth enforces the `ALLOWED_EMAILS` whitelist. The one documented exception is `users.me`, which returns `null` for unauthenticated callers by design so the header can render a signed-out state. No roles in v1 — any authenticated family member can do anything, except log-entry editing which checks `authorId === currentUser`.
- **Real-time by default**: all reads are Convex `useQuery` subscriptions. Two tabs open → mutation in one appears in the other without refresh. E2E tests explicitly cover this.
- **`useSearchParams` in a client component** is sufficient to opt a route into dynamic rendering (ƒ) — no `export const dynamic = 'force-dynamic'` or `<Suspense>` wrapper is required in this project's routing setup. Do not add either unless there is a specific reason beyond "useSearchParams is present".
- **File uploads**: `generateUploadUrl` mutation → client POSTs file → client gets `storageId` → `save` mutation records metadata. Deletes must remove both the row and the underlying blob.
- **Break-glass backup**: weekly Convex cron (`backup.weeklyExport`, Sunday 03:00 UTC) serializes all tables to JSON into Convex file storage; keeps last 4.
- **PWA**: installable via `public/manifest.json` (`display: standalone`, `lang: is`). Service worker caches app shell; data areas show "Hleð..." while reconnecting.

## Conventions

- **All user-facing text in Icelandic**, sourced from `messages/is.json`. Nothing hardcoded. "Vista" not "Submit", "Bæta við" not "Create". Icelandic characters (ð, þ, æ, ö) must render correctly — pick fonts accordingly.
- **Phone numbers are tappable** (`tel:` links). This is the single most-used feature — zero extra taps between "I need a number" and the call starting.
- **Seed data is real**, not placeholder. The medications, contacts, and entitlements in `docs/spec.md` came from the family Messenger chat and Helga's confirmation. Don't fabricate or genericize any of it.
- **Do NOT build** (deferred to v2): medication check-off, push notifications, Google Calendar sync, AI log summaries, multi-patient support, full offline CRUD.

## Harness workflow

The project has a three-agent harness defined under `.claude/agents/` with matching slash commands under `.claude/commands/`. Use it.

### `qa` — runs before every `git commit`

- A pre-commit hook (`.claude/hooks/qa-gate.sh`) blocks `git commit` unless a fresh QA marker exists at `/tmp/sigga-qa-passed` (≤ 15 min old, consumed on use). The marker lives in `/tmp/` — not under `.claude/` — so creating it doesn't require approval each time.
- Standard flow: stage changes → invoke the `qa` agent (`Agent` tool with `subagent_type: "qa"`) or run `/qa` → on PASS the agent creates the marker → commit within 15 min.
- Bypass only for genuinely trivial changes: include `[skip-qa]` in the commit message, or `SIGGA_SKIP_QA=1`, or `git commit --no-verify`. Don't bypass reflexively — the user asked for QA to run.

### `docs-sync` — keeps `docs/` truthful

- Invoke via `Agent` with `subagent_type: "docs-sync"` or `/docs-check` whenever code has drifted from `docs/spec.md` or `docs/implementation-plan.md` — e.g., closing out a phase, changing schema, adding routes, swapping a dependency.
- The agent edits docs directly and logs ambiguities to the improvements queue. It is the only agent that should rewrite `docs/spec.md` or `docs/implementation-plan.md`.

### `harness-auditor` — resolves the improvements queue

- Invoke via `Agent` with `subagent_type: "harness-auditor"` or `/audit-harness` when items have accumulated in `.claude/harness-improvements.md`.
- It classifies each item (rule / agent / command / hook / docs / won't-fix), proposes or applies the fix, and moves the item to `## Resolved`.

### The improvements queue (`.claude/harness-improvements.md`)

Append entries when:
- `qa` or `docs-sync` find something undocumented or a check that should be automated.
- **The user corrects your approach or behavior mid-session.** Log a `user-correction` entry so the auditor can decide whether the rule was missing, ambiguous, or unenforced. This applies even if you just silently adjust — the correction is signal.
- You keep running into the same ambiguity and want the auditor to lock it down.

Use `/log-improvement` or just append the entry directly — format is documented in the queue file.

## Workflow skills

The `superpowers` and `code-review` plugins are installed. Use them at the moments they're designed for — they supplement the project-specific harness above, they don't replace it.

- **`superpowers:brainstorming`** — before any new feature or non-trivial design decision, unless it's already been shaped in `docs/`.
- **`superpowers:executing-plans`** (or `subagent-driven-development` when subagents help) — for working through phases in `docs/implementation-plan.md`. Don't ad-hoc what the plan already scripts.
- **`superpowers:test-driven-development`** — before writing a testable feature.
- **`superpowers:systematic-debugging`** — for any bug that isn't a one-line obvious fix.
- **`superpowers:verification-before-completion`** — always, as a discipline. Never claim PASS / DONE / FIXED / "it works" without running the verifying command *this turn*. The `qa` agent inherits this rule; so do you.
- **`superpowers:finishing-a-development-branch`** — after QA passes on a feature branch. Use its 4-option menu (merge / PR / keep / discard) instead of auto-integrating.
- **`superpowers:requesting-code-review`** or **`/code-review`** — before merging a phase or substantial feature. This is deeper than pre-commit `qa` — it catches cross-file issues and CLAUDE.md compliance that a local lint+typecheck cannot.

The three project agents (`qa`, `docs-sync`, `harness-auditor`) encode Sigga-specific rules that superpowers doesn't know about. Keep using them.
