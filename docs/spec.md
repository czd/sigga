# Sigga — Family Care Coordination Dashboard

## Technical Specification v1.1

**Purpose:** A mobile-first web app for coordinating care of Sigga (90, Kópavogur, Iceland), who is in active breast cancer treatment, among her four daughters (Elin, Helga, Anna Margrét, Erla) and extended family.

**Medical context:** Sigga is on Kisqali (ribociclib) — a CDK4/6 inhibitor for breast cancer — plus anti-hormone injections every two weeks at Brjóstamiðstöð Landspítala (Breast Center at the National Hospital). She also takes Eliquis (blood thinner) and eye care medications (5 total). She is just starting at Ljósið cancer rehabilitation center (occupational therapy assessment April 21, physiotherapy later, waitlisted for sogæðanudd/lymphatic drainage massage), and is in priority on the waitlist at Bati physiotherapy for lymphedema treatment. She recently fell and fractured a rib, pausing her exercise program at Virkni og Vellíðan. The family is working to get a heimahjúkrun (home nursing) referral so the bi-weekly injections and blood draws can happen at home instead of at the hospital. This is not generic elderly frailty — it's an active cancer treatment coordination problem with multiple providers, appointments, and entitlements.

**Problem it solves:** Information about Sigga's care currently lives in a Facebook Messenger group chat. Structured facts (meds, appointments, phone numbers, entitlements) scroll away and get re-asked. This app is the "one simple spot" next to the chat where stable-but-updatable information lives.

**Key constraint:** The primary users (60+ year old Icelandic women) have low tech comfort. The app must be radically simple — fewer taps, no learning curve, no ambiguity. If it's harder than Messenger, they won't use it.

**Family roles:**
- **Helga** — Physical therapist. Primary medical knowledge holder. Attends appointments, relays doctor instructions. The "what's happening medically" person.
- **Elin** — Nic's mom. The organizer/action-tracker. Flags "has this been done?", "who's handling this?" items.
- **Anna Margrét Sigurðardóttir** — Group admin. Quieter in chat.
- **Erla** — Least active in chat so far.
- **Nic** — Builder/maintainer. Will introduce the app to the family.

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 (App Router) | `proxy.ts` replaces deprecated `middleware.ts`; because `app/` is under `src/`, the proxy file lives at `src/proxy.ts` and must `export default` (not a named `proxy` export). Turbopack is default bundler. `next lint` removed — use Biome or ESLint directly. All parallel route slots require explicit `default.js`. |
| Language | TypeScript (strict) | |
| Backend / DB | Convex | Real-time subscriptions, file storage, scheduled functions. Hobby tier (free). |
| Auth | Convex Auth (`@convex-dev/auth`) | Google OAuth provider. Whitelist family email addresses server-side. |
| i18n | `next-intl` | Confirmed Next.js 16 compatible. Uses `src/proxy.ts` for locale routing. Default locale `is` (Icelandic), secondary `en`. No locale prefix for default. |
| UI | shadcn/ui + Tailwind CSS 4 | Mobile-first. Large tap targets. High contrast. |
| Package manager | Bun | |
| Hosting | Vercel | Auto-domain for v1. Default `.vercel.app` URL. |
| Testing | Vitest (unit/integration) + Playwright (e2e) | |
| File storage | Convex built-in file storage | Upload via `generateUploadUrl()`, serve via `storage.getUrl()`. No Google Drive dependency. |

---

## Project Structure

```
sigga/
├── bun.lock
├── biome.json                    # Linting (next lint removed in Next.js 16)
├── next.config.ts
├── convex/
│   ├── _generated/
│   ├── schema.ts
│   ├── auth.ts                   # Convex Auth config (Google OAuth)
│   ├── http.ts                   # HTTP router for auth callbacks
│   ├── appointments.ts
│   ├── logEntries.ts
│   ├── medications.ts
│   ├── contacts.ts
│   ├── entitlements.ts
│   ├── documents.ts
│   ├── backup.ts                 # Scheduled weekly JSON export
│   └── seed.ts                   # Dev seed data
├── messages/
│   ├── is.json                   # Icelandic translations (primary)
│   └── en.json                   # English translations (secondary)
├── src/
│   ├── proxy.ts                  # Was middleware.ts. Handles auth redirect + locale routing via next-intl. Must live next to `app/`, i.e. in `src/` (not project root) because `app/` is under `src/`.
│   ├── i18n/
│   │   ├── routing.ts            # next-intl routing config
│   │   └── request.ts            # next-intl request config
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx        # Root layout: ConvexProvider + NextIntlClientProvider + auth gate
│   │   │   ├── default.tsx       # Required in Next.js 16 for parallel routes
│   │   │   ├── page.tsx          # Dashboard ("Í dag")
│   │   │   ├── dagbok/
│   │   │   │   └── page.tsx      # Log view
│   │   │   ├── timar/
│   │   │   │   └── page.tsx      # Appointments view
│   │   │   ├── upplysingr/
│   │   │   │   └── page.tsx      # Info hub (meds, contacts, entitlements, documents)
│   │   │   └── login/
│   │   │       └── page.tsx      # Login page (Google OAuth button)
│   │   └── layout.tsx            # Bare html/body wrapper
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── nav/
│   │   │   └── BottomNav.tsx     # Fixed bottom nav (4 tabs)
│   │   ├── dashboard/
│   │   │   ├── NextAppointments.tsx
│   │   │   ├── RecentLog.tsx
│   │   │   └── QuickActions.tsx
│   │   ├── appointments/
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── AppointmentForm.tsx
│   │   │   └── DriverPicker.tsx
│   │   ├── log/
│   │   │   ├── LogFeed.tsx
│   │   │   └── LogEntryForm.tsx
│   │   ├── info/
│   │   │   ├── MedicationTable.tsx
│   │   │   ├── MedicationForm.tsx
│   │   │   ├── ContactList.tsx
│   │   │   ├── ContactForm.tsx
│   │   │   ├── EntitlementList.tsx
│   │   │   ├── EntitlementForm.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   └── DocumentUpload.tsx
│   │   └── shared/
│   │       ├── AuthGate.tsx      # Redirects to /login if not authenticated
│   │       ├── UserAvatar.tsx
│   │       └── EmptyState.tsx
│   └── lib/
│       ├── convex.ts             # ConvexProvider setup
│       └── utils.ts              # Shared utilities
├── tests/
│   ├── unit/                     # Vitest unit tests
│   │   ├── convex/               # Convex function tests
│   │   └── components/           # Component tests
│   ├── e2e/                      # Playwright e2e tests
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── appointments.spec.ts
│   │   ├── log.spec.ts
│   │   └── info.spec.ts
│   └── fixtures/
│       └── seed.ts               # Test data
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icon-192.png
│   └── icon-512.png
└── playwright.config.ts
```

