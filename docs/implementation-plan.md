# Sigga App — Implementation Plan

**Reference:** `sigga-app-spec-v1_1.md` (the full spec lives in this project)

This document is the build plan. Work through the phases in order — each phase lists exactly what to build, the files to create/modify, and the exit criteria. The spec has the full data model, seed data, and UI details — refer to it constantly.

---

## Phase 0: Scaffold & Tooling

### Status (2026-04-16)

Branch `phase-0-scaffold`. Code scaffold and Convex deployment complete. Vercel linked (2026-04-17). Production deploys happen via `git push` to `main` on GitHub — Vercel picks up the change and deploys automatically. Do not run `vercel deploy` or `vercel --prod` from local.

### What to do

1. ~~Create the Next.js 16 app with Bun~~ — already done pre-Phase-0 via `create-next-app`. The scaffold did NOT create `middleware.ts`, so no rename was needed.

2. Move the app directory into `src/`:
   ```bash
   git mv app src/app
   ```
   Update `tsconfig.json` paths from `"@/*": ["./*"]` to `"@/*": ["./src/*"]`.
   (The `[locale]` segment is added in Phase 2, not here.)

3. Install Convex and initialize it:
   ```bash
   bun add convex
   npx convex init   # requires Convex account login — user action
   ```
   This writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local` and creates the `convex/` directory.

3a. Install shadcn/ui:
   ```bash
   bunx shadcn@latest init
   ```
   Choose the CSS-variables style, set the base color to neutral, and confirm `src/app/globals.css` as the CSS file. This creates `components.json`, updates `src/app/globals.css` with shadcn's `:root` CSS variable scheme, and scaffolds `src/lib/utils.ts`. The warm palette tokens (cream background, sage/teal accent) are merged into the `:root`/`.dark` blocks that shadcn generates — there is no separate `tailwind.config.ts` in Tailwind v4. Install component primitives as needed per phase:
   ```bash
   bunx shadcn@latest add button card sheet dialog input label select textarea avatar dropdown-menu
   ```
   After installing any shadcn component, audit for hardcoded English strings (especially `sr-only` close/dismiss labels) and replace them with `tCommon(...)` translation keys.

4. Replace ESLint with Biome (the scaffold came with ESLint, which was accidental — Biome is the intended tool):
   ```bash
   bun remove eslint eslint-config-next
   rm eslint.config.mjs
   bun add -D @biomejs/biome
   bunx @biomejs/biome init
   bunx biome check --write   # one-time reformat to Biome style (tabs, double quotes)
   ```
   Update `package.json` scripts: `"lint": "biome check"`, add `"lint:fix": "biome check --write"` and `"format": "biome format --write"`.
   Update `biome.json` to enable the Tailwind/CSS-modules parser:
   ```json
   "css": { "parser": { "cssModules": true, "tailwindDirectives": true } }
   ```

5. Parallel route `default.tsx` files — N/A until Phase 4 adds parallel routes. Noted here for tracking.

6. Verify:
   - `bun run lint` → 0 errors
   - `bunx tsc --noEmit` → 0 errors
   - `bun run build` → success
   - `bun dev` → HTTP 200 on `http://localhost:3000/`

7. Push `phase-0-scaffold` to GitHub. Connect to Vercel. **Deferred** until end of Phase 1 — no value shipping a blank app immediately before auth lands.

### Files to create/modify

- `biome.json` — added, Tailwind directives enabled
- `package.json` — scripts updated; `@biomejs/biome` and `convex` added; `eslint*` removed
- `tsconfig.json` — path alias points at `src/`
- `src/app/{layout.tsx,page.tsx,globals.css,favicon.ico}` — moved from `app/`
- `eslint.config.mjs` — removed
- `src/proxy.ts` — not created yet; added in Phases 1 & 2
- `src/app/[locale]/default.tsx` — added in Phase 2 with i18n routing

### Exit criteria

- [x] `bun dev` starts and serves HTTP 200
- [x] `bun run lint` (Biome) passes
- [x] `bunx tsc --noEmit` passes
- [x] `bun run build` passes
- [x] `npx convex dev` connects (deployment `dev:brazen-oriole-651`, EU-West-1)
- [x] `npx convex ai-files install` installed Convex agent skills under `.agents/skills/`
- [x] Vercel linked — auto-deploys on push to `main`

---

## Phase 1: Authentication

### What to do

1. Install Convex Auth:
   ```bash
   bun add @convex-dev/auth @auth/core
   ```

2. Set up Google OAuth following: https://labs.convex.dev/auth/config/oauth/google

3. Deploy the Convex schema with `authTables` first (before adding app tables).

4. Google Cloud Console setup:
   - Create OAuth 2.0 client credentials
   - Authorized JavaScript origins: `http://localhost:3000` + Vercel production URL
   - Authorized redirect URIs: Convex HTTP Actions URL + `/api/auth/callback/google`

5. Set Convex environment variables:
   ```bash
   npx convex env set AUTH_GOOGLE_ID "..."
   npx convex env set AUTH_GOOGLE_SECRET "..."
   npx convex env set SITE_URL "http://localhost:3000"
   npx convex env set ALLOWED_EMAILS "email1@gmail.com,email2@gmail.com"
   ```

6. Implement email whitelist check — after OAuth completes, verify the user's email is in `ALLOWED_EMAILS`. If not, reject with: `"Þetta netfang hefur ekki aðgang. Hafðu samband við Nic."`

7. Build the `/login` page:
   - Single "Skrá inn með Google" button — large, centered, obvious
   - Rejection message display for non-whitelisted emails
   - This is the only page accessible without auth

8. Wire `src/proxy.ts` to redirect unauthenticated users to `/[locale]/login`.

### Important gotcha

Convex Auth docs reference `middleware.ts`. For Next.js 16:
- File must be `proxy.ts`, and if `app/` lives under `src/`, the proxy must be at `src/proxy.ts` (not project root). Next.js resolves it at the same level as `app/`.
- MUST use `export default`, not a named `proxy` export. Turbopack's server bundle resolves via `middlewareModule.default || middlewareModule`; a named-only export works for trivial unwrapped bodies but fails at request time when wrapped by `convexAuthNextjsMiddleware` (or `createMiddleware` from next-intl) with `TypeError: adapterFn is not a function`.
- Use `convexAuthNextjsMiddleware` — its `NextMiddleware` return type is compatible with Next.js 16's proxy convention.

### Files to create/modify

- `convex/auth.ts` — Convex Auth config with Google OAuth provider + whitelist check
- `convex/auth.config.ts` — JWT provider config (generated by `npx @convex-dev/auth`)
- `convex/http.ts` — HTTP router for auth callbacks
- `convex/schema.ts` — Start with just `...authTables`
- `convex/users.ts` — `me` query returning the authenticated user
- `src/app/login/page.tsx` — Login page (moved to `[locale]/login/page.tsx` in Phase 2)
- `src/app/page.tsx` — Authenticated landing page (placeholder; real dashboard in Phase 5)
- `src/components/ConvexClientProvider.tsx` — wraps app with `ConvexAuthNextjsProvider`
- `src/proxy.ts` — Auth redirect logic (must live next to `app/`, i.e. in `src/`)
- `.env.local` — `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`

