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
| Hosting | Vercel | Auto-domain for v1. Default `.vercel.app` URL. Production deploys via `git push` to `main` — Vercel CI also runs `npx convex deploy`. |
| Analytics | `@vercel/analytics` | Page-view tracking only; no PII per Vercel's data policy. `<Analytics />` component added to root locale layout. |
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
│   ├── recurringSeries.ts        # Recurring appointment series CRUD + invariant helper
│   ├── crons.ts                  # Daily cron: ensure next occurrences for active series
│   ├── backup.ts                 # Scheduled weekly JSON export (Phase 14 — not yet built)
│   ├── users.ts                  # me + list queries
│   └── seed.ts                   # Dev seed data
├── messages/
│   ├── is.json                   # Icelandic translations (primary)
│   └── en.json                   # English translations (secondary)
├── src/
│   ├── proxy.ts                  # Was middleware.ts. Handles auth redirect + locale routing via next-intl. Must live next to `app/`, i.e. in `src/` (not project root) because `app/` is under `src/`.
│   ├── i18n/
│   │   ├── routing.ts            # next-intl routing config
│   │   ├── request.ts            # next-intl request config
│   │   └── navigation.ts         # createNavigation helpers (Link, usePathname, useRouter, redirect)
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx        # Root layout: ConvexProvider + NextIntlClientProvider + Vercel Analytics
│   │   │   ├── (app)/            # Route group — authenticated routes only
│   │   │   │   ├── layout.tsx    # App shell: Header + BottomNav wrapper
│   │   │   │   ├── page.tsx      # Dashboard ("Í dag")
│   │   │   │   ├── umonnun/
│   │   │   │   │   ├── page.tsx       # Care view server wrapper
│   │   │   │   │   └── UmonnunView.tsx # Client: Dagbók + Lyf tabs
│   │   │   │   ├── timar/
│   │   │   │   │   ├── page.tsx      # Appointments view server wrapper
│   │   │   │   │   ├── TimarView.tsx # Client component wrapping SeriesEntryRow + tabs
│   │   │   │   │   └── reglulegir/
│   │   │   │   │       ├── page.tsx          # Server wrapper
│   │   │   │   │       └── ReglulegirView.tsx # Client: recurring series management list
│   │   │   │   ├── folk/
│   │   │   │   │   └── page.tsx      # People view: EmergencyTiles + ContactList
│   │   │   │   └── pappirar/
│   │   │   │       ├── page.tsx        # Paperwork view server wrapper
│   │   │   │       └── PappirarTabs.tsx # Client: Réttindi + Skjöl tabs
│   │   │   └── login/
│   │   │       └── page.tsx      # Login page (Google OAuth button)
│   │   └── layout.tsx            # Bare html/body with fonts + analytics
│   ├── components/
│   │   ├── ui/                   # shadcn components (button, card, sheet, dialog, tabs, switch, …)
│   │   ├── nav/
│   │   │   └── BottomNav.tsx     # Fixed bottom nav (4 tabs: Í dag / Umönnun / Fólk / Pappírar)
│   │   ├── dashboard/
│   │   │   ├── NextAppointments.tsx  # Next 3 upcoming appointments (with driver + volunteer)
│   │   │   ├── RecentLog.tsx         # Latest log entry with inline expand
│   │   │   ├── AttentionCard.tsx     # Amber card: unowned in-progress/not-applied entitlements
│   │   │   └── DrivingCta.tsx        # Amber CTA: one-tap volunteer for unassigned appointment
│   │   ├── appointments/
│   │   │   ├── AppointmentCard.tsx   # Single appointment card — borderless Bókasafn aesthetic
│   │   │   ├── AppointmentList.tsx
│   │   │   ├── AppointmentForm.tsx
│   │   │   └── DriverPicker.tsx
│   │   ├── recurringSeries/          # Recurring series management components
│   │   │   ├── SeriesList.tsx
│   │   │   ├── SeriesCard.tsx
│   │   │   ├── SeriesForm.tsx
│   │   │   └── DayPicker.tsx         # Seven day-chip multi-select
│   │   ├── timar/
│   │   │   └── SeriesEntryRow.tsx    # Entry-point row linking to /timar/reglulegir
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
│   │   │   ├── DocumentUpload.tsx
│   │   │   └── EmergencyTiles.tsx    # Large tappable tel: tiles for top-3 emergency contacts
│   │   └── shared/
│   │       ├── Header.tsx        # Sticky top bar: app name + user avatar + sign-out
│   │       ├── UserAvatar.tsx
│   │       ├── EmptyState.tsx
│   │       └── BookIcon.tsx      # Project icon kit (today/care/people/docs/pill/book/…)
│   └── lib/
│       ├── utils.ts              # cn() and shared utilities
│       ├── formatDate.ts         # Icelandic relative-date helpers
│       └── formatRecurrence.ts  # formatDays, formatCadence, computeNextStartTime helpers
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
│   ├── manifest.json             # PWA manifest (Phase 13 — not yet built)
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

  // Reglulegir tímar — recurring appointment series
  recurringSeries: defineTable({
    title: v.string(),                    // "Virkni og Vellíðan"
    location: v.optional(v.string()),     // "Fífan"
    notes: v.optional(v.string()),
    daysOfWeek: v.array(v.number()),      // [2, 5] = Tue, Fri — 0=Sun..6=Sat (UTC day)
    timeOfDay: v.string(),                // "09:15" — Iceland is UTC+0, no DST math
    durationMinutes: v.optional(v.number()),
    isActive: v.boolean(),                // pause/play
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_active", ["isActive"]),

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
    seriesId: v.optional(v.id("recurringSeries")),  // null = one-off; set = spawned from a series
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_startTime", ["startTime"])
    .index("by_status_and_startTime", ["status", "startTime"])
    .index("by_series_and_startTime", ["seriesId", "startTime"]),  // used by recurring invariant

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
- `localeDetection: false` is set in `src/i18n/routing.ts`. The root URL always serves Icelandic regardless of the browser's `Accept-Language` header — no automatic redirects to `/en/`. This prevents elderly Icelandic users from accidentally landing in the English interface.

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
  "app": {
    "name": "Sigga",
    "tagline": "..."
  },
  "nav": {
    "dashboard": "Í dag",
    "care": "Umönnun",
    "people": "Fólk",
    "paperwork": "Pappírar"
  },
  "dashboard": { ... },
  "timar": { ... },
  "dagbok": { ... },
  "umonnun": {
    "title": "Umönnun",
    "hvernig": "Hvernig Siggu líður.",
    "sections": { "lyf": "Lyf", "dagbok": "Dagbók" }
  },
  "folk": {
    "title": "Fólk",
    "subtitle": "Sími, læknar, þjónusta."
  },
  "pappirar": {
    "title": "Pappírar",
    "tabs": { "rettindi": "Réttindi", "skjol": "Skjöl" }
  },
  "medications": { ... },
  "contacts": { ... },
  "entitlements": { ... },
  "documents": { ... },
  "recurring": {
    "title": "Reglulegir tímar",
    "entryLabel": "Reglulegir tímar",
    "entryCount": "{count, plural, =0 {engir ennþá} =1 {1 virkur} other {{count} virkir}}",
    "entryAllPaused": "Allir í hléi",
    "empty": { "title": "...", "body": "..." },
    "newButton": "Nýr reglulegur tími",
    "active": "Virkt",
    "paused": "Í hléi",
    "edit": "Breyta",
    "delete": "Eyða",
    "deleteConfirm": { "title": "...", "body": "...", "confirm": "...", "cancel": "..." },
    "pauseToast": "{title} sett í hlé",
    "resumeToast": "Næsti tími: {when}",
    "form": {
      "createTitle": "...", "editTitle": "...", "editNextNote": "...",
      "fields": { "title": "Heiti", "days": "Dagar", "time": "Tími",
                  "duration": "...", "durationHint": "...", "location": "...", "notes": "..." },
      "daysShort": { "0": "Sun", "1": "Mán", ... "6": "Lau" },
      "daysLong": { "0": "sunnudaga", ... "6": "laugardaga" }
    },
    "cadence": "{days} kl. {time}"
  },
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
  // Do NOT exclude `api` — Convex Auth POSTs to `/api/auth` and needs the middleware.
  // Excluding `api` causes sign-in to 404 (Safari: "string did not match expected pattern").
  matcher: ["/((?!_next|_vercel|.*\\..*).*)" ]
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

- **Tone:** Warm, soft, Scandinavian-minimal. "Bókasafn aesthetic" — think old library, not cold hospital.
- **Color palette ("Bókasafn palette"):** Tokens are declared in `src/app/globals.css` using Tailwind v4's `:root` + `@theme inline` pattern (no `tailwind.config.ts`). Key tokens:
  - `--page` (#f5f1e8) — warm parchment page background
  - `--paper` (#faf7f0) / `--paper-deep` (#f1ecdf) — card surfaces
  - `--ink` (#2e342b) / `--ink-soft` / `--ink-faint` — text hierarchy
  - `--sage` (#8ba888) / `--sage-deep` (#6b7f5c) / `--sage-shadow` (#4f6243) — primary accent (sage green)
  - `--wheat` (#c9b896) / `--wheat-deep` — secondary accent
  - `--amber-bg-*` / `--amber-ink*` — attention / warning tone
  - `--divider` / `--divider-strong` — border separators (rgba values)
  - Semantic tokens map onto shadcn/ui CSS variable names (`--background`, `--primary`, `--muted`, etc.)
- **Typography:** Source Serif 4 (`font-serif`) for headings/titles; Source Sans 3 (`font-sans`) for body. Both loaded via `next/font/google`. Base body text `text-lg` (18px).
- **Borders and cards:** Borderless "Bókasafn" card style: `bg-paper ring-1 ring-foreground/10 rounded-2xl`. Interior row separators use `border-t border-divider`. Radius base token `--radius: 1rem`.
- **Icons:** Custom `BookIcon` kit (`src/components/shared/BookIcon.tsx`) for bottom-nav icons (today/care/people/docs). Lucide icons used elsewhere. Always paired with text labels — no icon-only primary actions.

### PWA Configuration

The app should be installable as a PWA so it lives on the home screen like a native app:

- `manifest.json` with `display: "standalone"`, Icelandic name "Sigga", appropriate theme color
- Service worker for offline shell (app chrome loads even without network; data shows "Hleð..." until Convex reconnects)
- Apple touch icon and splash screens for iOS

---

### View 1: Í dag (Dashboard) — `/`

The landing page. Answers: "What's happening with Sigga right now?"

**Layout (top to bottom):**

1. **Sticky header** (`Header`): app name "sigga" (italic serif, faint), user avatar + sign-out dropdown (top-right).

2. **Greeting:** "Góðan daginn, *Elin*." with `font-serif` large heading and today's date as an eyebrow.

3. **AttentionCard** (amber, conditional): Surfaces unowned entitlements with status `in_progress` or `not_applied`, sorted by urgency (BRÝNT pattern + status weight). Shows the top item's title + description; a count of additional items; links to `/pappirar`. Hidden when there are no unowned open entitlements.

4. **DrivingCta** (amber, conditional): If any upcoming appointment has no assigned driver, shows an amber CTA "Vantar skutlara" with a one-tap "Ég get skutlað" volunteer button. Hidden when all appointments have drivers.

5. **Next appointments card** (`NextAppointments`): Shows next 3 upcoming appointments (queried via `api.appointments.upcoming` with `limit: 5, includeCancelled: true`, then capped at 3 in the component). Each shows: date/time (Icelandic format), title, location, driver name or "Enginn skutlar" with volunteer button. Cancelled future slots render as a muted italic line. "Sjá alla" link → `/timar`.

6. **Recent log entry** (`RecentLog`): The single latest Dagbók entry. Shows: eyebrow "Dagbók · síðasta færsla · *relative date*", author avatar + name, content with inline expand for long entries ("Sýna alla færsluna" / "Sýna minna"). "Skrifa í dagbók" button opens `LogEntryForm` sheet in-place (no navigation). Empty state: "Engar færslur í dagbók ennþá".

**Real-time:** Dashboard auto-updates via Convex subscriptions. All data from `useQuery`.

---

### View 2: Umönnun (Care) — `/umonnun`

The care coordination view. Contains two tabs: **Dagbók** (care journal) and **Lyf** (medications).

**Route:** `src/app/[locale]/(app)/umonnun/page.tsx` (server wrapper) + `UmonnunView.tsx` (client).

**Tabs (shadcn `Tabs`):** "Dagbók" | "Lyf". Default: Dagbók.

#### Dagbók tab

A reverse-chronological feed of all care-relevant events.

1. **"Skrifa í dagbók"** button (touch-sized, full-width) at the top of the Dagbók tab content — opens `LogEntryForm` sheet from bottom.

2. **Feed (`LogFeed`):** Entries sorted newest-first, paginated (20/page). Each entry card shows:
   - Author avatar + name
   - Date + time (relative for recent: "í gær", "fyrir 3 dögum"; absolute for older)
   - Content (full text, no truncation in feed view)
   - "Breytt" badge if `editedAt` is set
   - Edit button (pencil, `touch-icon` size) — only visible to the original author
   - Linked appointment shown as a small chip (if set)

3. **Entry form (sheet from bottom):**
   - Multiline text input. Placeholder: "Hvað gerðist? Hvaða upplýsingar eru mikilvægar?"
   - Optional: link to an appointment (dropdown of recent/upcoming appointments)
   - "Vista" button
   - No title field. No categories. No tags — dead simple.

4. **Edit flow:** Same form, pre-filled. Sets `editedAt` on save. No revision history in v1.

**Pagination:** Load 20 entries initially. "Sýna eldri" button at bottom.

#### Lyf tab

See Medications section under Upplýsingar. `MedicationTable` component renders here, identical to its behavior in the standalone medications view.

---

### View 3: Tímar (Appointments) — `/timar`

All appointments — upcoming and past. **Not in the bottom nav** — accessible via the "Sjá alla" link from `NextAppointments` on the dashboard and from the `SeriesEntryRow` back link on `/timar/reglulegir`.

**Layout:**

1. **Reglulegir tímar entry row** (above the tabs): A tappable row (`bg-paper ring-1 ring-foreground/10 rounded-2xl`) linking to `/timar/reglulegir`. Shows the count of **active** series ("3 virkir") or "Allir í hléi" if all are paused, or "engir ennþá" when no series exist. Rendered by `SeriesEntryRow` in `src/components/timar/`.

2. **Toggle/tabs:** "Næstu tímar" (Upcoming) | "Liðnir tímar" (Past). Default: upcoming.

3. **Upcoming list:** Sorted by date ascending (soonest first). Each card:
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

5. **Edit/delete for series-bound appointments:** Editing an appointment that belongs to a series shows "Hlaupa yfir þennan tíma" instead of "Eyða". Confirming sets `status: "cancelled"` (keeps the slot visible in the list and allows `ensureNextOccurrence` to advance). Standalone appointments are deleted outright. Confirmation text differs: skip uses "Hlaupa yfir þennan tíma?"; delete uses "Ertu viss? Þetta er ekki hægt að afturkalla."

**AppointmentCard aesthetic:** Cards use the borderless Bókasafn style — `bg-paper ring-1 ring-foreground/10 rounded-2xl` shell; `font-serif` title; `text-ink-faint`/`text-ink-soft` for secondary text instead of `text-muted-foreground`. Interior row separators use `border-t border-divider`.

---

### View 3b: Reglulegir tímar — `/timar/reglulegir`

Series management sub-page. Route: `src/app/[locale]/(app)/timar/reglulegir/page.tsx` (server wrapper) + `ReglulegirView.tsx` (client).

**Layout:**

- Back link ("← Tímar") at top.
- Page heading "Reglulegir tímar" (`font-serif`).
- List of all series rendered by `SeriesList` → individual `SeriesCard` components.
- "Nýr reglulegur tími" pill button at the bottom (sage-deep).

**SeriesCard anatomy:**

- Title: `font-serif text-lg text-ink`.
- Day + time line: `text-sm text-ink-soft` — day names in Icelandic long form joined with `Intl.ListFormat` ("þriðjudaga og föstudaga kl. 09:15"). Minutes always shown (`09:00` not `9:00`).
- Location: `text-sm text-ink-faint` if set.
- Interior divider (`border-t border-divider`) above the action row.
- shadcn `Switch` with label: "Virkt" when on, "Í hléi" when off. Toggling calls `recurringSeries.setActive`.
- "Breyta" (ghost) and "Eyða" (ghost, text-destructive) buttons — `size="touch"`.
- Delete requires a confirmation dialog: "Eyða [title]? Eldri tímar verða áfram sýnilegir í Liðnir tímar."

**Paused card:** full opacity maintained for accessibility; day-time line uses `text-ink-faint`.

**Empty state:** `EmptyState` component with `CalendarRange` icon, title "Engir reglulegir tímar", body "Reglulegir tímar sem endurtaka sig — t.d. Virkni og Vellíðan — birtast hér."

**SeriesForm (create + edit):** shadcn `Sheet` from bottom (`side="bottom"`, `max-h-[92vh]`). Fields: Heiti (required), Dagar (DayPicker chip grid), Tími (`<input type="time">`), Lengd í mínútum (optional), Staðsetning (optional), Athugasemdir (optional). On edit: footer note that the next occurrence is not updated automatically. Primary button: "Vista".

**DayPicker:** Seven day chips (Sun–Lau abbreviations) in a grid. Selected: `bg-sage-deep text-paper`; unselected: `bg-paper-deep text-ink-soft`. Multi-select, rounded-full, 48px height.

**`update` behaviour:** Editing a series does NOT re-spawn or patch the already-scheduled upcoming occurrence. The user must cancel that appointment directly if they want the new values reflected immediately. The edit form footer warns them of this.

---

### Views 4 & 5: Fólk and Pappírar — `/folk` and `/pappirar`

The reference section is split across two bottom-nav tabs. Lyf (medications) moved into the Umönnun view (tab 2). The remaining reference content is:

**View 4: Fólk (People) — `/folk`**

Contacts + emergency tiles. Route: `src/app/[locale]/(app)/folk/page.tsx` (server component, no client wrapper needed).

**Layout:** Large `EmergencyTiles` row at top (tappable tel: tiles for the top 3 emergency contacts — Neyðarlína, Eitrunarmiðstöð, Læknavaktin), followed by `ContactList` for all other categories.

**View 5: Pappírar (Paperwork) — `/pappirar`**

Entitlements + Documents. Route: `src/app/[locale]/(app)/pappirar/page.tsx` (server wrapper) + `PappirarTabs.tsx` (client).

**Layout:** Tab bar (`PappirarTabs` using shadcn `Tabs`). Tabs: **Réttindi** | **Skjöl**. Default: Réttindi. Tab selection persists in URL via `?tab=` query param. Tab header shows a contextual headline ("Réttindi í vinnslu." / "Skjöl í safninu." etc.) that updates based on the entitlement/document state. All `TabsContent` regions are mounted once and toggled via CSS.

#### Lyf (Medications) — Umönnun tab, not a standalone section

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

#### Símaskrá (Contacts) — Fólk view (`/folk`)

**Layout:** `EmergencyTiles` at top — large tappable tel: tiles for the top 3 emergency contacts (Neyðarlína, Eitrunarmiðstöð, Læknavaktin). Below: `ContactList` grouped by category.

**Grouped by category:**
- Section headers: Neyð, Læknar og heilsugæsla, Sveitarfélag og þjónusta, Fjölskylda, Annað
- Empty categories are hidden
- Each contact: Name, role (if set), phone (tappable `tel:` chip with phone icon), email (tappable `mailto:` chip)
- "Bæta við tengilið" button (ContactForm sheet)

**Phone numbers must be tappable.** This is the #1 use case: someone needs a number fast, they open the app, find it, tap to call. Zero extra steps.

#### Réttindi (Entitlements) — Pappírar tab

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
- **Urgency indicator:** Cards whose `notes` field contains the word "brýnt" (case-insensitive regex `/brýnt/i`) show an orange "BRÝNT" pill and a warning-tinted border. There is no dedicated `urgent` schema field — urgency is entirely free-text-driven.
- Tap to edit

**Add entitlement form:**
- Title (required)
- Status (dropdown, default: "not_applied")
- Applied to (optional)
- Owner (optional — dropdown of family members)
- Description (optional)
- Notes (optional)

#### Skjöl (Documents) — Pappírar tab

**Simple file list:**
- Each row: title, filename, category tag (if set), upload date, uploaded by
- Tap → download/view (Convex serves the file URL)
- "Hlaða upp skjali" (Upload document) button

**Upload form:**
- File picker — a hidden `<input type="file">` triggered by a visible shadcn `Button` (native system file picker opens; no custom file-input styling)
- Title (required — pre-fill from filename, allow override; a `titleDirty` flag stops further autofill once the user edits it)
- Category (optional free text with `<datalist>` suggestions: "Lyfseðill", "Blóðprufa", "Bréf frá lækni", "Umsókn", "Vottorð")
- Notes (optional)
- Max file size: whatever Convex allows (currently unlimited via upload URLs, 20MB via HTTP actions — use upload URLs)

**File upload flow (Convex):**
1. Client calls `generateUploadUrl` mutation
2. Client POSTs file to the returned URL
3. Client receives `storageId`
4. Client calls `documents.save` mutation with `storageId` + metadata (or `documents.abandonUpload` in the catch branch if `save` fails)

---

### Bottom Navigation

Fixed at the bottom of every view. 4 tabs rendered by `BottomNav.tsx` using the custom `BookIcon` kit:

| Icon kind | Label | Route |
|-----------|-------|-------|
| `today` | Í dag | `/` |
| `care` | Umönnun | `/umonnun` |
| `people` | Fólk | `/folk` |
| `docs` | Pappírar | `/pappirar` |

Note: `/timar` (Appointments) is NOT in the bottom nav. It is reachable via the "Sjá alla" link in the `NextAppointments` card on the dashboard.

Active tab: filled icon + `text-sage-shadow`. Inactive: `text-ink-faint`.
Label text always visible (not icon-only). Bottom gradient fade + safe-area-inset padding.

---

## Convex Functions

### Naming convention

`[table].[action]` — e.g., `appointments.list`, `appointments.create`, `logEntries.add`

### Required functions

**appointments.ts:**
- `list` — query: all appointments, ordered by startTime. Args: `{ status?: "upcoming" | "completed" | "cancelled" }`. Filter upcoming = startTime > now.
- `upcoming` — query: dashboard-optimised. Args: `{ limit?: number, includeCancelled?: boolean }` (default limit 3, includeCancelled false). Without `includeCancelled`: uses `.withIndex("by_status_and_startTime", q => q.eq("status", "upcoming").gte("startTime", now)).order("asc").take(limit)`. With `includeCancelled: true`: over-fetches on `by_startTime` where `startTime >= now`, filters out `completed`, takes `limit` — used by the dashboard to show cancelled future slots (series skip-next slots) as muted lines. Series-spawned occurrences appear here automatically.
- `past` — query: appointments whose `startTime < now`, ordered by `startTime` descending (most recent first). Uses `.withIndex("by_startTime", q => q.lt("startTime", now))`. Args: `{ limit?: number }` (default 50). Consumed by the Tímar past-tab via `api.appointments.past`.
- `get` — query: single appointment by ID.
- `create` — mutation: create appointment. Auto-set `createdBy`, `updatedBy`, `updatedAt`, `status: "upcoming"`.
- `update` — mutation: update appointment fields. Set `updatedBy`, `updatedAt`. **Side-effect:** if the updated row has a `seriesId` and transitions out of `"upcoming"` status (to `"completed"` or `"cancelled"`), calls `ensureNextOccurrence(ctx, seriesId)` to spawn the next occurrence immediately.
- `remove` — mutation: delete appointment. **Side-effect:** if the deleted row had a `seriesId` and was `"upcoming"`, calls `ensureNextOccurrence(ctx, seriesId)`.
- `volunteerToDrive` — mutation: sets `driverId` to current user. Simple, one-tap.

**recurringSeries.ts:**

The core invariant: every `recurringSeries` with `isActive === true` has at most one upcoming `appointments` row at any moment. A shared `ensureNextOccurrence(ctx, seriesId)` internal helper enforces it.

- `list` — query: all series ordered by title (Icelandic collation). No args.
- `get` — query: `{ id }`. Returns a single series or `null`.
- `create` — mutation: `{ title, location?, notes?, daysOfWeek, timeOfDay, durationMinutes? }`. Creates with `isActive: true`, then calls `ensureNextOccurrence` to spawn the first occurrence. Validates: `daysOfWeek` non-empty, each value `0..6`; `timeOfDay` matches `/^([01]\d|2[0-3]):[0-5]\d$/`; `durationMinutes` if set `>= 1 && <= 24*60`.
- `update` — mutation: partial update. **Does not** re-spawn or patch the existing upcoming occurrence. The form footer warns the user; they can cancel the appointment directly to get one with updated values.
- `setActive` — mutation: `{ id, isActive }`. **Pause** (`true → false`): deletes the upcoming occurrence row. **Resume** (`false → true`): calls `ensureNextOccurrence`. History (past occurrences) is untouched either way.
- `remove` — mutation: `{ id }`. (1) Deletes upcoming occurrence. (2) Sets `seriesId = undefined` on all past occurrences so they survive as standalone history. (3) Deletes the series row.
- `ensureNextOccurrences` — **internal** mutation (no public args). Iterates all active series and calls `ensureNextOccurrence` for each. Invoked by the daily cron.

`ensureNextOccurrence(ctx, seriesId)` algorithm: load series; if inactive, return. Query `by_series_and_startTime` for all rows with `startTime >= now`; if any `status === "upcoming"` row exists, return (invariant already holds). Build a `blockedStartTimes` set of timestamps from existing `cancelled`/`completed` future rows (these are skip-next slots that must not be reused). Walk forward from `now` one candidate slot at a time — at each `daysOfWeek` match, compute the exact `startTime` for that day; skip if that timestamp is in `blockedStartTimes` — up to 14 iterations maximum. On finding a free slot, insert an `appointments` row copying `title`, `location`, `notes`, `seriesId`; `createdBy`/`updatedBy` = series `createdBy`.

**convex/crons.ts:** daily job at 00:10 UTC:
```typescript
crons.cron(
  "ensure recurring appointment occurrences",
  "10 0 * * *",
  internal.recurringSeries.ensureNextOccurrences,
);
```
Uses `crons.cron` (not the deprecated `crons.daily` helper) per Convex guidelines.

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
- `list` — query: all contacts as a flat array, sorted by `sortOrder` (nullish last) then by name with Icelandic collation. Grouping by category is a UI concern done client-side in `ContactList.tsx`.
- `create` — mutation.
- `update` — mutation.
- `remove` — mutation.

**entitlements.ts:**
- `list` — query: all entitlements. Ordered by status (in_progress first, then not_applied, approved, denied).
- `create` — mutation. Auto-set `updatedAt`, `updatedBy`.
- `update` — mutation. Set `updatedAt`, `updatedBy`.
- `remove` — mutation.

**documents.ts:**
- `list` — query: all documents, ordered by `_creationTime` desc. Each row is enriched with a signed `url` (via `ctx.storage.getUrl` per row) and an `addedByUser` summary — no separate URL query needed.
- `generateUploadUrl` — mutation: returns upload URL from `ctx.storage.generateUploadUrl()`.
- `save` — mutation: creates document record with `storageId` and metadata.
- `abandonUpload` — mutation: requires auth; deletes a previously uploaded blob by `storageId` without creating a document record. Called by `DocumentUpload` in the catch branch to clean up orphan blobs when `save` fails after the file has already been POSTed.
- `remove` — mutation: deletes document record AND file from storage via `ctx.storage.delete(storageId)`.

**users.ts:**
- `me` — query: returns the authenticated user document, or `null` if unauthenticated.
- `list` — query: returns all users as `{ _id, name, email, image }` summaries. Used by `DriverPicker` and entitlement owner pickers.

**backup.ts:** (Phase 14 — not yet built)
- `weeklyExport` — scheduled action (Convex cron): runs weekly. Queries all data, serializes to JSON, stores as a file in Convex storage. Keeps last 4 backups, deletes older ones.
- Register in `convex/crons.ts` using `crons.cron` (the deprecated `crons.weekly` / `crons.daily` helpers must not be used — Convex guidelines require `crons.interval` or `crons.cron`):
  ```typescript
  crons.cron(
    "weekly backup",
    "0 3 * * 0",   // Sunday 03:00 UTC
    internal.backup.weeklyExport,
  );
  ```

### Authorization pattern

Every mutation **and** every data-returning query must:
1. Call `getAuthUserId(ctx)` from `@convex-dev/auth/server`.
2. If the result is `null`, throw `ConvexError("Ekki innskráður")`.

`NEXT_PUBLIC_CONVEX_URL` ships in the client bundle, so any caller who inspects the JS can call `api.*.list` directly — only this server-side check enforces the whitelist. The one documented exception is `users.me`, which returns `null` for unauthenticated callers by design so the header can render a signed-out state.

No roles in v1 — every authenticated family member can do everything, except log-entry editing which checks `authorId === currentUser`.

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

Phases 0–12 + 8.5 are complete as of 2026-04-18. Remaining: Phase 13 (PWA), Phase 14 (backup), Phase 15 (polish), Phase 16 (tests), Phase 17 (deploy/onboard).

Actual build sequence shipped:

1. **Scaffold** — create-next-app, Convex, shadcn/ui, Biome (Phase 0)
2. **Auth** — Convex Auth + Google OAuth + whitelist + `src/proxy.ts` (Phase 1)
3. **i18n** — next-intl, `is`/`en`, locale layout (Phase 2)
4. **Schema + seed** — full Convex schema + real seed data (Phase 3)
5. **App shell** — bottom nav (Í dag / Umönnun / Fólk / Pappírar), header, layout (Phase 4)
6. **Dashboard** — greeting + AttentionCard + DrivingCta + NextAppointments + RecentLog (Phase 5)
7. **Umönnun/Dagbók** — log CRUD in Dagbók tab inside `/umonnun` (Phase 6)
8. **Tímar** — appointments CRUD, driver volunteering (Phase 7; `/timar` reachable via dashboard link, not bottom nav)
9. **Umönnun/Lyf** — medication CRUD in Lyf tab inside `/umonnun` (Phase 8)
10. **Reglulegir tímar** — recurring series management + cron invariant (Phase 8.5)
11. **Fólk** — emergency tiles + contacts CRUD on `/folk` (Phase 9)
12. **Pappírar/Réttindi** — entitlements CRUD on `/pappirar` Réttindi tab (Phase 10)
13. **Pappírar/Skjöl** — document upload/list/delete on `/pappirar` Skjöl tab (Phase 11)
14. **Info container redesign** — UmonnunView + FolkPage + PappirarTabs replacing planned Upplýsingar page (Phase 12)
15. **PWA manifest + icons** — Phase 13 (not yet built)
16. **Backup cron job** — Phase 14 (not yet built)
17. **Polish + tests + deploy** — Phases 15–17 (not yet built)

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