---

## Data Model (Convex Schema)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Tímar — appointments
  appointments: defineTable({
    title: v.string(),
    startTime: v.number(),             // unix ms
    endTime: v.optional(v.number()),   // unix ms
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    driverId: v.optional(v.id("users")),
    status: v.union(
      v.literal("upcoming"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_startTime", ["startTime"])
    .index("by_status_and_startTime", ["status", "startTime"]),

  // Dagbók — log entries (append-only, editable)
  // Default Convex ordering is by `_creationTime` ascending — no explicit index needed.
  // Convex auto-appends `_creationTime` to every index and rejects an explicit `by_creation` index at deploy.
  logEntries: defineTable({
    content: v.string(),
    authorId: v.id("users"),
    relatedAppointmentId: v.optional(v.id("appointments")),
    editedAt: v.optional(v.number()),  // set on edit, null on creation
  }),

  // Lyf — medications
  medications: defineTable({
    name: v.string(),
    dose: v.string(),
    schedule: v.string(),              // "1 tafla á morgnana"
    purpose: v.optional(v.string()),   // "blóðþrýstingur"
    prescriber: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_active", ["isActive"]),

  // Símaskrá — contacts
  contacts: defineTable({
    category: v.union(
      v.literal("emergency"),
      v.literal("medical"),
      v.literal("municipal"),
      v.literal("family"),
      v.literal("other"),
    ),
    name: v.string(),
    role: v.optional(v.string()),      // "Heimilislæknir", "Sjúkraþjálfari"
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    notes: v.optional(v.string()),
    sortOrder: v.optional(v.number()), // for manual ordering within category
  }).index("by_category", ["category"]),

  // Réttindi og umsóknir — entitlements/applications
  entitlements: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("not_applied"),
      v.literal("in_progress"),
      v.literal("approved"),
      v.literal("denied"),
    ),
    ownerId: v.optional(v.id("users")),   // who's handling this application
    appliedTo: v.optional(v.string()),     // "Sjúkratryggingar Íslands"
    notes: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_status", ["status"]),

  // Skjöl — documents (stored in Convex file storage)
  documents: defineTable({
    title: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),                  // original filename
    fileType: v.string(),                  // MIME type
    fileSize: v.number(),                  // bytes
    category: v.optional(v.string()),      // free text: "lyfseðill", "blóðprufa", etc.
    notes: v.optional(v.string()),
    addedBy: v.id("users"),
  }),
});
```

---

## Authentication

### Strategy: Convex Auth with Google OAuth

**Why Google OAuth:**
- All family members have Google accounts (assumption — verify with Nic).
- Single-tap sign-in on mobile, no passwords to remember.
- Convex Auth has a dedicated Google OAuth setup guide.

**Whitelist enforcement:**
- After OAuth completes, a Convex mutation checks the user's email against an allowed list stored in a Convex environment variable (comma-separated emails).
- If the email is not whitelisted, the session is rejected and the user sees a friendly Icelandic message: "Þetta netfang hefur ekki aðgang. Hafðu samband við Nic."
- This keeps the app private without building a full invite system.

**Implementation notes:**
- Follow the Convex Auth Google OAuth guide: https://labs.convex.dev/auth/config/oauth/google
- Set env vars: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SITE_URL`, `ALLOWED_EMAILS`
- The `src/proxy.ts` file should check auth state and redirect unauthenticated users to `/login`. Use `convexAuthNextjsMiddleware` adapted for Next.js 16's `proxy` convention and `export default` the result.
- Important: Convex Auth's Next.js support references `middleware.ts` in docs — rename to `src/proxy.ts` and use `export default` for the function. A named `export const proxy` works only for trivial unwrapped proxy bodies; when the export is produced by a wrapper like `convexAuthNextjsMiddleware` or `createMiddleware` from next-intl, Next.js 16 / Turbopack resolves the server bundle via `middlewareModule.default || middlewareModule` and a named-only export throws `TypeError: adapterFn is not a function` at request time. Always default-export.

**Google Cloud Console setup:**
- Create OAuth 2.0 client credentials
- Authorized JavaScript origins: `http://localhost:3000` (dev) + Vercel production URL
- Authorized redirect URIs: Convex HTTP Actions URL + `/api/auth/callback/google`

---

## i18n Strategy

### Library: `next-intl`

**Why next-intl:**
- Confirmed Next.js 16 compatible (including `proxy.ts` convention)
- ~2KB bundle, Server Component native
- ICU message syntax for plurals and date formatting
- Type-safe translation keys

**Locale setup:**
- Default locale: `is` (Icelandic) — no URL prefix
- Secondary locale: `en` — URL prefix `/en/...`
- The family will only use Icelandic. English exists so Nic (and potentially future helpers) can read and edit translations easily, and to verify nothing is hardcoded.

**Translation file structure:**
```
messages/
  is.json    # Primary — all UI strings in Icelandic
  en.json    # Secondary — English mirror
```

**Key namespace plan:**
```json
{
  "common": {
    "save": "Vista",
    "cancel": "Hætta við",
    "edit": "Breyta",
    "delete": "Eyða",
    "add": "Bæta við",
    "back": "Til baka",
    "loading": "Hleð...",
    "lastUpdated": "Síðast uppfært",
    "by": "af"
  },
  "nav": {
    "dashboard": "Í dag",
    "log": "Dagbók",
    "appointments": "Tímar",
    "info": "Upplýsingar"
  },
  "dashboard": { ... },
  "appointments": { ... },
  "log": { ... },
  "medications": { ... },
  "contacts": { ... },
  "entitlements": { ... },
  "documents": { ... },
  "auth": {
    "signIn": "Skrá inn",
    "signInWithGoogle": "Skrá inn með Google",
    "signOut": "Skrá út",
    "notAllowed": "Þetta netfang hefur ekki aðgang. Hafðu samband við Nic."
  }
}
```

**proxy.ts integration:**
```typescript
// src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Renamed from "middleware" to "proxy" for Next.js 16. MUST be the default export —
// Turbopack's server bundle resolves via `middlewareModule.default || middlewareModule`,
// so a named `export const proxy` throws `TypeError: adapterFn is not a function` when
// wrapped by `createMiddleware` / `convexAuthNextjsMiddleware`.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|convex|.*\\..*).*)" ]
};
```

**Important Next.js 16 notes for next-intl:**
- The `proxy.ts` file replaces `middleware.ts` and, because `app/` lives under `src/`, must be at `src/proxy.ts`. The file MUST `export default` its middleware function — a named `export const proxy` fails at request time when the body is wrapped by `createMiddleware` or `convexAuthNextjsMiddleware` (Turbopack: `TypeError: adapterFn is not a function`).
- `skipMiddlewareUrlNormalize` is now `skipProxyUrlNormalize` in `next.config.ts`.
- All parallel route slots require explicit `default.tsx` files.
- Call `setRequestLocale(locale)` in layouts and pages for static rendering support.
- **Per-locale metadata.** Do NOT use `export const metadata = { ... }` in `src/app/[locale]/layout.tsx` — that ships the Icelandic (default) description to `/en/...` visitors too. Use `generateMetadata` with `getTranslations` so each locale gets its own title and description:

  ```ts
  import { getTranslations } from "next-intl/server";

  export async function generateMetadata({
    params,
  }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "app" });
    return { title: t("name"), description: t("tagline") };
  }
  ```

  `messages/{is,en}.json` must carry `app.name` and `app.tagline` for this to resolve.

---

## Views & UI Design

### Design Principles

- **Mobile-first, always.** Desktop is a bonus, not a target. Every interaction is designed for a phone held in one hand.
- **Large touch targets.** Minimum 48px tap areas. Prefer 56px+ for primary actions.
- **High contrast.** No subtle grays. Clear visual hierarchy. Consider that users may have age-related vision changes.
- **Icelandic text.** All UI labels, placeholders, empty states, and error messages in Icelandic.
- **No jargon.** "Bæta við tíma" not "Búa til viðburð." "Vista" not "Senda inn."
- **Feedback on every action.** Toast confirmations on save/delete. Loading states on async actions.
- **Bottom navigation.** Fixed 4-tab bottom nav. Always visible. Active state is obvious.
- **The app should feel warm, not clinical.** This is a family tool, not a hospital system. Soft colors, rounded corners, friendly empty states.

### Aesthetic Direction

- **Tone:** Warm, soft, Scandinavian-minimal. Think "cozy cabin, not cold hospital."
- **Color palette:** Warm neutrals (cream/off-white backgrounds), a muted teal or sage as the primary accent, soft amber/gold for warnings/attention, gentle red for emergencies/deletions. Avoid harsh blues or clinical whites. Tokens are declared inline in `src/app/globals.css` via Tailwind v4's `@theme inline { --color-... }` block — there is no `tailwind.config.ts` (Tailwind v4 reads design tokens from CSS).
- **Typography:** Clean and highly readable. Generous font size (base 16px minimum, prefer 18px for body on mobile). Consider a humanist sans-serif that renders well in Icelandic (special characters: ð, þ, æ, ö, etc.).
- **Borders and cards:** Soft rounded corners (12-16px). Light shadows. Cards for grouped content.
- **Icons:** Lucide icons. Simple, recognizable. Paired with text labels always (no icon-only buttons for primary actions).

### PWA Configuration

The app should be installable as a PWA so it lives on the home screen like a native app:

- `manifest.json` with `display: "standalone"`, Icelandic name "Sigga", appropriate theme color
- Service worker for offline shell (app chrome loads even without network; data shows "Hleð..." until Convex reconnects)
- Apple touch icon and splash screens for iOS

---

### View 1: Í dag (Dashboard) — `/`

The landing page. Answers: "What's happening with Sigga right now?"

**Layout (top to bottom):**

1. **Header:** "Sigga" as app title. User avatar + name in top-right. Sign-out in dropdown.

2. **Next appointments card:** Shows next 3 upcoming appointments. Each shows: date/time, title, location (if set), driver name (if assigned) or "Enginn skutlar" with a tap-to-volunteer button. If no upcoming appointments: friendly empty state "Engir tímar á næstunni."

3. **Recent log entries:** Latest 3 entries from Dagbók. Each shows: date, author avatar + name, content (truncated to ~3 lines with "Lesa meira" link). "Skrifa í dagbók" button at the bottom → opens quick-add form (sheet/modal from bottom).

4. **Quick actions row:** 2-3 quick action buttons:
   - "Nýr tími" (new appointment)
   - "Skrifa í dagbók" (write log entry)
   - Optionally: "Símaskrá" (quick link to contacts)

**Real-time:** Dashboard auto-updates via Convex subscriptions. If Helga adds a log entry while Elin is looking at the dashboard, it appears without refresh.

---

### View 2: Dagbók (Log) — `/dagbok`

A reverse-chronological feed of all care-relevant events.

**Layout:**

1. **Floating action button (FAB)** or sticky top bar: "Skrifa" (Write) — opens the entry form.

2. **Feed:** Entries sorted newest-first. Each entry card shows:
   - Author avatar + name
   - Date + time (relative for recent: "í gær", "fyrir 3 dögum"; absolute for older)
   - Content (full text, no truncation in feed view)
   - "Breytt" badge if `editedAt` is set
   - Edit button (pencil icon) — only visible to the original author
   - Optional: linked appointment shown as a small chip

3. **Entry form (sheet from bottom):**
   - Multiline text input. Placeholder: "Hvað gerðist? Hvaða upplýsingar eru mikilvægar?"
   - Optional: link to an appointment (dropdown of recent/upcoming appointments)
   - "Vista" button
   - No title field. No categories. No tags. Keep it dead simple — it's a text box with a save button.

4. **Edit flow:** Same form, pre-filled. Sets `editedAt` on save. No revision history in v1.

**Pagination:** Load 20 entries initially. "Sýna eldri" button at bottom for more (or infinite scroll if it feels natural).

---

### View 3: Tímar (Appointments) — `/timar`

All appointments — upcoming and past.

**Layout:**

1. **Toggle/tabs at top:** "Næstu tímar" (Upcoming) | "Liðnir tímar" (Past). Default: upcoming.

2. **Upcoming list:** Sorted by date ascending (soonest first). Each card:
   - Date + time (formatted for Icelandic: "fös. 18. apríl kl. 14:00")
   - Title
   - Location (if set)
   - Driver section: if assigned, shows avatar + name. If not, shows "Enginn skutlar" + "Ég get!" (I can!) volunteer button. Tapping "Ég get!" assigns the current user as driver immediately (mutation).
   - Notes preview (if any)
   - Tap card → expand or navigate to detail/edit view

3. **Past list:** Sorted by date descending (most recent first). Same card layout but driver section is static (no volunteer button). Optional: "Skrá í dagbók" shortcut to create a log entry linked to this past appointment.

4. **Add appointment form:**
   - Title (required)
   - Date picker (required) — native date/time picker for mobile
   - Location (optional text field)
   - Notes (optional multiline)
   - Driver (optional — dropdown of family members, or "Enginn enn")
   - "Vista" button

5. **Edit/delete:** Edit pre-fills the form. Delete requires confirmation modal: "Ertu viss? Þetta er ekki hægt að afturkalla."

---

### View 4: Upplýsingar (Info Hub) — `/upplysingr`

The reference section. Rarely changes, frequently consulted.

**Layout:** Tab bar or segmented control at top with 4 sections:
- **Lyf** (Medications)
- **Símaskrá** (Contacts)
- **Réttindi** (Entitlements)
- **Skjöl** (Documents)

#### Lyf (Medications) tab

**Active medications table/list:**
- Each row: Name, dose + schedule, purpose
- Tap row → expand to show prescriber, notes, last updated info
- "Bæta við lyfi" button
- Toggle to show inactive meds: "Sýna eldri lyf"

**Add/edit medication form:**
- Name (required)
- Dose + schedule (required, free text: "1 tafla á morgnana")
- Purpose (optional)
- Prescriber (optional)
- Notes (optional)
- Active toggle (default: on)

#### Símaskrá (Contacts) tab

**Grouped by category:**
- Section headers: Neyð, Læknar og heilsugæsla, Sveitarfélag og þjónusta, Fjölskylda, Annað
- Each contact: Name, role (if set), phone (tappable `tel:` link), email (tappable `mailto:` link)
- "Bæta við tengilið" button
- Pre-seed emergency contacts: 112, Eitrunarmiðstöð (543 2222), Læknavaktin (1770)

**Phone numbers must be tappable.** This is the #1 use case: someone needs a number fast, they open the app, find it, tap to call. Zero extra steps.

#### Réttindi (Entitlements) tab

**Status-grouped checklist:**
- Section: "Í vinnslu" (In progress) — shown first, highlighted
- Section: "Ekki sótt um" (Not applied) — shown second
- Section: "Samþykkt" (Approved) — shown third, with check mark
- Section: "Hafnað" (Denied) — shown last, muted

Each item card:
- Title
- Applied to (institution name)
- Owner (who's handling it) — avatar + name
- Notes
- Status badge (color coded)
- Tap to edit

**Add entitlement form:**
- Title (required)
- Status (dropdown, default: "not_applied")
- Applied to (optional)
- Owner (optional — dropdown of family members)
- Description (optional)
- Notes (optional)

#### Skjöl (Documents) tab

**Simple file list:**
- Each row: title, filename, category tag (if set), upload date, uploaded by
- Tap → download/view (Convex serves the file URL)
- "Hlaða upp skjali" (Upload document) button

**Upload form:**
- File picker (native mobile file picker)
- Title (required — pre-fill from filename, allow override)
- Category (optional free text, with suggestions: "Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn")
- Notes (optional)
- Max file size: whatever Convex allows (currently unlimited via upload URLs, 20MB via HTTP actions — use upload URLs)

**File upload flow (Convex):**
1. Client calls `generateUploadUrl` mutation
2. Client POSTs file to the returned URL
3. Client receives `storageId`
4. Client calls `saveDocument` mutation with `storageId` + metadata

---

### Bottom Navigation

Fixed at the bottom of every view. 4 tabs:

| Icon | Label | Route |
|------|-------|-------|
| Home/Calendar icon | Í dag | `/` |
| Book icon | Dagbók | `/dagbok` |
| Clock icon | Tímar | `/timar` |
| Info/Clipboard icon | Upplýsingar | `/upplysingr` |

Active tab: filled icon + accent color. Inactive: outline icon + muted.
Label text always visible (not icon-only).

---

## Convex Functions

### Naming convention

`[table].[action]` — e.g., `appointments.list`, `appointments.create`, `logEntries.add`

### Required functions

**appointments.ts:**
- `list` — query: all appointments, ordered by startTime. Args: `{ status?: "upcoming" | "completed" | "cancelled" }`. Filter upcoming = startTime > now.
- `upcoming` — query: dashboard-optimised. Uses `.withIndex("by_status_and_startTime", q => q.eq("status", "upcoming").gte("startTime", now)).order("asc").take(limit)`. Args: `{ limit?: number }` (default 3). Returns only future-dated upcoming appointments; consumed by the dashboard via `api.appointments.upcoming`.
- `get` — query: single appointment by ID.
- `create` — mutation: create appointment. Auto-set `createdBy`, `updatedBy`, `updatedAt`, `status: "upcoming"`.
- `update` — mutation: update appointment fields. Set `updatedBy`, `updatedAt`.
- `remove` — mutation: delete appointment.
- `volunteerToDrive` — mutation: sets `driverId` to current user. Simple, one-tap.

**logEntries.ts:**
- `list` — query: paginated, ordered by `_creationTime` desc. Args: `{ limit: number, cursor?: string }`.
- `recent` — query: latest N entries (for dashboard). Args: `{ count: number }`.
- `add` — mutation: create log entry. Auto-set `authorId`.
- `update` — mutation: edit content. Must verify `authorId` matches current user. Sets `editedAt`.

**medications.ts:**
- `list` — query: all medications. Args: `{ activeOnly?: boolean }`.
- `create` — mutation. Auto-set `updatedAt`, `updatedBy`, `isActive: true`.
- `update` — mutation. Set `updatedAt`, `updatedBy`.

**contacts.ts:**
- `list` — query: all contacts, grouped by category. Ordered by `sortOrder` within category.
- `create` — mutation.
- `update` — mutation.
- `remove` — mutation.

**entitlements.ts:**
- `list` — query: all entitlements. Ordered by status (in_progress first, then not_applied, approved, denied).
- `create` — mutation. Auto-set `updatedAt`, `updatedBy`.
- `update` — mutation. Set `updatedAt`, `updatedBy`.
- `remove` — mutation.

**documents.ts:**
- `list` — query: all documents, ordered by `_creationTime` desc.
- `generateUploadUrl` — mutation: returns upload URL from `ctx.storage.generateUploadUrl()`.
- `save` — mutation: creates document record with `storageId` and metadata.
- `getUrl` — query: returns `ctx.storage.getUrl(storageId)` for a document.
- `remove` — mutation: deletes document record AND file from storage via `ctx.storage.delete(storageId)`.

**backup.ts:**
- `weeklyExport` — scheduled action (Convex cron): runs weekly. Queries all data, serializes to JSON, stores as a file in Convex storage. Keeps last 4 backups, deletes older ones.
- Register in `convex/crons.ts`:
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

### Authorization pattern

Every mutation should:
1. Get the current user via `ctx.auth.getUserIdentity()`
2. If null, throw `ConvexError("Ekki innskráður")`
3. Check email against `ALLOWED_EMAILS` env var (or rely on the auth-level check)

Keep it simple — no roles, no permissions in v1. Every authenticated family member can do everything.

---

## Break-Glass Fallback: Weekly JSON Backup

**Purpose:** If the app goes down, the family doesn't lose their data.

**Mechanism:** A Convex scheduled function runs every Sunday at 03:00 UTC. It:
1. Queries all tables (appointments, logEntries, medications, contacts, entitlements, documents metadata)
2. Serializes to a single JSON object with ISO timestamps
3. Stores the JSON as a file in Convex file storage
4. Deletes backups older than 4 weeks

**Recovery path:** If the app is unreachable, Nic can:
- Download the latest backup JSON from the Convex dashboard
- Format it into a Google Doc as a manual fallback
- Share with the family

This is explicitly a last-resort mechanism, not a feature users interact with.

---

## Testing Strategy

### Unit Tests (Vitest)

- **Convex functions:** Test each query/mutation with mock data. Verify auth checks, data validation, correct return shapes.
- **Utility functions:** Date formatting, locale helpers, etc.
- **Components:** Render tests for key components with mock Convex data. Verify correct Icelandic text rendering.

### E2E Tests (Playwright)

- **Auth flow:** Login with Google → land on dashboard. Unauthorized email → see rejection message.
- **Dashboard:** Verify appointments and log entries render. Quick actions navigate correctly.
- **Appointments CRUD:** Create → appears in list → edit → verify changes → delete → confirm gone.
- **Log CRUD:** Add entry → appears in feed → edit → see "Breytt" badge. Verify only author can edit.
- **Info tabs:** Navigate between Lyf/Símaskrá/Réttindi/Skjöl. Add items in each. Verify persistence.
- **File upload:** Upload a document → verify it appears in list → download and verify.
- **Real-time:** Open two browser tabs. Add data in one → verify it appears in the other without refresh.
- **Mobile viewport:** All tests run at 375x812 (iPhone viewport) as the primary target.

### Test file naming

```
tests/unit/convex/appointments.test.ts
tests/unit/components/MedicationTable.test.tsx
tests/e2e/auth.spec.ts
tests/e2e/appointments.spec.ts
```

---

## Seed Data — Real

This is NOT placeholder data. These are real medications, contacts, and entitlements gathered from the family Messenger chat. The seed function should populate production with this data on first deploy.

### Medications (from Helga)

```typescript
const medications = [
  {
    name: "Kisqali (ribociclib)",
    dose: "3 töflur",
    schedule: "Á morgnana",
    purpose: "Krabbameinslyf (CDK4/6 hemlar) — brjóstakrabbamein",
    prescriber: "Óskar læknir, Brjóstamiðstöð Landspítala",
    notes: "Meginlyf í krabbameinsmeðferð.",
    isActive: true,
  },
  {
    name: "Eliquis (apixaban)",
    dose: "1 tafla tvisvar á dag",
    schedule: "Á morgnana og á kvöldin",
    purpose: "Blóðþynning",
    prescriber: "",
    notes: "",
    isActive: true,
  },
  {
    name: "WhiteEyes augndropa",
    dose: "2 dropar",
    schedule: "Á morgnana",
    purpose: "Augndropa",
    prescriber: "",
    notes: "",
    isActive: true,
  },
  {
    name: "Retina Clear",
    dose: "1 hylki",
    schedule: "Á morgnana",
    purpose: "Augnheilsa — vítamín/fæðubótarefni",
    prescriber: "",
    notes: "60 hylki. Elin keypti.",
    isActive: true,
  },
  {
    name: "Andhormónalyf (sprauta)",
    dose: "Sprauta",
    schedule: "Á 2ja vikna fresti",
    purpose: "Andhormónameðferð — brjóstakrabbamein",
    prescriber: "Brjóstamiðstöð Landspítala",
    notes: "Gefin á Brjóstamiðstöð hingað til. Vonast til að fá heimahjúkrun til að sjá um þessar sprautur heima og taka blóðprufur — ekki komið í gang ennþá. Nákvæmt lyfjanafn óþekkt — athuga við Helgu.",
    isActive: true,
  },
];
```

### Contacts (real)

```typescript
const contacts = [
  // Neyð (emergency)
  { category: "emergency", name: "Neyðarlína", phone: "112", sortOrder: 1 },
  { category: "emergency", name: "Eitrunarmiðstöð", phone: "543 2222", sortOrder: 2 },
  { category: "emergency", name: "Læknavaktin", phone: "1770", notes: "Utan dagvinnutíma", sortOrder: 3 },

  // Læknar og heilsugæsla (medical)
  { category: "medical", name: "Óskar læknir", role: "Brjóstamiðstöð Landspítala", phone: "543 9560", notes: "Eiríksgata 5, 3. hæð, 101 Rvk. Opið 9–15:30 virka daga.", sortOrder: 1 },
  { category: "medical", name: "Kolbrún", role: "Sogæðanuddari — Ljósið", phone: "561-3770", notes: "Guðrúnartún 1, 105 Rvk. Mán–fim 8:30–16, fös 8:30–14. ATH: Sigga er á biðlista í sogæðanudd.", sortOrder: 2 },
  { category: "medical", name: "Bati sjúkraþjálfun", role: "Sjúkraþjálfun — í forgangi á biðlista", phone: "553-1234", email: "bati@bati.is", notes: "Kringlan 7, 103 Rvk. Sigga er í forgangi á biðlista. Sérfræðingar í sogbjúgsmeðferð.", sortOrder: 3 },

  // Stofnanir (municipal/institutional)
  { category: "municipal", name: "Ljósið", role: "Endurhæfingar- og stuðningsmiðstöð", phone: "561-3770", notes: "ljosid.is — Krabbameinsmiðstöð. Sigga er nýbyrjuð. Viðtal við iðjuþjálfa 21. apríl, sjúkraþjálfara síðar. Á biðlista í sogæðanudd. Boðið upp á snyrtingu, stólaleikfimi, æfingar í tækjasal.", sortOrder: 1 },
  { category: "municipal", name: "Brjóstamiðstöð Landspítala", role: "Krabbameinsmeðferð", phone: "543 9560", email: "brjostaskimun@landspitali.is", notes: "Eiríksgata 5, 3. hæð. Gefur út vottorð fyrir heimahjúkrun og akstursþjónustu. Andhormónasprautur á 2ja vikna fresti.", sortOrder: 2 },
  { category: "municipal", name: "Sjúkratryggingar Íslands", role: "Heilsutryggingar", phone: "515 0000", sortOrder: 3 },
  { category: "municipal", name: "Tryggingastofnun (TR)", role: "Bætur og réttindi", phone: "560 4400", sortOrder: 4 },
  { category: "municipal", name: "Félagsþjónusta Kópavogs", role: "Sveitarfélagsþjónusta", notes: "Símanúmer vantar", sortOrder: 5 },
  { category: "municipal", name: "Virkni og Vellíðan (Kópavogur)", role: "Hreyfing og félagsstarf", email: "freydis.eiriksdottir@kopavogur.is", notes: "Freydís Eiríksdóttir, verkefnastjóri. Fífan, þri & fös kl. 9:15. Helga og Sigga skráðar. Hefur legið niðri eftir fall og rifbeinsbrot — áætlað að byrja aftur.", sortOrder: 6 },
  { category: "municipal", name: "Heimahjúkrun HH (Kópavogur)", role: "Heimahjúkrun — ókeypis", notes: "Heilsugæsla höfuðborgarsvæðisins. Þarf skriflega beiðni frá heilbrigðisstarfsmanni. heilsugaeslan.is", sortOrder: 7 },
  { category: "municipal", name: "Heimaþjónusta Kópavogs", role: "Félagsleg heimaþjónusta", email: "heimathjonusta@kopavogur.is", notes: "Símatímar þjónustustjóra: 10–11:30 virka daga. Bóka samtal á kopavogur.is.", sortOrder: 8 },
];
```

### Entitlements (real — from Elin's messages)

```typescript
const entitlements = [
  {
    title: "Vottorð fyrir heimahjúkrun",
    description: "Vottorð/tilvísun frá Brjóstamiðstöð þarf til að fá heimahjúkrun.",
    status: "not_applied",  // Elin flagged this as unknown — needs checking
    ownerId: null,          // Nobody assigned yet
    appliedTo: "Brjóstamiðstöð Landspítala",
    notes: "BRÝNT: Heimahjúkrun þarf til að gefa andhormónasprautur heima (nú á 2ja vikna fresti á Brjóstamiðstöð) og taka blóðprufur. Helga segir að þetta sé ekki komið í gang ennþá.",
  },
  {
    title: "Vottorð fyrir akstursþjónustu fatlaðra",
    description: "Vottorð frá Brjóstamiðstöð þarf til að fá akstur til/frá meðferð.",
    status: "not_applied",  // Same — Elin flagged
    ownerId: null,
    appliedTo: "Brjóstamiðstöð Landspítala",
    notes: "Nauðsynlegt svo Sigga komist á tíma hjá læknum, Ljósinu, o.fl. Helga vill fá sem flest skipti.",
  },
];
```

### Researched entitlements — additional items to seed

These were researched from Sjúkratryggingar Íslands (SÍ), Kópavogur municipality, and Heilsugæslan. Helga should verify which are relevant and whether any have already been applied for or are already active.

```typescript
const researchedEntitlements = [
  // --- Sjúkratryggingar Íslands (SÍ) ---
  {
    title: "Þrýstiermar og þrýstisokkar (sogæðabjúgur)",
    description: "SÍ greiðir fyrir 3 pör af þrýstisokkaum og 2 þrýstiermar á 12 mán. tímabili. Sérsaumaðir samþykktir fyrir sogæðabjúg stig II-III.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Sjúkratryggingar Íslands — Hjálpartækjamiðstöð",
    notes: "Mjög líklega viðeigandi — Sigga fær sogæðanudd hjá Ljósinu og er á biðlista hjá Bati vegna sogæðabjúgsmeðferðar. Heilbrigðisstarfsmaður sendir umsókn. Sími SÍ: 515 0100.",
  },
  {
    title: "Lyfjakostnaður — þrepaskipt kerfi (aldraðir 67+)",
    description: "Hámarksgreiðsla er 41.000 kr. á 12 mán. tímabili. Kisqali er dýrt — mikilvægt að staðfesta að SÍ greiðsluþátttaka sé virk.",
    status: "not_applied", // Likely already active but verify
    ownerId: null,
    appliedTo: "Sjúkratryggingar Íslands",
    notes: "Ætti að vera sjálfvirkt en athuga hvort Kisqali-kostnaður fari í gegnum þetta kerfi eða sé sérstakt ferli.",
  },
  {
    title: "Ferðakostnaður vegna veikinda",
    description: "SÍ taka þátt í ferðakostnaði til/frá meðferð. Sækja þarf um endurgreiðslu.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Sjúkratryggingar Íslands",
    notes: "Á við um ferðir til Ljósins, Brjóstamiðstöðvar, Bati. Eyðublöð á island.is/s/sjukratryggingar. Gæti dregið úr akstursálagi á fjölskylduna.",
  },
  {
    title: "Hárkollur / höfuðfatnaður (ef við á)",
    description: "SÍ greiðir allt að 188.000 kr. á 2 ára tímabili vegna hárkolls og höfuðfatnaðar eftir krabbameinsmeðferð.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Sjúkratryggingar Íslands",
    notes: "Á aðeins við ef Sigga hefur hárlos vegna meðferðar. Athuga við Helgu.",
  },
  {
    title: "Gervibrjóst og brjóstahöld (ef við á)",
    description: "SÍ greiðir gervibrjóst (2 fyrsta árið, 1 eftir það) og sérstyrkt brjóstahöld eftir brjóstnám.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Sjúkratryggingar Íslands",
    notes: "Á aðeins við ef brjóstnám. Athuga við Helgu.",
  },
  {
    title: "Hjálpartæki — handleggsstuðningur / önnur tæki",
    description: "SÍ Hjálpartækjamiðstöð: Heilbrigðisstarfsmaður metur þörf og sendir umsókn. Sækja ÁÐUR en keypt er.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Sjúkratryggingar Íslands — Hjálpartækjamiðstöð (s. 515 0100)",
    notes: "Nefnt í upprunalegu fjölskylduspjalli. Helga sem sjúkraþjálfari getur sent umsókn. Afgreiðslutími: nokkrar vikur.",
  },

  // --- Kópavogur sveitarfélag ---
  {
    title: "Heimaþjónusta Kópavogs",
    description: "Stuðningsþjónusta heima: aðstoð við athafnir daglegs lífs, heimilishald, öryggisviðvera.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Kópavogur — Velferðarsvið",
    notes: "Netfang: heimathjonusta@kopavogur.is. Símatímar: 10–11:30 virka daga. Bóka samtal á kopavogur.is. ATH: biðlistar geta verið langir.",
  },
  {
    title: "Heimsendur matur (Kópavogur)",
    description: "Heimsendur matur fyrir eldri borgara frá Kópavogsbæ.",
    status: "not_applied",
    ownerId: null,
    appliedTo: "Kópavogur — Velferðarsvið",
    notes: "Upplýsingar á kopavogur.is/ibuar/aldradir.",
  },

  // --- Heilsugæslan ---
  {
    title: "Heimahjúkrun HH (Kópavogur)",
    description: "Heimahjúkrun ókeypis: lyfjaeftirlit, sérhæfð hjúkrun, heildræn meðferð. Þarf skriflega beiðni frá heilbrigðisstarfsmanni.",
    status: "not_applied", // Ties to the Brjóstamiðstöð certificate
    ownerId: null,
    appliedTo: "Heilsugæsla höfuðborgarsvæðisins — Heimahjúkrun HH",
    notes: "Beiðni sendist rafrænt í Sögu frá heilbrigðisstarfsmanni. Tengist vottorðinu frá Brjóstamiðstöð. Gæti verið lykilþjónusta ef ástand versnar.",
  },
];
```

### Still missing (get from family before or shortly after launch)

- ~~**Medication dosages and schedules**~~ — **RESOLVED.** Helga provided all dosages. 5 medications now fully documented including new anti-hormone injection.
- **Heimilislæknir** (GP) — name and phone number. Helga does not know the name either — someone needs to check.
- **Family phone numbers** — for the Fjölskylda contacts section
- ~~**Heimahjúkrun provider**~~ — **FOUND**: Heimahjúkrun HH (Heilsugæsla höfuðborgarsvæðisins) serves Kópavogur. Needs written referral from healthcare professional. BRÝNT: needed for anti-hormone injections and blood tests currently done at Brjóstamiðstöð.
- **Akstursþjónusta provider** — specifically "akstursþjónusta fatlaðra." Certificate from Brjóstamiðstöð is the first step. Helga wants as many rides as possible.
- **Andhormónalyf nafn** — Helga doesn't remember the exact name. Ask at next Brjóstamiðstöð visit.

---

## Environment Variables

### Convex (set via `npx convex env set`)
- `AUTH_GOOGLE_ID` — Google OAuth client ID
- `AUTH_GOOGLE_SECRET` — Google OAuth client secret
- `SITE_URL` — `http://localhost:3000` (dev) or Vercel URL (prod)
- `ALLOWED_EMAILS` — comma-separated list of whitelisted Google emails

### Next.js (`.env.local`)
- `CONVEX_DEPLOYMENT` — auto-set by `npx convex dev`
- `NEXT_PUBLIC_CONVEX_URL` — auto-set by `npx convex dev`

---

## Deployment

### Development
```bash
bun install
npx convex dev    # starts Convex dev server
bun dev           # starts Next.js dev server
```

### Production
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy Convex production: `npx convex deploy`
5. Update `SITE_URL` env var in Convex to the Vercel production URL
6. Update Google OAuth redirect URIs to include production URL

---

## v2 Considerations (NOT in v1, but noted for future)

These are explicitly deferred. Do not build them now.

- **Medication check-off:** "Sigga tók lyfið" daily tracker. Only build if the family asks for it.
- **Push notifications:** "Tími á morgun kl. 10:00 — Helga skutlar." Needs service worker + notification permission. Only if reminders become a real pain point.
- **Google Calendar sync:** Two-way sync so appointments also appear in personal calendars. Complex, fragile — defer until clearly needed.
- **AI summary:** "Hvað hefur gerst síðustu vikuna?" auto-generated from log entries. Cool but unnecessary for v1.
- **Multi-patient:** Supporting more than one person. The schema is implicitly single-patient. Don't abstract this yet.
- **Offline support:** Full offline CRUD with sync. Convex handles reconnection gracefully but doesn't cache mutations offline. True offline would need a local-first layer. Defer.

---

## Implementation Order

Suggested build sequence for Claude Code:

1. **Scaffold:** `create-next-app` with bun, add Convex, set up project structure
2. **Auth:** Convex Auth + Google OAuth + whitelist + `src/proxy.ts` redirect (default export)
3. **i18n:** next-intl setup with `is`/`en`, translation files, locale layout
4. **Schema + seed:** Deploy Convex schema, write seed function
5. **Bottom nav + layout shell:** The chrome that wraps everything
6. **Dashboard view:** Queries for next appointments + recent log
7. **Dagbók view:** Full CRUD for log entries
8. **Tímar view:** Full CRUD for appointments + driver volunteering
9. **Upplýsingar — Lyf tab:** Medication CRUD
10. **Upplýsingar — Símaskrá tab:** Contacts CRUD with tappable phone links
11. **Upplýsingar — Réttindi tab:** Entitlements CRUD
12. **Upplýsingar — Skjöl tab:** File upload + list + download
13. **PWA manifest + icons**
14. **Backup cron job**
15. **Tests**
16. **Deploy to Vercel**

---

## Resolved Questions

1. ~~Does everyone have a Google account?~~ → **Yes.** Confirmed. Google OAuth is the auth path.
2. ~~Sigga's current medications~~ → **Resolved.** 5 medications fully documented with dosages and schedules from Helga. Includes newly identified anti-hormone injection (name TBD).
3. ~~Key phone numbers~~ → **Resolved.** Brjóstamiðstöð (543 9560), Ljósið (561-3770), Bati (553-1234), emergency numbers all gathered.
4. ~~App name~~ → **"Sigga".** Confirmed.
5. ~~Who introduces it to the family?~~ → **Nic.** Confirmed.

## Remaining Open Items

1. ~~**Medication dosages and schedules**~~ — **Resolved.** Helga provided all dosages April 16.
2. **Heimilislæknir (GP)** — Name and phone. Helga doesn't know the name either. Someone needs to check — possibly through Heilsugæsla Kópavogs.
3. **Family email addresses** — Needed for the `ALLOWED_EMAILS` whitelist. Gather from Elin, Helga, Anna, Erla + Nic's own.
4. **Exact status of the two certificates** (heimahjúkrun, akstursþjónusta fatlaðra) — Heimahjúkrun is confirmed NOT yet in place (Helga: "ekki komið í gagnið ennþá"). Akstursþjónustu vottorð status unknown. Both need follow-up with Brjóstamiðstöð.
5. **Andhormónalyf nafn** — Helga doesn't remember. Check at next Brjóstamiðstöð visit.