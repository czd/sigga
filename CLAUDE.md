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

## Current Repo State

**Fresh `create-next-app` scaffold — Phase 0 of the implementation plan is not yet started.** The final project structure described in the spec (`src/app/[locale]/...`, `convex/`, `messages/`, `proxy.ts`, etc.) does not exist yet. What's here now:

- `app/layout.tsx`, `app/page.tsx` — default create-next-app boilerplate, to be replaced by `src/app/[locale]/...`
- `next.config.ts`, `tsconfig.json` (path alias `@/*`), `eslint.config.mjs`
- No Convex, no next-intl, no shadcn/ui installed yet

## Stack

- **Next.js 16** (App Router, Turbopack default). **Breaking**: `middleware.ts` → `proxy.ts` with export named `proxy`; `next lint` removed (use Biome or ESLint directly); parallel route slots require explicit `default.tsx`; `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`. See `@AGENTS.md` — consult `node_modules/next/dist/docs/` before writing Next-specific code.
- **Convex** — backend, DB, real-time subscriptions, file storage, scheduled functions. Single source of truth for data.
- **Convex Auth** (`@convex-dev/auth`) with Google OAuth. Whitelist enforced server-side via `ALLOWED_EMAILS` env var — no invite system.
- **next-intl** for i18n. `is` default (no prefix), `en` at `/en/...`. Auth redirect + locale routing both live in `proxy.ts`.
- **shadcn/ui + Tailwind CSS 4**, mobile-first. 48px min tap targets (56px+ preferred), 18px min body text, warm palette (cream backgrounds, sage/teal accent), Lucide icons always paired with text labels.
- **Bun** package manager. **Vercel** hosting.
- **Vitest** for unit/integration, **Playwright** for e2e at 375×812 viewport.

## Commands

```bash
bun install
bun dev           # next dev (Turbopack)
bun run build     # next build
bun start         # next start
bun run lint      # eslint

# Once Convex is added (Phase 0):
npx convex dev     # dev backend, auto-writes CONVEX_DEPLOYMENT + NEXT_PUBLIC_CONVEX_URL to .env.local
npx convex deploy  # prod deploy
npx convex env set <KEY> "<value>"
```

## Architecture Notes (once built out)

- **Routing**: `src/app/[locale]/{page,dagbok,timar,upplysingr,login}/page.tsx`. Four tabs correspond to the four top-level routes; bottom nav is fixed and always visible.
- **`proxy.ts` is load-bearing**: it combines next-intl locale routing with Convex Auth redirect-to-login. The two concerns must not conflict — adapt `convexAuthNextjsMiddleware` and rename the export to `proxy`.
- **Convex function naming**: `[table].[action]` (e.g., `appointments.volunteerToDrive`, `logEntries.add`). Every mutation calls `ctx.auth.getUserIdentity()` and throws `ConvexError("Ekki innskráður")` if null. No roles in v1 — any authenticated family member can do anything, except log-entry editing which checks `authorId === currentUser`.
- **Real-time by default**: all reads are Convex `useQuery` subscriptions. Two tabs open → mutation in one appears in the other without refresh. E2E tests explicitly cover this.
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

- A pre-commit hook (`.claude/hooks/qa-gate.sh`) blocks `git commit` unless a fresh QA marker exists at `.claude/.qa-passed` (≤ 15 min old, consumed on use).
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