### Status (2026-04-16)

Code complete. Env vars set: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL`, `ALLOWED_EMAILS`. Unauthed `/` → 307 redirect to `/login` verified with curl. End-to-end Google OAuth flow requires a real browser login — pending a manual test by Nic.

### Exit criteria

- [x] `/login` renders with "Skrá inn með Google" button
- [x] Unauthenticated visitors → redirected to `/login`
- [x] `src/proxy.ts` wired via `convexAuthNextjsMiddleware` (Next.js 16 compatible, default export)
- [x] `convex/users.ts` `me` query returns the authenticated user
- [ ] Can sign in with a whitelisted Google account → lands on `/` with "Halló {name}" (browser test, pending)
- [ ] Non-whitelisted account → sees Icelandic rejection message "Þetta netfang hefur ekki aðgang. Hafðu samband við Nic." (browser test, pending)

---

## Phase 2: Internationalization (i18n)

### What to do

1. Install next-intl:
   ```bash
   bun add next-intl
   ```

2. Configure locale routing:
   - Default locale: `is` (Icelandic) — **no URL prefix**
   - Secondary locale: `en` — URL prefix `/en/...`

3. Create translation files `messages/is.json` and `messages/en.json` with the namespace structure from the spec: `common`, `nav`, `dashboard`, `appointments`, `log`, `medications`, `contacts`, `entitlements`, `documents`, `auth`.

4. Populate all known UI strings from the spec into `is.json`. Mirror to `en.json`.

5. Wire `NextIntlClientProvider` into `[locale]/layout.tsx`.

6. Call `setRequestLocale(locale)` in all layouts and pages (required for static rendering).

7. Merge i18n routing into `src/proxy.ts` alongside the auth redirect from Phase 1. This is the trickiest integration point — both auth and locale concerns live in the same file.

### Next.js 16 specifics for next-intl

- In `next.config.ts`: use `skipProxyUrlNormalize` (NOT `skipMiddlewareUrlNormalize`)
- `src/proxy.ts` MUST `export default` its middleware function. A named `export const proxy` works for trivial unwrapped bodies, but every real proxy in this project is wrapped by `createMiddleware` (next-intl) or `convexAuthNextjsMiddleware`, and Turbopack resolves the server bundle via `middlewareModule.default || middlewareModule` — a named-only export throws `TypeError: adapterFn is not a function` at request time.
- Route-level metadata must be per-locale. Do NOT use `export const metadata = { ... }` in `src/app/[locale]/layout.tsx` — that ships the Icelandic (default) description to `/en/...` visitors too. Use `generateMetadata` with `getTranslations`:

  ```ts
  import { getTranslations } from "next-intl/server";
  export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "app" });
    return { title: t("name"), description: t("tagline") };
  }
  ```

  `messages/{is,en}.json` must carry `app.name` and `app.tagline` for this to resolve.

### Key translation namespaces (from spec)

```
common: save, cancel, edit, delete, add, back, loading, lastUpdated, by
nav: dashboard ("Í dag"), log ("Dagbók"), appointments ("Tímar"), info ("Upplýsingar")
auth: signIn, signInWithGoogle, signOut, notAllowed
```

Fill out the rest as each view is built.

### Files to create/modify

- `messages/is.json`
- `messages/en.json`
- `src/i18n/routing.ts`
- `src/i18n/request.ts`
- `src/app/[locale]/layout.tsx` — add `NextIntlClientProvider`; locale-aware metadata via `generateMetadata` (not a static `metadata` export)
- `src/proxy.ts` — combine auth + locale routing (default-exported)
- `next.config.ts` — add `skipProxyUrlNormalize`

### Exit criteria

- Login page renders in Icelandic by default
- `/en/login` renders in English
- All UI strings come from translation files — nothing hardcoded
- Root metadata (title + description) is locale-aware via `generateMetadata`, not a static `metadata` export

---

## Phase 3: Schema & Seed Data

### What to do

1. Deploy the full Convex schema from the spec. Tables: `appointments`, `logEntries`, `medications`, `contacts`, `entitlements`, `documents` (plus the existing `authTables`).

2. Write `convex/seed.ts` using the **real data from the spec**. This is NOT placeholder data — it's real medications, contacts, and entitlements gathered from the family Messenger chat and confirmed with Helga.

3. The seed data includes:
   - **5 medications** (all with confirmed dosages from Helga):
     - Kisqali (ribociclib) — 3 töflur, á morgnana
     - Eliquis (apixaban) — 1 tafla tvisvar á dag
     - WhiteEyes augndropa — 2 dropar, á morgnana
     - Retina Clear — 1 hylki, á morgnana
     - Andhormónalyf (sprauta) — á 2ja vikna fresti (exact drug name unknown — ask at next Brjóstamiðstöð visit)
   - **~14 contacts** across emergency (3), medical (3), and municipal (8) categories, all with real phone numbers, addresses, notes. The `family` and `other` schema categories exist but have no seed entries yet — they fill in once family phone numbers are gathered (see Open Items).
   - **2 known entitlements** (certificates from Brjóstamiðstöð — heimahjúkrun is marked BRÝNT/urgent) + **9 researched entitlements** from SÍ/Kópavogur/Heilsugæslan

4. Handle the `updatedBy`/`createdBy` fields in seed data — these require a user ID. Options:
   - Make the seed function an internal mutation that uses a system-level approach
   - Or: run the seed after the first user logs in, using their ID
   - Decide based on what Convex Auth makes easiest

5. Verify all indexes are created correctly.

### Files to create/modify

- `convex/schema.ts` — Full schema (copy from spec, it's complete)
- `convex/seed.ts` — All seed data from the spec's "Seed Data — Real" section

### Exit criteria

- Convex dashboard shows all tables with correct indexes
- Seed data is loaded: 5 medications, 14 contacts (3 emergency + 3 medical + 8 municipal; family/other added later when phone numbers arrive), 11 entitlements all present
- Data matches the spec exactly (including Icelandic text, phone numbers, notes)

---

## Phase 4: App Shell — Layout & Bottom Navigation

### What to do

**Note:** All shell components in this phase (`Header`, `BottomNav`, `UserAvatar`, `EmptyState`) are built on shadcn primitives (`Button`, `Card`, `Avatar`, `DropdownMenu`, etc.). The warm palette is merged into shadcn's `:root` CSS variable scheme in `src/app/globals.css` — the shadcn variables (`--background`, `--foreground`, `--primary`, etc.) are mapped to the warm cream/teal/amber values rather than using a separate `@theme inline` block.

1. Build the root `[locale]/layout.tsx`:
   - `ConvexProvider` wrapping everything
   - `NextIntlClientProvider` for translations
   - `AuthGate` component — redirects to login if not authenticated
   - The warm color palette is declared inline in `src/app/globals.css` via shadcn's `:root` CSS variable scheme (Tailwind v4 idiom — no JS config file). The layout just imports `globals.css` once.

2. Build `BottomNav.tsx` — fixed bottom, 4 tabs (routes evolved during implementation; see Phase 12 for final layout):
   | Icon (BookIcon kind) | Label | Route |
   |---|---|---|
   | `today` | Í dag | `/` |
   | `care` | Umönnun | `/umonnun` |
   | `people` | Fólk | `/folk` |
   | `docs` | Pappírar | `/pappirar` |

3. Design rules (non-negotiable for the 60+ users):
   - Tap targets: **56px+ height** for nav items, **48px minimum** everywhere else
   - Font size: **18px body minimum** on mobile
   - Active tab: filled icon + accent color. Inactive: outline + muted.
   - Text labels always visible — **no icon-only navigation**

4. Set up the design system inline in `src/app/globals.css` using Tailwind v4's `@theme inline { ... }` block (no `tailwind.config.ts` — Tailwind v4 reads tokens from CSS). Tokens to declare as `--color-*`, `--font-*`, `--radius-*`:
   - **Backgrounds:** Warm cream/off-white (not clinical white)
   - **Primary accent:** Muted teal or sage
   - **Warning/attention:** Soft amber/gold
   - **Emergency/delete:** Gentle red
   - **Borders/cards:** Rounded corners 12–16px, light shadows
   - **Typography:** Humanist sans-serif that renders Icelandic characters well (ð, þ, æ, ö)

   The shipped palette uses `:root` for raw values and `@theme inline` to expose them as Tailwind utilities. Key tokens: `--page` (#f5f1e8), `--paper` (#faf7f0), `--ink` (#2e342b), `--sage-deep` (#6b7f5c), `--wheat` (#c9b896), `--amber-ink` (#8a6b3a). Fonts: Source Serif 4 (`--font-serif`) + Source Sans 3 (`--font-sans`) via `next/font/google`. The actual file `src/app/globals.css` is the source of truth.

5. Build header component: "Sigga" as app title, user avatar + name top-right, sign-out in dropdown.

6. Create empty page shells for all 4 routes so tab navigation works immediately.

### Files to create/modify

- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/(app)/layout.tsx` — app shell (Header + BottomNav)
- `src/app/[locale]/(app)/page.tsx` (dashboard shell)
- `src/app/[locale]/(app)/umonnun/page.tsx` (empty shell, later populated in Phase 6)
- `src/app/[locale]/(app)/timar/page.tsx` (empty shell)
- `src/app/[locale]/(app)/folk/page.tsx` (empty shell, later populated in Phase 9)
- `src/app/[locale]/(app)/pappirar/page.tsx` (empty shell, later populated in Phase 12)
- `src/components/nav/BottomNav.tsx`
- `src/components/shared/Header.tsx`
- `src/components/shared/UserAvatar.tsx`
- `src/components/shared/BookIcon.tsx` — custom icon kit for nav
- `src/app/globals.css` — Bókasafn palette tokens via `:root` + `@theme inline` (Tailwind v4 — no JS config file)
- `src/components/ConvexClientProvider.tsx` — ConvexProvider setup

