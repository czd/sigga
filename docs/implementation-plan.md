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
- `proxy.ts` — not created yet; added in Phases 1 & 2
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

8. Wire `proxy.ts` to redirect unauthenticated users to `/[locale]/login`.

### Important gotcha

Convex Auth docs reference `middleware.ts`. For Next.js 16:
- File must be `proxy.ts`, and if `app/` lives under `src/`, the proxy must be at `src/proxy.ts` (not project root). Next.js resolves it at the same level as `app/`.
- Export as `export default` OR as a named `proxy` export — both work per Next.js 16 docs.
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
- [x] `proxy.ts` wired via `convexAuthNextjsMiddleware` (Next.js 16 compatible)
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

7. Merge i18n routing into `proxy.ts` alongside the auth redirect from Phase 1. This is the trickiest integration point — both auth and locale concerns live in the same file.

### Next.js 16 specifics for next-intl

- In `next.config.ts`: use `skipProxyUrlNormalize` (NOT `skipMiddlewareUrlNormalize`)
- `proxy.ts` function export MUST be named `proxy`

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
- `src/app/[locale]/layout.tsx` — add `NextIntlClientProvider`
- `proxy.ts` — combine auth + locale routing
- `next.config.ts` — add `skipProxyUrlNormalize`

### Exit criteria

- Login page renders in Icelandic by default
- `/en/login` renders in English
- All UI strings come from translation files — nothing hardcoded

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
   - **~18 contacts** across emergency, medical, municipal categories (all with real phone numbers, addresses, notes)
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
- Seed data is loaded: 5 medications, ~18 contacts, 11 entitlements all present
- Data matches the spec exactly (including Icelandic text, phone numbers, notes)

---

## Phase 4: App Shell — Layout & Bottom Navigation

### What to do

1. Build the root `[locale]/layout.tsx`:
   - `ConvexProvider` wrapping everything
   - `NextIntlClientProvider` for translations
   - `AuthGate` component — redirects to login if not authenticated
   - Import the warm color palette via Tailwind config

2. Build `BottomNav.tsx` — fixed bottom, 4 tabs:
   | Icon (Lucide) | Label | Route |
   |---|---|---|
   | Home or CalendarDays | Í dag | `/` |
   | BookOpen | Dagbók | `/dagbok` |
   | Clock | Tímar | `/timar` |
   | Info or ClipboardList | Upplýsingar | `/upplysingr` |

3. Design rules (non-negotiable for the 60+ users):
   - Tap targets: **56px+ height** for nav items, **48px minimum** everywhere else
   - Font size: **18px body minimum** on mobile
   - Active tab: filled icon + accent color. Inactive: outline + muted.
   - Text labels always visible — **no icon-only navigation**

4. Set up the design system / Tailwind config:
   - **Backgrounds:** Warm cream/off-white (not clinical white)
   - **Primary accent:** Muted teal or sage
   - **Warning/attention:** Soft amber/gold
   - **Emergency/delete:** Gentle red
   - **Borders/cards:** Rounded corners 12–16px, light shadows
   - **Typography:** Humanist sans-serif that renders Icelandic characters well (ð, þ, æ, ö)

5. Build header component: "Sigga" as app title, user avatar + name top-right, sign-out in dropdown.

6. Create empty page shells for all 4 routes so tab navigation works immediately.

### Files to create/modify

- `src/app/[locale]/layout.tsx`
- `src/app/[locale]/page.tsx` (dashboard shell)
- `src/app/[locale]/dagbok/page.tsx` (empty shell)
- `src/app/[locale]/timar/page.tsx` (empty shell)
- `src/app/[locale]/upplysingr/page.tsx` (empty shell)
- `src/components/nav/BottomNav.tsx`
- `src/components/shared/UserAvatar.tsx`
- `tailwind.config.ts` — custom colors, font sizes
- `src/lib/convex.ts` — ConvexProvider setup

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
   - "Skrifa í dagbók" button at bottom → opens quick-add form

4. **QuickActions row:**
   - "Nýr tími" → navigates to appointment creation
   - "Skrifa í dagbók" → opens log entry form (bottom sheet)

5. All data via Convex `useQuery` — real-time by default.

### Files to create/modify

- `convex/appointments.ts` — `list`, `get`, `create`, `update`, `remove`, `volunteerToDrive`
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

---

## Phase 6: Dagbók (Log)

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

- `src/app/[locale]/dagbok/page.tsx`
- `src/components/log/LogFeed.tsx`
- `src/components/log/LogEntryForm.tsx`

### Exit criteria

- Can add entries, see them in real-time
- Can edit own entries, see "Breytt" badge
- Cannot edit others' entries
- Pagination works

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
- `src/components/appointments/AppointmentList.tsx`
- `src/components/appointments/AppointmentForm.tsx`
- `src/components/appointments/DriverPicker.tsx`

### Exit criteria

- Full CRUD works
- Driver volunteering is a single tap — no extra confirmation
- Upcoming/past toggle works
- Icelandic date formatting is correct

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

- All seeded contacts display in correct groups
- Tapping a phone number initiates a call on mobile
- Tapping email opens mail client
- Can add/edit/remove contacts

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

3. **Upload form:** Native mobile file picker, title (pre-fill from filename), category (free text with suggestions: "Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn"), notes.

4. **View/download:** `storage.getUrl(storageId)` — tap opens in browser/downloads.

5. **Delete:** Confirmation required. Deletes both the document record AND the file from storage.

### Convex functions

- `documents.list`, `documents.generateUploadUrl`, `documents.save`, `documents.getUrl`, `documents.remove`

### Files to create/modify

- `convex/documents.ts`
- `src/components/info/DocumentList.tsx`
- `src/components/info/DocumentUpload.tsx`

### Exit criteria

- Can upload a file from mobile, see it in the list
- Can tap to view/download
- Can delete (with confirmation)

---

## Phase 12: Upplýsingar — Container Page

### What to do

The `/upplysingr` page needs a tab bar or segmented control to switch between the 4 sub-sections built in Phases 8–11.

- Tab bar at top: **Lyf | Símaskrá | Réttindi | Skjöl**
- Default to Lyf (or whichever tab the family uses most — can be adjusted)
- Tabs should be large, tappable, clearly indicate active state
- Consider using URL query params or local state for tab selection (not separate routes — keep it simple)

### Files to create/modify

- `src/app/[locale]/upplysingr/page.tsx` — Tab container wiring the 4 components

### Exit criteria

- Can switch between all 4 tabs
- State within tabs persists during tab switches (don't remount/refetch unnecessarily)

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

### What to do

1. `convex/backup.ts` — `weeklyExport` internal action:
   - Queries all tables
   - Serializes to JSON with ISO timestamps
   - Stores as file in Convex storage
   - Deletes backups older than 4 weeks (keeps last 4)

2. `convex/crons.ts`:
   ```typescript
   import { cronJobs } from "convex/server";
   import { internal } from "./_generated/api";

   const crons = cronJobs();
   crons.weekly(
     "weekly backup",
     { dayOfWeek: "sunday", hourUTC: 3, minuteUTC: 0 },
     internal.backup.weeklyExport,
   );
   export default crons;
   ```

### Files to create/modify

- `convex/backup.ts`
- `convex/crons.ts`

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

## Authorization Pattern (All Mutations)

Every mutation must:
1. `ctx.auth.getUserIdentity()` — if null, throw `ConvexError("Ekki innskráður")`
2. No roles or permissions in v1 — every authenticated family member can do everything
3. Exception: log entry editing — verify `authorId === currentUser`

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