### Exit criteria

- Can tap between all 4 tabs, active state is obvious
- Shell feels warm, not clinical
- 18px+ body text, large tap targets
- Icelandic characters render correctly in nav labels
- Works well at 375×812 viewport (iPhone)

---

## Phase 5: Dashboard — "Í dag"

### What to do

The landing page answers: "What's happening with amma right now?"

1. **Convex queries needed:**
   - `appointments.list` — filter `status: "upcoming"`, order by `startTime`, limit 3
   - `logEntries.recent` — latest 3 entries by `_creationTime` desc

2. **NextAppointments card:**
   - Shows next 3 upcoming appointments
   - Each: date/time, title, location, driver name OR "Enginn skutlar" with "Ég get!" button
   - Empty state: "Engir tímar á næstunni"

3. **RecentLog card:**
   - Latest 3 log entries
   - Each: date (relative), author avatar + name, content truncated to ~3 lines with "Lesa meira"
   - "Skrifa í dagbók" button at bottom → navigates to `/dagbok` (Phase 5 ships a Link; the in-place quick-add form is **deferred to Phase 6**, which builds the Dagbók full view with its bottom-sheet entry form)

4. **QuickActions row:**
   - "Nýr tími" → navigates to appointment creation
   - "Skrifa í dagbók" → navigates to `/dagbok` (**deferred**: Phase 6 adds the bottom-sheet form; Phase 5 ships navigation-only links as placeholders)

5. All data via Convex `useQuery` — real-time by default.

### Files to create/modify

- `convex/appointments.ts` — `list`, `upcoming`, `get`, `create`, `update`, `remove`, `volunteerToDrive`
- `convex/logEntries.ts` — `list`, `recent`, `add`, `update`
- `src/app/[locale]/page.tsx` — Dashboard view
- `src/components/dashboard/NextAppointments.tsx`
- `src/components/dashboard/RecentLog.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/shared/EmptyState.tsx`

### Exit criteria

- Dashboard shows seeded data (or correct empty states)
- Real-time: open two tabs, add data in one, it appears in the other without refresh
- Quick actions navigate correctly
- Relative dates display in Icelandic

### Status (2026-04-17, revised 2026-04-18)

Code complete and subsequently redesigned. The original Phase 5 plan described a `QuickActions` row and a 3-entry `RecentLog`. The shipped dashboard evolved into a different layout before/during Phase 8.5:

- [x] `convex/appointments.ts` — `list`, `upcoming` (now also accepts `includeCancelled: boolean` for the dashboard's cancelled-slot display), `get`, `create`, `update`, `remove`, `volunteerToDrive` shipped.
- [x] `convex/logEntries.ts` — `list`, `recent`, `add`, `update` shipped. `update` enforces `authorId === currentUser`.
- [x] `src/components/shared/EmptyState.tsx` shipped.
- [x] Icelandic relative-date helper (`src/lib/formatDate.ts`).
- [x] Translation keys added under `dashboard.*` and `common.*`.
- [x] `QuickActions.tsx` was shipped in Phase 5 then **removed** in later redesign.
- [x] Dashboard redesigned: greeting heading + `AttentionCard` (unowned entitlements, amber) + `DrivingCta` (unassigned appointments, amber) + `NextAppointments` (3 upcoming, includes cancelled slots) + `RecentLog` (single latest entry with inline expand + in-place `LogEntryForm` sheet). `QuickActions` removed.

The following exit-criteria items require user browser verification post-deploy (the agent cannot complete Google OAuth to reach authenticated routes):

- [ ] Warm palette renders correctly at 375×812 — visual check
- [ ] Relative dates display in Icelandic in the browser
- [ ] Real-time two-tab update — open dashboard in two tabs, add a log entry in one, confirm it appears in the other without refresh
- [ ] Volunteer button flow — "Ég get!" on an appointment without a driver sets the current user as driver in one tap

---

## Phase 6: Dagbók (Log) — now a tab inside `/umonnun`

**Note:** The standalone `/dagbok` route was removed. Dagbók is now the first tab inside the Umönnun view (`/umonnun`). The `LogFeed` and `LogEntryForm` components are unchanged; they just render inside `UmonnunView.tsx` (shadcn `Tabs`, defaultValue="dagbok") instead of a dedicated page.

### What to do

Reverse-chronological care journal. Keep the entry form dead simple — text box + save button. No title, no categories, no tags.

1. **Feed:** Entries newest-first. Each card shows:
   - Author avatar + name
   - Date + time (relative for recent: "í gær", "fyrir 3 dögum"; absolute for older)
   - Full content (no truncation in feed view)
   - "Breytt" badge if `editedAt` is set
   - Edit button (pencil) — only visible to original author
   - Linked appointment as a small chip (if any)

2. **Entry form (bottom sheet):**
   - Multiline text input
   - Placeholder: "Hvað gerðist? Hvaða upplýsingar eru mikilvægar?"
   - Optional: link to appointment (dropdown of recent/upcoming)
   - "Vista" button

3. **Edit flow:** Same form, pre-filled. Sets `editedAt`. Author-only — mutation must verify `authorId === currentUser`.

4. **Pagination:** Load 20 initially. "Sýna eldri" button at bottom.

5. **FAB or sticky bar** with "Skrifa" button.

### Files to create/modify

- `src/app/[locale]/(app)/umonnun/page.tsx` — server wrapper (replaces the planned `/dagbok/page.tsx`)
- `src/app/[locale]/(app)/umonnun/UmonnunView.tsx` — client component with Dagbók + Lyf tabs
- `src/components/log/LogFeed.tsx`
- `src/components/log/LogEntryForm.tsx`

### Exit criteria

- Can add entries, see them in real-time
- Can edit own entries, see "Breytt" badge
- Cannot edit others' entries
- Pagination works

### Status (2026-04-17, revised 2026-04-18)

Code complete (commit 59ee3e0). Dagbók subsequently moved from `/dagbok` to a tab inside `/umonnun` (combined with Lyf tab). All implementation tasks done:

- [x] `LogFeed` — paginated via `usePaginatedQuery` (20/page). "Sýna eldri" button loads 20 more. Each card: author avatar + name, relative date, full content, "Breytt" badge when `editedAt` is set, author-only edit button (pencil, `size="touch-icon"`), linked appointment chip.
- [x] `LogEntryForm` — shadcn `Sheet` from bottom (`side="bottom"`, rounded top, `max-h-[92vh]`). Shared create/edit flow: pre-fills content and `relatedAppointmentId` when `editEntry` prop is present. Appointment link dropdown uses `appointments.list` (limit 50). Supports `preselectedAppointmentId` prop for "Skrá í dagbók" jump from Tímar.
- [x] Author-only edit enforcement in `logEntries.update` mutation — throws `ConvexError("Ekki innskráður")` if `authorId !== currentUser`.
- [x] `components.json` and `src/components/ui/` (avatar, button, card, dialog, dropdown-menu, input, label, select, sheet, textarea) added; Phase 4/5 components (`Header`, `BottomNav`, `UserAvatar`, `NextAppointments`, `RecentLog`) retrofitted to use shadcn primitives.
- [x] `UmonnunView.tsx` created — wraps Dagbók + Lyf tabs (Lyf content added in Phase 8).

The following exit-criteria items require user browser verification post-deploy:

- [ ] Real-time feed update — add an entry in one tab, confirm it appears in another without refresh
- [ ] "Breytt" badge displays correctly after editing own entry
- [ ] Author-only enforcement — edit button absent for others' entries (visual check)

---

## Phase 7: Tímar (Appointments)

### What to do

1. **Toggle tabs:** "Næstu tímar" (Upcoming) | "Liðnir tímar" (Past). Default: upcoming.

2. **Upcoming list** (soonest first). Each card:
   - Date + time in Icelandic format: "fös. 18. apríl kl. 14:00"
   - Title, location, notes preview
   - Driver: avatar + name if assigned. If not: "Enginn skutlar" + **"Ég get!" one-tap volunteer button**
   - `volunteerToDrive` mutation: sets `driverId` to current user immediately

3. **Past list** (most recent first):
   - Same layout, driver is static (no volunteer button)
   - "Skrá í dagbók" shortcut to create linked log entry

4. **Add appointment form:**
   - Title (required), date/time picker (native mobile), location, notes, driver dropdown
   - "Vista" button

5. **Delete confirmation:** "Ertu viss? Þetta er ekki hægt að afturkalla."

6. **Icelandic date formatting** — use `next-intl` formatters or `Intl.DateTimeFormat` with `is` locale.

### Files to create/modify

- `src/app/[locale]/timar/page.tsx`
- `src/components/appointments/AppointmentCard.tsx` — single appointment card component (upcoming + past variants); extracted during implementation for clarity
- `src/components/appointments/AppointmentList.tsx`
- `src/components/appointments/AppointmentForm.tsx`
- `src/components/appointments/DriverPicker.tsx`

### Exit criteria

- Full CRUD works
- Driver volunteering is a single tap — no extra confirmation
- Upcoming/past toggle works
- Icelandic date formatting is correct

### Status (2026-04-17)

Code complete (commit 8f4356d). All implementation tasks done:

- [x] `AppointmentList` — tab toggle ("Næstu tímar" / "Liðnir tímar") with `role="tablist"` aria pattern, `min-h-12` tab buttons. Upcoming uses `api.appointments.upcoming` (limit 50); past uses the new `api.appointments.past` query. Inactive tab is skipped (`"skip"`) to avoid unnecessary fetches.
- [x] `AppointmentCard` — extracted component handling both variants. Upcoming: driver avatar or "Enginn skutlar" + "Ég get!" volunteer button. Past: static driver display + "Skrá í dagbók" button that opens `LogEntryForm` with `preselectedAppointmentId`.
- [x] `AppointmentForm` — shadcn `Sheet` from bottom. Date/time via `<input type="datetime-local">` (native mobile picker). `DriverPicker` dropdown populated from `api.users.list`. Edit mode pre-fills all fields. Delete button triggers a shadcn `Dialog` confirmation ("Ertu viss? Þetta er ekki hægt að afturkalla.") with `showCloseButton={false}`.
- [x] `convex/appointments.past` — new query using `.withIndex("by_startTime", q => q.lt("startTime", now)).order("desc").take(limit ?? 50)`. Not in original plan — added for Tímar past-tab.
- [x] `convex/users.list` — new query returning all users as `{ _id, name, email, image }` summaries. Used by `DriverPicker`.
- [x] "Skrá í dagbók" jump — past appointment card opens `LogEntryForm` with the appointment pre-selected via `preselectedAppointmentId` prop (already supported by `LogEntryForm` from Phase 6).

The following exit-criteria items require user browser verification post-deploy:

- [ ] Volunteer button assigns driver in one tap and updates immediately (real-time, visual check)
- [ ] Icelandic date formatting displays correctly in the browser (e.g., "fös. 18. apríl kl. 14:00")
- [ ] Full CRUD — create, edit, delete appointment — visual check post Google OAuth login

---

## Phase 8: Upplýsingar — Lyf (Medications)

### What to do

1. **Active medications list:** Each row shows name, dose + schedule, purpose.
   - Tap row → expand to show prescriber, notes, last updated + who updated
   - The anti-hormone injection entry notes that the exact drug name is unknown — this is intentional, it will be updated after the next Brjóstamiðstöð visit

2. **"Sýna eldri lyf" toggle** for inactive medications.

3. **Add/edit form:** Name (required), dose+schedule (required, free text), purpose, prescriber, notes, active toggle.

4. **"Bæta við lyfi" button.**

### Convex functions

- `medications.list` — args: `{ activeOnly?: boolean }`
- `medications.create` — auto-set `updatedAt`, `updatedBy`, `isActive: true`
- `medications.update` — set `updatedAt`, `updatedBy`

### Files to create/modify

- `convex/medications.ts`
- `src/components/info/MedicationTable.tsx`
- `src/components/info/MedicationForm.tsx`

### Exit criteria

- All 5 seeded medications display correctly with their confirmed dosages
- Can add, edit, deactivate medications
- Inactive toggle works

### Status (2026-04-17)

Code complete. All implementation tasks done:

- [x] `convex/medications.ts` — `list` (with `activeOnly` arg), `create`, `update`, `remove`. `list` enriches each row with a `updatedByUser` summary (name/email/image) and sorts alphabetically with Icelandic collation (`localeCompare(..., "is")`). All mutations require auth via `requireAuth` and throw `ConvexError("Ekki innskráður")` if unauthenticated; field-level validation rejects empty name/dose/schedule.
- [x] `MedicationTable` — collapsed rows show name, dose + schedule, purpose. Tap row to expand; expanded reveals prescriber, notes, updatedAt + updatedByUser avatar/name, and an "Breyta" button. "Sýna eldri lyf" / "Fela eldri lyf" toggle renders only when there are inactive medications. "Bæta við lyfi" button opens the create sheet.
- [x] `MedicationForm` — shadcn `Sheet` from bottom (`side="bottom"`, `rounded-t-2xl`, `max-h-[95vh]`). Shared create/edit flow, pre-fills fields on edit. Active checkbox shown only when editing (new medications default to active on the server). Placeholder strings ("1 tafla", "Á morgnana") guide free-text dose/schedule input.
- [x] Translation keys added under `medications.*` in `messages/is.json` + `messages/en.json` (title, add, createTitle/editTitle, empty, showInactive/hideInactive, fields.*, placeholders.*, errors.*).
- [x] `MedicationTable` now renders as the "Lyf" tab inside `UmonnunView.tsx` (`/umonnun`). There is no standalone Upplýsingar page; the container arrangement was redesigned in Phase 12 (see below).

Dependencies added to `convex/_generated/api.d.ts` manually (local codegen needs Convex auth which isn't available in this session). Schema was already in place from Phase 3.

The following exit-criteria items require user browser verification post-deploy (the agent cannot complete Google OAuth to reach authenticated routes):

- [ ] All 5 seeded medications display correctly with their confirmed dosages — visual check
- [ ] Expand row → prescriber/notes/updatedAt render correctly
- [ ] Create + edit + active toggle flow — visual check post Google OAuth login

---

## Phase 8.5: Reglulegir tímar (Recurring Appointments)

### Status (2026-04-18)

Complete and merged on branch `claude/recurring-appointments`.

### What to do

Model a recurring appointment series as a small `recurringSeries` table. At any moment each active series has **at most one** upcoming `appointments` row — no schedule materialized beyond "next time". The `appointments.driverId` field continues to handle driver coordination unchanged.

### Convex changes

- `convex/schema.ts` — add `recurringSeries` table (see spec Data Model); add `seriesId: v.optional(v.id("recurringSeries"))` and `by_series_and_startTime` index to `appointments`.
- `convex/recurringSeries.ts` — new file: `list`, `get`, `create`, `update`, `setActive`, `remove` (public); `ensureNextOccurrences` (internal); `ensureNextOccurrence(ctx, seriesId)` exported helper.
- `convex/appointments.ts` — `update` and `remove` call `ensureNextOccurrence(ctx, existing.seriesId)` when a series-bound row transitions out of `"upcoming"` or is deleted.
- `convex/crons.ts` — new file: daily `crons.cron("10 0 * * *", ...)` invokes `internal.recurringSeries.ensureNextOccurrences`. Uses `crons.cron` (not the deprecated `crons.daily`).
- `src/lib/formatRecurrence.ts` — new file: `computeNextStartTime`, `formatDays` helpers.

### UI changes

- `src/app/[locale]/(app)/timar/reglulegir/page.tsx` — new server wrapper.
- `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx` — new client component: series list + create/edit/delete/pause-resume flows.
- `src/components/recurringSeries/SeriesList.tsx`, `SeriesCard.tsx`, `SeriesForm.tsx`, `DayPicker.tsx` — new components.
- `src/components/timar/SeriesEntryRow.tsx` — new component inserted into `TimarView` above the tabs. Shows active-series count; links to `/timar/reglulegir`.
- `src/app/[locale]/(app)/timar/TimarView.tsx` — existing client component updated to include `SeriesEntryRow`.
- `src/components/appointments/AppointmentCard.tsx` — refactored to borderless Bókasafn aesthetic (`bg-paper ring-1 ring-foreground/10 rounded-2xl` shell; `font-serif` title; `text-ink-faint`/`text-ink-soft`; `border-t border-divider` row separators). No behaviour change.
- `src/app/globals.css` — `--color-divider` and `--color-divider-strong` registered in `@theme inline` so `border-divider` Tailwind utility resolves.
- `src/components/ui/switch.tsx` — shadcn `Switch` primitive installed.

### i18n

New `recurring` namespace in `messages/is.json` and `messages/en.json`. Keys: `title`, `backToTimar`, `entryLabel`, `entryCount` (ICU plural), `entryAllPaused`, `empty.*`, `newButton`, `active`, `paused`, `edit`, `delete`, `deleteConfirm.*`, `pauseToast`, `resumeToast`, `form.*`, `cadence`. Note: `pauseToast` and `resumeToast` translation keys exist but are not yet consumed by any UI component (toast implementation deferred).

### Exit criteria

- [x] `recurringSeries` table in schema with `by_active` index
- [x] `appointments` gains `seriesId` field and `by_series_and_startTime` index
- [x] `recurringSeries.create` inserts series + spawns first upcoming appointment
- [x] `setActive(false)` (pause) deletes upcoming occurrence; `setActive(true)` (resume) spawns next
- [x] `remove` nulls `seriesId` on past rows and deletes the upcoming row
- [x] `appointments.update`/`remove` hook calls `ensureNextOccurrence` on status transition
- [x] Daily cron (`crons.cron`) calls `ensureNextOccurrences` — uses `crons.cron` not `crons.daily`
- [x] `/timar/reglulegir` page renders series list, pause/play toggle, edit sheet, delete confirmation
- [x] `SeriesEntryRow` above tabs on Tímar page shows active count
- [x] `AppointmentCard` refactored to borderless aesthetic
- [x] `--color-divider` registered in `@theme inline` so `border-divider` class resolves
- [x] `recurring` i18n namespace present in both locale files

The following items require user browser verification post-deploy:

- [ ] Create a series → next matching occurrence appears in Tímar upcoming list
- [ ] Pause series → upcoming row disappears; resume → reappears (visual + real-time two-tab check)
- [ ] Cancel a series-spawned appointment → next occurrence spawns automatically
- [ ] Delete series with confirmation → past occurrences survive in Liðnir tímar

---

## Phase 9: Upplýsingar — Símaskrá (Contacts)

### What to do

**This is arguably the most important tab.** The #1 use case: someone needs a number, opens the app, finds it, taps to call. Zero extra steps.

1. **Grouped by category** with Icelandic headers:
   - Neyð (Emergency)
   - Læknar og heilsugæsla (Medical)
   - Sveitarfélag og þjónusta (Municipal/Services)
   - Fjölskylda (Family)
   - Annað (Other)

2. Each contact shows: name, role, **tappable phone number (`tel:` link)**, tappable email (`mailto:` link), notes.

3. **Phone numbers MUST be tappable.** Non-negotiable. Use `<a href="tel:+354XXXXXXX">` for Icelandic numbers, `<a href="tel:112">` for emergency.

4. Add/edit/remove contact forms.

### Convex functions

- `contacts.list` — ordered by `sortOrder` within category
- `contacts.create`, `contacts.update`, `contacts.remove`

### Files to create/modify

- `convex/contacts.ts`
- `src/components/info/ContactList.tsx`
- `src/components/info/ContactForm.tsx`

### Exit criteria

- All seeded contacts display in correct groups (Neyð, Læknar og heilsugæsla, Sveitarfélag og þjónusta — Fjölskylda and Annað sections render empty until those entries are added)
- Tapping a phone number initiates a call on mobile
- Tapping email opens mail client
- Can add/edit/remove contacts

### Status (2026-04-17)

Code complete. All implementation tasks done:

- [x] `convex/contacts.ts` — `list`, `create`, `update`, `remove`. `list` returns all contacts sorted by `sortOrder` (nullish last) then by name with Icelandic collation (`localeCompare(..., "is")`). All mutations require auth via `requireAuth`; `create`/`update` reject empty `name`. No `updatedBy`/`updatedAt` audit fields — the schema doesn't carry them for contacts.
- [x] `ContactList` — groups contacts by category in fixed order (emergency → medical → municipal → family → other); empty categories are hidden. Each card: name, role, tappable phone (`tel:` prefixed chip with phone icon and `min-h-12`), tappable email (`mailto:` chip), notes, per-row edit button (`touch-icon` size). Phone href normalisation: short codes (≤ 4 digits) preserved (`112`, `1770`); numbers already starting with `+` or `354` kept; other Icelandic numbers get `+354` prefix and non-digits stripped.
- [x] `ContactForm` — shadcn `Sheet` from bottom (`side="bottom"`, `rounded-t-2xl`, `max-h-[95vh]`). Shared create/edit flow. Category chosen via shadcn `Select`; phone uses `type="tel"` + `inputMode="tel"`, email uses `type="email"` + `inputMode="email"`. Edit mode adds a destructive delete button that opens a shadcn `Dialog` confirmation ("Ertu viss? Þetta er ekki hægt að afturkalla.", `showCloseButton={false}`).
- [x] Translation keys added under `contacts.*` in `messages/is.json` + `messages/en.json` (title, add, createTitle/editTitle, empty, deleteConfirm, categories.*, fields.*, placeholders.*, errors.*).
- [x] `ContactList` and `EmergencyTiles` now render on the `/folk` page (`src/app/[locale]/(app)/folk/page.tsx`). There is no shared Upplýsingar container; contacts are a standalone route — see Phase 12 for the final layout.

`convex/contacts` added to `convex/_generated/api.d.ts` manually (local codegen needs Convex auth which isn't available in this session). Schema was already in place from Phase 3.

The following exit-criteria items require user browser verification post-deploy (the agent cannot complete Google OAuth to reach authenticated routes):

- [ ] All seeded contacts display in correct groups (Neyð: 3, Læknar og heilsugæsla: 3, Sveitarfélag og þjónusta: 8) — visual check
- [ ] Tapping a phone number initiates a call on mobile — physical device check
- [ ] Tapping email opens mail client — physical device check
- [ ] Add / edit / delete contact flow — visual check post Google OAuth login

---

## Phase 10: Upplýsingar — Réttindi (Entitlements)

### What to do

1. **Status-grouped display** (in this order):
   - Í vinnslu (In progress) — highlighted, shown first
   - Ekki sótt um (Not applied) — shown second
   - Samþykkt (Approved) — check mark
   - Hafnað (Denied) — muted

2. Each card: title, institution (appliedTo), owner avatar + name, notes, color-coded status badge.

3. Add/edit form: title, status dropdown, applied to, owner picker (family members), description, notes.

4. **Note:** The heimahjúkrun entitlement is marked BRÝNT (urgent) in the seed data — it's needed so anti-hormone injections and blood draws can happen at home instead of requiring hospital trips every 2 weeks. The app should make the urgency visible through the notes field.

### Convex functions

- `entitlements.list` — ordered by status priority
- `entitlements.create`, `entitlements.update`, `entitlements.remove`

### Files to create/modify

- `convex/entitlements.ts`
- `src/components/info/EntitlementList.tsx`
- `src/components/info/EntitlementForm.tsx`

### Exit criteria

- All seeded entitlements (both known and researched) display correctly
- Status grouping and color coding works
- Can update status, assign owner

### Status (2026-04-17)

Code complete. All implementation tasks done:

- [x] `convex/entitlements.ts` — `list`, `create`, `update`, `remove`. `list` enriches each row with `ownerUser` and `updatedByUser` summaries and sorts by status priority (`in_progress` → `not_applied` → `approved` → `denied`) then by title with Icelandic collation. All mutations require auth via `requireAuth` and reject empty titles.
- [x] `EntitlementList` — status-grouped display with Icelandic section headers; empty statuses hidden. Each card carries a color-coded status pill (teal `in_progress`, amber `not_applied`, emerald `approved`, muted `denied`) with a matching Lucide icon. Urgency surfaces via a regex check on `notes` for the word "brýnt" (case-insensitive) — matching cards get an orange BRÝNT pill and a warning-tinted border. Cards show title, appliedTo, description, notes, owner avatar + name, and last-updated footer.
- [x] `EntitlementForm` — shadcn `Sheet` from bottom (`side="bottom"`, `rounded-t-2xl`, `max-h-[95vh]`). Fields: title, status `Select`, appliedTo, owner `Select` (populated from `api.users.list` with a "None selected" option), description, notes. Edit mode pre-fills all fields and surfaces a destructive delete behind a shadcn `Dialog` confirmation.
- [x] Translation keys added under `entitlements.*` in `messages/is.json` + `messages/en.json` (title, add, createTitle/editTitle, empty, urgent, owner, deleteConfirm, statuses.*, fields.*, placeholders.*, errors.*).
- [x] `EntitlementList` now renders as the "Réttindi" tab inside `PappirarTabs` (`/pappirar`). See Phase 12 for the final layout.

`convex/entitlements` added to `convex/_generated/api.d.ts` manually (local codegen needs Convex auth which isn't available in this session). Schema was already in place from Phase 3.

The following exit-criteria items require user browser verification post-deploy (the agent cannot complete Google OAuth to reach authenticated routes):

- [ ] All 11 seeded entitlements display correctly with status grouping — visual check
- [ ] BRÝNT urgency pill renders on the heimahjúkrun entitlement (whose `notes` start with "BRÝNT:") — visual check
- [ ] Color coding reads at a glance for 60+ users — visual check
- [ ] Create / edit / delete entitlement and assign owner flow — visual check post Google OAuth login

---

## Phase 11: Upplýsingar — Skjöl (Documents)

### What to do

1. **File list:** Title, filename, category tag, upload date, uploaded by.

2. **Upload flow (Convex file storage):**
   ```
   Client calls generateUploadUrl mutation
   → Client POSTs file to returned URL
   → Client receives storageId
   → Client calls save mutation with storageId + metadata
   ```

3. **Upload form:** File picker (hidden `<input type="file">` triggered by a shadcn Button), title (pre-fill from filename), category (free text with suggestions via `<datalist>`: "Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn", "Vottorð"), notes.

4. **View/download:** `storage.getUrl(storageId)` — tap opens in browser/downloads.

5. **Delete:** Confirmation required. Deletes both the document record AND the file from storage.

### Convex functions

- `documents.list`, `documents.generateUploadUrl`, `documents.save`, `documents.abandonUpload`, `documents.remove`

### Files to create/modify

- `convex/documents.ts`
- `src/components/info/DocumentList.tsx`
- `src/components/info/DocumentUpload.tsx`

### Exit criteria

- Can upload a file from mobile, see it in the list
- Can tap to view/download
- Can delete (with confirmation)

### Status (2026-04-17)

Code complete. All implementation tasks done:

- [x] `convex/documents.ts` — `list`, `generateUploadUrl`, `save`, `remove`. `list` enriches each row with a signed `url` (`ctx.storage.getUrl`) and an `addedByUser` summary, sorted newest-first by `_creationTime`. `generateUploadUrl` and `save` gate on auth via `requireAuth`; `save` rejects empty title/filename. `remove` calls `ctx.storage.delete(storageId)` before deleting the row so no orphaned blobs remain.
- [x] `getUrl` — **not** shipped as a separate query. The spec listed one but list already embeds URLs, so an extra round-trip isn't needed. If a URL goes stale in practice, add one later.
- [x] `DocumentList` — one card per document: file icon in a teal tile, title, `fileName · size`, category pill, notes, primary "Opna" button that opens the signed URL in a new tab, destructive delete (`touch-icon`) that opens a shadcn `Dialog` confirmation. Footer row shows `addedByUser` avatar + upload date (`Intl.DateTimeFormat(locale)`).
- [x] `DocumentUpload` — shadcn `Sheet` from bottom. Native `<input type="file">`. Title auto-fills from the filename (sans extension) until the user edits it; a `titleDirty` flag stops further autofill so edits aren't clobbered. Category uses a native `<datalist>` with 5 Icelandic suggestions (Lyfseðill / Blóðprufa / Bréf frá lækni / Umsókn / Vottorð) — mobile-safe, free-text fallback. Notes field. Two-step upload: `generateUploadUrl` → `fetch(POST, body=file)` → `save({ storageId, metadata })`. Errors are surfaced in Icelandic.
- [x] Translation keys added under `documents.*` in `messages/is.json` + `messages/en.json` (title, upload, uploading, uploadTitle, download, unavailable, empty, emptyHint, deleteConfirm, fields.*, placeholders.*, errors.*).
- [x] `DocumentList` now renders as the "Skjöl" tab inside `PappirarTabs` (`/pappirar`). See Phase 12 for the final layout.

`convex/documents` added to `convex/_generated/api.d.ts` manually (local codegen needs Convex auth which isn't available in this session). Schema was already in place from Phase 3.

The following exit-criteria items require user browser verification post-deploy (the agent cannot complete Google OAuth, upload a real file, or verify Convex storage behaviour):

- [ ] Can upload a file from mobile (native file picker opens; a PDF or image uploads successfully)
- [ ] Uploaded document appears in the list with correct title/filename/size/category
- [ ] Tapping "Opna" opens/downloads the file in a new browser tab
- [ ] Delete confirmation removes both the row and the underlying blob (verify in Convex dashboard that the `_storage` entry is gone)

---

## Phase 12: Info Container — Redesigned Layout

### What was originally planned

A single `/upplysingar` page with a 4-tab bar (Lyf | Símaskrá | Réttindi | Skjöl).

### What was shipped (revised design)

The info content was reorganised across **three** distinct routes matching the bottom-nav redesign. There is no `/upplysingar` route.

**`/umonnun` (Umönnun tab)** — contains `UmonnunView.tsx` with:
- Tab "Dagbók" — `LogFeed` + `LogEntryForm`
- Tab "Lyf" — `MedicationTable` + `MedicationForm`

**`/folk` (Fólk tab)** — server page with:
- `EmergencyTiles` — large tappable tel: tiles for top 3 emergency contacts
- `ContactList` — all other contacts grouped by category

**`/pappirar` (Pappírar tab)** — contains `PappirarTabs.tsx` with:
- Tab "Réttindi" — `EntitlementList` + `EntitlementForm`; URL `?tab=rettindi` (default, no param set)
- Tab "Skjöl" — `DocumentList` + `DocumentUpload`; URL `?tab=skjol`

### Files created/modified

- `src/components/ui/tabs.tsx` — shadcn Tabs primitive
- `src/app/[locale]/(app)/umonnun/UmonnunView.tsx` — Dagbók + Lyf tabs
- `src/app/[locale]/(app)/folk/page.tsx` — contacts standalone page
- `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx` — Réttindi + Skjöl tabs
- `src/components/info/EmergencyTiles.tsx` — emergency contact tiles
- `src/components/nav/BottomNav.tsx` — updated to use new routes + `BookIcon` kit

### Exit criteria

- [x] Bottom nav routes to correct views (Í dag, Umönnun, Fólk, Pappírar)
- [x] Umönnun Dagbók tab: add/edit log entries, pagination
- [x] Umönnun Lyf tab: medication CRUD
- [x] Fólk: tappable emergency tiles + full contact list with tappable phone numbers
- [x] Pappírar Réttindi tab: entitlement CRUD; URL `?tab=rettindi`
- [x] Pappírar Skjöl tab: document upload/list/delete; URL `?tab=skjol`
- [x] State preservation: tab-content forceMount so Convex subscriptions stay active

The following exit-criteria items require user browser verification post-deploy:

- [ ] Tab switching and URL persistence — visual check at 375×812
- [ ] Emergency tiles: tapping initiates a phone call on mobile (physical device check)
- [ ] Active bottom-nav tab is obvious at 60+ contrast — visual check

---

## Phase 13: PWA Configuration

### What to do

1. `public/manifest.json`:
   ```json
   {
     "name": "Sigga",
     "short_name": "Sigga",
     "display": "standalone",
     "start_url": "/",
     "theme_color": "<teal/sage accent color>",
     "background_color": "<cream background color>",
     "lang": "is",
     "icons": [...]
   }
   ```

2. Icons: `icon-192.png` and `icon-512.png`. Simple, warm, recognizable.

3. Apple touch icon + meta tags for iOS splash screens.

4. Service worker: offline shell so app chrome loads without network. Data areas show "Hleð..." until Convex reconnects.

### Files to create/modify

- `public/manifest.json`
- `public/icon-192.png`, `public/icon-512.png`
- `src/app/[locale]/layout.tsx` — add manifest link, meta tags

### Exit criteria

- "Add to Home Screen" works on iOS and Android
- App opens full-screen without browser chrome
- Offline: app shell loads, data shows loading state

---

## Phase 14: Backup Cron Job

### Status: Not yet started

`convex/backup.ts` does not exist. `convex/crons.ts` currently registers only the daily recurring-appointments cron (`"10 0 * * *"`). The weekly backup cron must be added as a second entry in the same file.

### What to do

1. `convex/backup.ts` — `weeklyExport` internal action:
   - Queries all tables
   - Serializes to JSON with ISO timestamps
   - Stores as file in Convex storage
   - Deletes backups older than 4 weeks (keeps last 4)

2. Add weekly cron to `convex/crons.ts` (use `crons.cron`, NOT the deprecated `crons.weekly`):
   ```typescript
   crons.cron(
     "weekly backup",
     "0 3 * * 0",   // Sunday 03:00 UTC
     internal.backup.weeklyExport,
   );
   ```

### Files to create/modify

- `convex/backup.ts` — new file
- `convex/crons.ts` — add weekly backup cron entry

### Exit criteria

- Can manually trigger the backup function
- JSON file appears in Convex storage with all data
- Older backups are cleaned up

---

## Phase 15: Polish & Feedback

### What to do

1. **Toast confirmations** on every mutation: save, delete, edit, volunteer.
2. **Loading states** on all async actions.
3. **Error messages** in Icelandic — friendly, not technical.
4. **Delete confirmations** everywhere: "Ertu viss? Þetta er ekki hægt að afturkalla."
5. **Empty states** with warm, friendly Icelandic text (not just "No data").
6. **Audit all tap targets** — minimum 48px, prefer 56px+.
7. **Test on actual phones** — both iOS and Android, in Icelandic locale.
8. **Accessibility pass** — screen reader labels in Icelandic, sufficient color contrast.

### Exit criteria

- Every action has feedback (toast, loading spinner, or state change)
- No English text leaks into the Icelandic interface
- Usable by a 60-year-old who doesn't read English

---

## Phase 16: Tests

### What to do

1. **Vitest unit tests:**
   - Convex functions: auth checks, data validation, correct return shapes
   - Utility functions: date formatting, locale helpers
   - Components: render tests with mock Convex data, verify Icelandic text

2. **Playwright e2e tests** (all at **375×812 viewport**):
   - Auth flow: login → dashboard. Unauthorized → rejection.
   - Dashboard: appointments + log render, quick actions work
   - Appointments CRUD + driver volunteering
   - Log CRUD + author-only editing + "Breytt" badge
   - Info tabs: navigate all 4, add items, verify persistence
   - File upload → list → download
   - Real-time: two tabs, add in one, appears in other
   - Contacts: verify phone links are tappable

### Files to create/modify

- `tests/unit/convex/appointments.test.ts`
- `tests/unit/convex/logEntries.test.ts`
- `tests/unit/convex/medications.test.ts`
- `tests/unit/components/MedicationTable.test.tsx`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/dashboard.spec.ts`
- `tests/e2e/appointments.spec.ts`
- `tests/e2e/log.spec.ts`
- `tests/e2e/info.spec.ts`
- `playwright.config.ts`

### Exit criteria

- All tests pass
- CI runs them on push

---

## Phase 17: Deploy & Onboard

### What to do

1. Final deploy:
   ```bash
   npx convex deploy          # Production Convex
   # Vercel auto-deploys from GitHub push
   ```

2. Update Convex env vars for production:
   - `SITE_URL` → Vercel production URL
   - Update Google OAuth redirect URIs

3. Gather remaining data from family (see Open Items below).

4. Nic introduces the app to the family.

5. Monitor — if anyone finds it harder than Messenger, that's a bug.

---

## Authorization Pattern (All Mutations and Data-Returning Queries)

Every mutation **and** every data-returning query must:
1. Call `getAuthUserId(ctx)` from `@convex-dev/auth/server` — if null, throw `ConvexError("Ekki innskráður")`.
2. No roles or permissions in v1 — every authenticated family member can do everything.
3. Exception: log entry editing — verify `authorId === currentUser`.
4. Exception: `users.me` — returns `null` for unauthenticated callers by design.

---

## Design Reference (Quick Access)

| Property | Value |
|---|---|
| Min tap target | 48px (prefer 56px+) |
| Body font size | 18px minimum on mobile |
| Border radius | 12–16px on cards |
| Background | Warm cream/off-white |
| Primary accent | Muted teal or sage |
| Warning | Soft amber/gold |
| Danger | Gentle red |
| Icons | Lucide — always paired with text labels |
| Nav labels always visible | Yes — no icon-only navigation |
| Locale | `is` default (no prefix), `en` secondary (`/en/...`) |

---

## Things NOT to Build (Deferred to v2)

Do not build these. They are explicitly deferred in the spec:

- Medication check-off / daily tracker
- Push notifications
- Google Calendar sync
- AI summary of log entries
- Multi-patient support
- Full offline CRUD

---

## Medical Context (for understanding, not building)

This context helps explain WHY certain seed data and features are the way they are. Don't build any medical features — just understand the situation so the data makes sense.

- Amma is 90, in active breast cancer treatment with Kisqali + anti-hormone injections every 2 weeks at Brjóstamiðstöð Landspítala.
- She recently fell and fractured a rib, pausing her exercise program at Virkni og Vellíðan.
- She is just starting at Ljósið cancer rehabilitation (OT assessment April 21, physio later, waitlisted for lymphatic drainage massage).
- She is in priority on the waitlist at Bati physiotherapy for lymphedema treatment.
- **The most urgent coordination item** is getting a heimahjúkrun (home nursing) referral so the bi-weekly injections and blood draws can happen at home instead of requiring trips to the hospital. This is reflected in the entitlements seed data.
- The family also needs an akstursþjónusta fatlaðra (disability transport) certificate from Brjóstamiðstöð for rides to/from treatment. Helga wants as many rides as possible.

---

## Open Items (Need from Family Before/After Launch)

- [x] ~~Medication dosages and schedules~~ — **Resolved.** Helga provided all dosages April 16. 5 medications fully documented.
- [ ] Heimilislæknir (GP) — name and phone number. Helga doesn't know the name either. Check through Heilsugæsla Kópavogs.
- [ ] Family email addresses — for `ALLOWED_EMAILS` whitelist. Gather from Elin, Helga, Anna Margrét, Erla + Nic.
- [ ] Heimahjúkrun certificate status — confirmed NOT yet in place (Helga: "ekki komið í gagnið ennþá"). Needs follow-up with Brjóstamiðstöð.
- [ ] Akstursþjónusta fatlaðra certificate status — unknown. Needs follow-up with Brjóstamiðstöð.
- [ ] Andhormónalyf exact name — Helga doesn't remember. Ask at next Brjóstamiðstöð visit.
- [ ] Family phone numbers — for the Fjölskylda contacts section.