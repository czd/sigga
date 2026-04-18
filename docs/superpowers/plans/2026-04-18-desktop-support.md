# Desktop Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Sigga PWA usable on desktop browsers (≥1024 px) without regressing the mobile experience or changing any view-level visuals. Add a 248-px persistent left `Sidebar`, hide the mobile `BottomNav` and sticky `Header` at `lg:`, cap each route's content column at 608 px (720 px for Pappírar at `xl:`), and convert bottom `Sheet`s into centered modals on desktop.

**Architecture:** A single `lg:` (1024 px) responsive breakpoint swaps the app shell between mobile (sticky `Header` + fixed `BottomNav`) and desktop (fixed left `Sidebar`, no top header). View bodies, cards, forms, lists, density, typography, and tap targets are unchanged. The `Sheet` primitive's `side="bottom"` variant becomes a centered modal at `lg:`. No new routes, no schema changes, no new i18n keys, no new tests (Phase 16 will add e2e); manual browser smoke at three viewports is the verification gate.

**Tech Stack:** Next.js 16 (App Router) · React 19 client components · Tailwind CSS 4 (tokens declared inline in `src/app/globals.css` via `@theme`) · shadcn/ui · `next-intl` (`Link`, `usePathname` from `@/i18n/navigation`) · Lucide icons via the project's own `BookIcon` kit · Bun · Biome (lint/format).

**Source spec:** `docs/superpowers/specs/2026-04-18-desktop-support-design.md`

**Process notes for the executor:**

- Every commit must pass the project's pre-commit QA gate (`/tmp/sigga-qa-passed` ≤ 15 min old, consumed on use). For code changes in this plan, run the `qa` agent (`Agent` tool with `subagent_type: "qa"`) before committing. Trivial documentation tweaks may use `[skip-qa]` per the harness rules; nothing in this plan qualifies — every task touches real code.
- Run `bunx tsc --noEmit` after each task that adds or changes a `.tsx` file. The QA agent does this too, but running it once locally first surfaces typos quickly.
- Do not push to `origin/main`. Push only the feature branch (`claude/desktop-support`) at the end of Task 7.
- Do not introduce a `tailwind.config.ts` or any new dependency. All width and breakpoint values come from Tailwind's defaults plus inline arbitrary values (`w-[248px]`, `lg:max-w-[704px]`).
- Do not add new strings or new i18n keys.
- All Bókasafn aesthetic rules from the spec are non-negotiable and apply at every step. If a step "feels like" it could use a sidebar widget or a desktop-only flourish, it can't.

---

## File Structure

**New files (1):**

| File | Responsibility |
| --- | --- |
| `src/components/nav/Sidebar.tsx` | Desktop-only persistent left navigation: wordmark, four nav items (Í dag, Umönnun, Fólk, Pappírar), user avatar dropdown with sign-out. Hidden below `lg:`. |

**Modified files (10):**

| File | Change |
| --- | --- |
| `src/app/[locale]/(app)/layout.tsx` | Render `<Sidebar />`. Add responsive offsets (`lg:pl-[248px]`, `lg:pl-24`, `lg:pb-12`) to the existing `<main>` and an inner gutter wrapper. |
| `src/components/nav/BottomNav.tsx` | Add `lg:hidden` to the outer `<nav>`. |
| `src/components/shared/Header.tsx` | Add `lg:hidden` to the outer `<header>`. |
| `src/components/ui/sheet.tsx` | Extend the `data-[side=bottom]` variant classes so the bottom sheet becomes a centered modal at `lg:` (transform-positioned, fixed max width, zoom-in animation). |
| `src/app/[locale]/(app)/page.tsx` | Wrap the returned root `<div>` in `lg:max-w-[704px]` (or update its existing className). |
| `src/app/[locale]/(app)/umonnun/page.tsx` | Wrap `<UmonnunView />` in `<div className="lg:max-w-[704px]">`. |
| `src/app/[locale]/(app)/folk/page.tsx` | Add `lg:max-w-[704px]` to the existing root `<div>`. |
| `src/app/[locale]/(app)/pappirar/page.tsx` | Add `lg:max-w-[704px] xl:max-w-[816px]` to the existing root `<div>`. |
| `src/app/[locale]/(app)/timar/page.tsx` | Wrap `<TimarView />` in `<div className="lg:max-w-[704px]">`. |
| `src/app/[locale]/(app)/timar/reglulegir/page.tsx` | Wrap `<ReglulegirView />` in `<div className="lg:max-w-[704px]">`. |

**Files deliberately not touched:**

- `src/app/[locale]/login/page.tsx` — already centers via `flex-1 flex flex-col items-center justify-center px-6 py-12`. Verified manually in Task 6; only edited if it actually breaks (it shouldn't).
- `convex/**` — no backend changes.
- `messages/{is,en}.json` — no new strings.
- `src/app/globals.css` — palette and theme tokens unchanged.
- `src/i18n/**`, `src/proxy.ts` — unchanged.
- All `View` client components (`UmonnunView`, `TimarView`, `ReglulegirView`, `PappirarTabs`) and any card/form/list components — visuals untouched. The whole point of the design is that desktop is a shell change.

---

## Task 1: Hide BottomNav and mobile Header at desktop breakpoint

The smallest possible first commit. Adds `lg:hidden` to the two existing nav surfaces so they disappear above 1024 px. The app at desktop will look broken (no nav at all), but the page bodies themselves render. This is the foundation everything else builds on.

**Files:**

- Modify: `src/components/nav/BottomNav.tsx:33-42` (the outer `<nav>` element)
- Modify: `src/components/shared/Header.tsx:25` (the outer `<header>` element)

- [ ] **Step 1: Add `lg:hidden` to the BottomNav outer `<nav>`**

Open `src/components/nav/BottomNav.tsx`. The current outer element is:

```tsx
<nav
  className="fixed bottom-0 inset-x-0 z-30 pt-6 pb-5 pointer-events-none"
  style={{
    paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
    background:
      "linear-gradient(to top, rgb(245 241 232 / 1) 45%, rgb(245 241 232 / 0.85) 75%, rgb(245 241 232 / 0) 100%)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
  }}
>
```

Change the `className` to:

```tsx
<nav
  className="fixed bottom-0 inset-x-0 z-30 pt-6 pb-5 pointer-events-none lg:hidden"
  style={{
    /* unchanged */
  }}
>
```

Only the `className` string changes; everything else stays.

- [ ] **Step 2: Add `lg:hidden` to the Header outer `<header>`**

Open `src/components/shared/Header.tsx`. The current outer element is:

```tsx
<header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
```

Change to:

```tsx
<header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
```

Only that string changes.

- [ ] **Step 3: Typecheck**

Run: `bunx tsc --noEmit`
Expected: exit 0, no errors. (No new types introduced; trivially safe.)

- [ ] **Step 4: Visual smoke at mobile + desktop**

Run: `bun dev` (in a separate terminal if not already running).

In a browser:

1. Open `http://localhost:3000/` at viewport 375×812. Verify: bottom nav and header both visible. Tap a nav item — still works.
2. Resize the viewport to 1280×800 (or open DevTools and set device frame to ≥1024 wide). Verify: both bottom nav and mobile header are now invisible. The page body still renders (you'll see the dashboard cards). There's no nav — that's expected; Sidebar comes in Task 3.

Stop `bun dev` when done.

- [ ] **Step 5: QA + commit**

Run the QA agent on the staged changes:

```
Agent(subagent_type: "qa", description: "QA staged BottomNav + Header lg:hidden", prompt: "Pre-commit review of staged changes — adding `lg:hidden` to BottomNav.tsx and Header.tsx so they disappear at the lg: (1024px) breakpoint. This is the first step of the desktop-support feature. Verify lint, typecheck, and that no other Sigga conventions are broken.")
```

On PASS, the agent writes the marker. Then commit:

```bash
git add src/components/nav/BottomNav.tsx src/components/shared/Header.tsx
git commit -m "$(cat <<'EOF'
ui(nav): hide BottomNav and mobile Header at lg: breakpoint

First step of desktop-support shell. Both wrappers gain `lg:hidden` so the
mobile chrome disappears above 1024px. Sidebar replacement lands in the next
commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Build the Sidebar component

Create the new `Sidebar.tsx`. It is the desktop counterpart to `BottomNav.tsx` (same four nav items, same `BookIcon` kit, same `Link` from `@/i18n/navigation`, same active-state token `text-sage-shadow`) plus the user dropdown that lives in `Header.tsx` today (same `DropdownMenu`, same `UserAvatar`, same sign-out flow). The whole component is `hidden lg:flex` so it has zero effect on mobile.

The component is self-contained and not yet wired into the layout — that's Task 3. This separation lets us QA the sidebar's structure before it changes anything visible.

**Files:**

- Create: `src/components/nav/Sidebar.tsx`

- [ ] **Step 1: Create the Sidebar component**

Create `src/components/nav/Sidebar.tsx` with this exact content:

```tsx
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { ChevronUp, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { BookIcon } from "@/components/shared/BookIcon";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type IconKind = "today" | "care" | "people" | "docs";

type NavItem = {
	href: "/" | "/umonnun" | "/folk" | "/pappirar";
	labelKey: "dashboard" | "care" | "people" | "paperwork";
	icon: IconKind;
};

const ITEMS: NavItem[] = [
	{ href: "/", labelKey: "dashboard", icon: "today" },
	{ href: "/umonnun", labelKey: "care", icon: "care" },
	{ href: "/folk", labelKey: "people", icon: "people" },
	{ href: "/pappirar", labelKey: "paperwork", icon: "docs" },
];

function isActive(pathname: string, href: NavItem["href"]): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
	const t = useTranslations();
	const navT = useTranslations("nav");
	const pathname = usePathname();
	const { signOut } = useAuthActions();
	const me = useQuery(api.users.me);

	const displayName = me?.name?.trim() || me?.email || "";

	return (
		<aside
			className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col bg-page border-r border-divider"
			aria-label={t("app.name")}
		>
			<div className="px-6 pt-7 pb-6">
				<span className="font-serif italic text-base font-normal text-ink-faint tracking-wide">
					{t("app.name").toLowerCase()}
				</span>
			</div>

			<nav className="flex-1 flex flex-col gap-1 px-3 font-sans">
				<ul className="flex flex-col gap-1">
					{ITEMS.map(({ href, labelKey, icon }) => {
						const active = isActive(pathname, href);
						return (
							<li key={href}>
								<Link
									href={href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex items-center gap-3 px-3 min-h-12 rounded-2xl text-base transition-colors",
										active
											? "bg-paper text-sage-shadow font-semibold"
											: "text-ink-soft hover:bg-paper/80",
									)}
								>
									<BookIcon
										kind={icon}
										size={22}
										strokeWidth={active ? 2 : 1.6}
										filled={active && icon === "today"}
									/>
									<span>{navT(labelKey)}</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className="mt-auto px-3 pb-6">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="w-full flex items-center gap-3 px-3 min-h-12 rounded-2xl text-left text-ink-soft hover:bg-paper/80 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							aria-label={displayName}
						>
							<UserAvatar
								name={me?.name}
								email={me?.email}
								imageUrl={me?.image}
								className="size-8 text-xs"
							/>
							<span className="flex-1 truncate text-sm">{displayName}</span>
							<ChevronUp aria-hidden className="size-4 text-ink-faint" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align="start"
						side="top"
						className="min-w-56"
					>
						<DropdownMenuLabel className="flex flex-col gap-0.5">
							<span className="text-base font-medium leading-tight">
								{me?.name ?? "—"}
							</span>
							{me?.email ? (
								<span className="text-sm font-normal text-muted-foreground break-all">
									{me.email}
								</span>
							) : null}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Button
								variant="ghost"
								size="touch"
								onClick={() => signOut()}
								className="w-full justify-start"
							>
								<LogOut aria-hidden />
								<span>{t("auth.signOut")}</span>
							</Button>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</aside>
	);
}
```

Notes on the code:

- `data-slot`/aria attributes mirror the existing nav components for consistency.
- `aria-label={t("app.name")}` gives the `<aside>` an accessible name (it's a landmark; without a name, screen readers announce only "complementary").
- `useQuery(api.users.me)` — same pattern the `Header` uses; this is how the avatar/name appear. The `users.me` query is the documented exception that returns `null` for unauthenticated callers, which is fine: the sidebar is only rendered inside `(app)/`, so the user is always signed in by the time it mounts.
- `side="top"` on the dropdown so the menu pops upward from the bottom-anchored button (otherwise it would be cut off).
- Hover treatment is `bg-paper/80` (the lighter paper at 80% alpha). This is consistent with the active state `bg-paper` but quieter on hover. No separate hover token needed.
- No `Tímar` item in the sidebar — Tímar is reached from the dashboard, same as on mobile (per spec).

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: exit 0. The new file is fully typed; if you see errors, the most likely cause is a wrong import path — double-check `@/i18n/navigation` and `@/../convex/_generated/api`.

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: exit 0 (Biome reports no errors on the new file). If Biome flags formatting, run `bun run lint:fix`.

- [ ] **Step 4: Confirm Sidebar does not render at this stage**

The component exists but isn't imported anywhere yet. Run `bun dev` and verify at viewport 1280×800 that the dashboard still has no nav (no sidebar visible — that's expected; it's not wired in yet).

- [ ] **Step 5: QA + commit**

Run the QA agent:

```
Agent(subagent_type: "qa", description: "QA new Sidebar component", prompt: "Pre-commit review of the new src/components/nav/Sidebar.tsx component. It mirrors BottomNav.tsx + Header.tsx semantics for desktop. Not yet wired into the layout. Check Sigga conventions: requireAuth on queries (it uses users.me which is the documented exception), i18n via t() not hardcoded strings, BookIcon for icons, Link from @/i18n/navigation, no new dependencies, accessible aside landmark.")
```

On PASS, commit:

```bash
git add src/components/nav/Sidebar.tsx
git commit -m "$(cat <<'EOF'
ui(nav): add desktop Sidebar component (not yet wired)

Mirrors the four BottomNav items (Í dag, Umönnun, Fólk, Pappírar) using the
same BookIcon kit and i18n nav namespace. Bottom-anchored DropdownMenu reuses
the existing UserAvatar + signOut flow from Header. Hidden below lg: so it
has no effect until the layout wires it in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire Sidebar into the (app) layout shell

The Sidebar component is built; now mount it in `(app)/layout.tsx` and add the responsive offsets so content shifts right by 248 px and gains a 96-px gutter on desktop. After this task, desktop view goes from "no nav" to "fully functional layout".

**Files:**

- Modify: `src/app/[locale]/(app)/layout.tsx` (entire file rewritten — it's small)

- [ ] **Step 1: Update the (app) layout**

Open `src/app/[locale]/(app)/layout.tsx`. Replace the file's contents with:

```tsx
import { setRequestLocale } from "next-intl/server";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { Header } from "@/components/shared/Header";

export default async function AppLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<>
			<Sidebar />
			<Header />
			<main className="flex-1 pb-32 lg:pb-12 lg:pl-[248px]">
				<div className="lg:pl-24">{children}</div>
			</main>
			<BottomNav />
		</>
	);
}
```

What changed:

- New import: `import { Sidebar } from "@/components/nav/Sidebar";`
- New element: `<Sidebar />` rendered first (it's `hidden lg:flex`, so still invisible on mobile).
- `<main>` className gains `lg:pb-12 lg:pl-[248px]` — bottom padding shrinks on desktop (no bottom-nav clearance needed) and the whole content area shifts right by the sidebar width.
- A new inner `<div className="lg:pl-24">` wraps `{children}` to give the 96-px gutter from the sidebar edge. On mobile, this `pl-24` is not active — `lg:pl-24` only applies at `lg:` and up.

The layout intentionally does **not** apply a `max-w-*` — that lives in each `page.tsx` (Task 4) so the per-route widths can vary.

- [ ] **Step 2: Typecheck**

Run: `bunx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Visual smoke — desktop**

Run `bun dev`. Open `http://localhost:3000/` at viewport 1440×900.

Verify:

1. Sidebar visible on the left, 248 px wide. Wordmark "sigga" at top in italic serif.
2. Four nav items (Í dag, Umönnun, Fólk, Pappírar) with `BookIcon`s. Click each — page navigates.
3. Active item shows the sage-shadow text and `bg-paper` background.
4. User block at the bottom of the sidebar shows the avatar + name + chevron. Clicking it opens the dropdown above; "Skrá út" is at the bottom.
5. Content area starts ~344 px from the left (248 sidebar + 96 gutter) and is unbounded in width (no max-width set yet — full content stretches; that's Task 4's job).

- [ ] **Step 4: Visual smoke — mobile**

Resize to viewport 375×812.

Verify:

1. Sidebar gone (it's `hidden lg:flex`).
2. Sticky `Header` back at top with avatar.
3. `BottomNav` back at the bottom.
4. Content has the original `pb-32` clearance (no extra padding visible).

Stop `bun dev`.

- [ ] **Step 5: QA + commit**

Run QA:

```
Agent(subagent_type: "qa", description: "QA layout wiring for desktop Sidebar", prompt: "Pre-commit review of src/app/[locale]/(app)/layout.tsx changes — wires the new Sidebar into the shell and adds responsive offsets (lg:pl-[248px], lg:pl-24, lg:pb-12). No mobile regression expected. Verify lint, typecheck, and the Convex/i18n conventions are preserved (setRequestLocale still called, no client-only patterns leaking into the server layout).")
```

On PASS, commit:

```bash
git add src/app/[locale]/(app)/layout.tsx
git commit -m "$(cat <<'EOF'
ui(shell): wire Sidebar into (app) layout with responsive offsets

Mounts the new desktop Sidebar and shifts <main> right by 248px at lg:.
A 96px inner gutter sits between the sidebar edge and the content column.
Mobile shell unchanged — Sidebar is hidden lg:flex.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Cap each route's content column at the right desktop width

The shell now offsets correctly on desktop, but content stretches to the full viewport width. This task adds `lg:max-w-[704px]` (608 column + 96 gutter accounted for in the parent) to each authenticated `page.tsx`, plus the `xl:max-w-[816px]` widening for Pappírar. Per the spec, the width override lives on the page wrapper (not the layout, not the View component), so this is a series of small edits across six files.

**Files:**

- Modify: `src/app/[locale]/(app)/page.tsx` (existing root `<div>` className)
- Modify: `src/app/[locale]/(app)/umonnun/page.tsx` (wrap `<UmonnunView />`)
- Modify: `src/app/[locale]/(app)/folk/page.tsx` (existing root `<div>` className)
- Modify: `src/app/[locale]/(app)/pappirar/page.tsx` (existing root `<div>` className with `xl:` variant)
- Modify: `src/app/[locale]/(app)/timar/page.tsx` (wrap `<TimarView />`)
- Modify: `src/app/[locale]/(app)/timar/reglulegir/page.tsx` (wrap `<ReglulegirView />`)

- [ ] **Step 1: Dashboard (`page.tsx`) — extend root div**

Open `src/app/[locale]/(app)/page.tsx`. The current root return is:

```tsx
return (
  <div className="px-6 pt-8 pb-10 flex flex-col gap-8">
    {/* ... */}
  </div>
);
```

Change the className to add `lg:max-w-[704px]`:

```tsx
return (
  <div className="px-6 pt-8 pb-10 flex flex-col gap-8 lg:max-w-[704px]">
    {/* ... */}
  </div>
);
```

- [ ] **Step 2: Umönnun — wrap the view**

Open `src/app/[locale]/(app)/umonnun/page.tsx`. The current return is:

```tsx
return <UmonnunView />;
```

Change to:

```tsx
return (
  <div className="lg:max-w-[704px]">
    <UmonnunView />
  </div>
);
```

- [ ] **Step 3: Fólk — extend root div**

Open `src/app/[locale]/(app)/folk/page.tsx`. The current root return is:

```tsx
return (
  <div className="px-6 pt-4 pb-28 flex flex-col gap-6">
    {/* ... */}
  </div>
);
```

Change the className:

```tsx
return (
  <div className="px-6 pt-4 pb-28 flex flex-col gap-6 lg:max-w-[704px]">
    {/* ... */}
  </div>
);
```

- [ ] **Step 4: Pappírar — extend root div with xl: widening**

Open `src/app/[locale]/(app)/pappirar/page.tsx`. The current root return is:

```tsx
return (
  <div className="px-6 pt-4 pb-28 flex flex-col gap-4">
    {/* ... */}
  </div>
);
```

Change the className to use both `lg:` and `xl:`:

```tsx
return (
  <div className="px-6 pt-4 pb-28 flex flex-col gap-4 lg:max-w-[704px] xl:max-w-[816px]">
    {/* ... */}
  </div>
);
```

- [ ] **Step 5: Tímar — wrap the view**

Open `src/app/[locale]/(app)/timar/page.tsx`. The current return is:

```tsx
return <TimarView />;
```

Change to:

```tsx
return (
  <div className="lg:max-w-[704px]">
    <TimarView />
  </div>
);
```

- [ ] **Step 6: Reglulegir tímar — wrap the view**

Open `src/app/[locale]/(app)/timar/reglulegir/page.tsx`. The current return is:

```tsx
return <ReglulegirView />;
```

Change to:

```tsx
return (
  <div className="lg:max-w-[704px]">
    <ReglulegirView />
  </div>
);
```

- [ ] **Step 7: Typecheck**

Run: `bunx tsc --noEmit`
Expected: exit 0. None of these changes touches a type.

- [ ] **Step 8: Visual smoke — desktop column widths**

Run `bun dev`. At viewport 1440×900:

1. `/` (dashboard) — content column is 608 px wide (visually verify with DevTools by inspecting the root div), left-aligned, large empty cream area on the right.
2. `/umonnun` — same 608-px column.
3. `/folk` — same 608-px column. EmergencyTiles render fine within it.
4. `/pappirar` — same 608-px column at 1440 (we're between `lg:` and `xl:`). Verify by inspecting.
5. `/timar` — same 608-px column.
6. `/timar/reglulegir` — same 608-px column.

Resize to 1920×1080:

7. `/pappirar` — column is now 720 px wide (`xl:` boundary at 1280 px has triggered).
8. All other routes — still 608 px.

Resize to 1024×768 (the `lg:` boundary):

9. `/pappirar` — column is 608 px (NOT 720; the `xl:` boundary at 1280 hasn't triggered). Verify there's no horizontal overflow — sidebar 248 + gutter 96 + column 608 = 952 px, leaving 72 px right margin. No scrollbar.
10. Other routes — also 608 px. No overflow.

Resize to 375×812:

11. All routes — full-width content (the `lg:max-w-*` rules don't apply). No regressions.

Stop `bun dev`.

- [ ] **Step 9: QA + commit**

Run QA:

```
Agent(subagent_type: "qa", description: "QA per-page max-width wrappers", prompt: "Pre-commit review of six page.tsx wrapper changes — adding lg:max-w-[704px] (and xl:max-w-[816px] for Pappírar) to cap content widths on desktop. No view-level visuals change. Verify lint and typecheck.")
```

On PASS, commit:

```bash
git add \
  "src/app/[locale]/(app)/page.tsx" \
  "src/app/[locale]/(app)/umonnun/page.tsx" \
  "src/app/[locale]/(app)/folk/page.tsx" \
  "src/app/[locale]/(app)/pappirar/page.tsx" \
  "src/app/[locale]/(app)/timar/page.tsx" \
  "src/app/[locale]/(app)/timar/reglulegir/page.tsx"
git commit -m "$(cat <<'EOF'
ui(shell): cap desktop content column at 608px (Pappírar 720px at xl:)

Each authenticated page wraps its body in lg:max-w-[704px] (608px column +
the 96px gutter from the layout). Pappírar additionally widens to
xl:max-w-[816px] above 1280px, where document/entitlement lists benefit
from extra width. The narrow override at lg: prevents overflow at exactly
1024px (sidebar 248 + gutter 96 + column 720 = 1064 > 1024).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Make the Sheet primitive responsive

On mobile, `Sheet side="bottom"` slides up from the bottom and feels native. On desktop, that same sheet pinned to the bottom of a 1920-px viewport reads as broken — the content is far from the click that triggered it. This task changes the `data-[side=bottom]` variant in `src/components/ui/sheet.tsx` so it becomes a centered modal at `lg:` and up. All call sites continue to use `<Sheet side="bottom">`; nothing else needs to change.

**Files:**

- Modify: `src/components/ui/sheet.tsx:60-67` (the `<SheetPrimitive.Content>` className)

- [ ] **Step 1: Read the existing variant string**

Open `src/components/ui/sheet.tsx` and locate the `<SheetPrimitive.Content>` element (currently lines 60–67). The relevant `cn(...)` is a single very long string. The `side="bottom"` rules in there are:

- `data-[side=bottom]:inset-x-0`
- `data-[side=bottom]:bottom-0`
- `data-[side=bottom]:h-auto`
- `data-[side=bottom]:border-t`
- `data-[side=bottom]:data-open:slide-in-from-bottom-10`
- `data-[side=bottom]:data-closed:slide-out-to-bottom-10`

These need responsive overrides at `lg:` so the sheet becomes a centered modal.

- [ ] **Step 2: Add lg: overrides for `side="bottom"`**

Replace the `<SheetPrimitive.Content>` element (lines 60–67) with the version below. The only change is the appended `lg:data-[side=bottom]:*` classes inside the same `cn(...)` string and an added `lg:rounded-2xl` for visual consistency. No other behavior changes.

```tsx
<SheetPrimitive.Content
	data-slot="sheet-content"
	data-side={side}
	className={cn(
		"fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10 lg:data-[side=bottom]:inset-x-auto lg:data-[side=bottom]:bottom-auto lg:data-[side=bottom]:left-1/2 lg:data-[side=bottom]:top-1/2 lg:data-[side=bottom]:-translate-x-1/2 lg:data-[side=bottom]:-translate-y-1/2 lg:data-[side=bottom]:w-[min(560px,calc(100vw-4rem))] lg:data-[side=bottom]:max-w-lg lg:data-[side=bottom]:max-h-[85vh] lg:data-[side=bottom]:overflow-y-auto lg:data-[side=bottom]:rounded-2xl lg:data-[side=bottom]:border lg:data-[side=bottom]:border-divider-strong lg:data-[side=bottom]:data-open:zoom-in-95 lg:data-[side=bottom]:data-closed:zoom-out-95",
		className,
	)}
	{...props}
>
```

What the new `lg:` classes do:

- `lg:data-[side=bottom]:inset-x-auto` and `lg:data-[side=bottom]:bottom-auto` — clear the mobile bottom-pin positioning.
- `lg:data-[side=bottom]:left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2` — center the sheet in the viewport.
- `lg:data-[side=bottom]:w-[min(560px,calc(100vw-4rem))] max-w-lg` — sheet is 560 px wide on roomy desktop, shrinks on narrow desktop, capped by `max-w-lg`.
- `lg:data-[side=bottom]:max-h-[85vh] overflow-y-auto` — sheet doesn't overflow the viewport vertically; scrolls internally if needed.
- `lg:data-[side=bottom]:rounded-2xl border border-divider-strong` — Bókasafn-consistent rounding and border.
- `lg:data-[side=bottom]:data-open:zoom-in-95 data-closed:zoom-out-95` — modal-style zoom animation on desktop, replacing the mobile slide-from-bottom.

The mobile classes (`data-[side=bottom]:inset-x-0`, etc.) are still there — they apply at all widths, but `lg:` overrides win at and above 1024 px because they appear later in the list (CSS specificity tie → later wins).

- [ ] **Step 3: Typecheck and lint**

Run: `bunx tsc --noEmit && bun run lint`
Expected: both exit 0.

- [ ] **Step 4: Visual smoke — every Sheet call site at desktop**

Run `bun dev`. At viewport 1440×900, verify the centered-modal behavior on each surface that opens a `Sheet`:

1. **AppointmentForm** — go to `/timar`, click the "+" button. Expected: a centered modal of width ~560 px appears with the new-appointment form. Click outside or press Esc — modal closes. The close `XIcon` button is visible top-right of the modal. Animation feels like a zoom-in, not a slide-up.
2. **SeriesForm** — go to `/timar/reglulegir`, click "Nýr reglulegur tími". Same expectations.
3. **EntitlementForm** — go to `/pappirar`, switch to the Réttindi tab, click "Bæta við réttindum" (or whatever the create button label is — see EntitlementList component). Same expectations.
4. **DocumentUpload** — same Pappírar page, Skjöl tab, click the upload button. Same expectations.
5. **ContactForm** — go to `/folk`, click the create-contact button (in ContactList). Same expectations.
6. **Log entry add** — go to `/umonnun`, Dagbók tab, click "Bæta við færslu" (or equivalent). Same expectations.

For each: confirm the modal is centered, has the rounded corners + soft border, content scrolls internally if it overflows, and Esc/backdrop-click dismisses.

Resize to 375×812 and reopen each — confirm they slide up from the bottom as before. No regression.

Stop `bun dev`.

- [ ] **Step 5: QA + commit**

Run QA:

```
Agent(subagent_type: "qa", description: "QA responsive Sheet primitive", prompt: "Pre-commit review of src/components/ui/sheet.tsx — added lg: overrides on the data-[side=bottom] variant so bottom sheets become centered modals at desktop. Mobile behavior unchanged. Verify lint, typecheck, and that the new arbitrary value classes (w-[min(560px,calc(100vw-4rem))], max-h-[85vh]) don't trigger a Biome / Tailwind warning.")
```

On PASS, commit:

```bash
git add src/components/ui/sheet.tsx
git commit -m "$(cat <<'EOF'
ui(sheet): centered modal at lg: for side='bottom' sheets

A bottom-pinned sheet on a 1920px viewport reads as broken — content sits far
from the trigger, with empty space above. At lg:, the side='bottom' variant
becomes a centered modal (~560px wide, max-h-[85vh], rounded + bordered) with
a zoom-in animation. Mobile slide-from-bottom behavior preserved at <lg:.
All call sites continue to use <Sheet side='bottom'>; no call-site changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Verify the login page on desktop

The login page lives outside `(app)/`, so the sidebar/header logic doesn't apply. Today it uses `flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8` which already centers cleanly on any viewport. This task is a verification + a tiny no-op confirmation. If the page already centers fine on desktop, no edit is needed (and no commit either — the next task moves on).

**Files:**

- Verify: `src/app/[locale]/login/page.tsx`

- [ ] **Step 1: Sign out, then verify login at three viewports**

Run `bun dev`. If you're signed in, open the user dropdown (sidebar bottom on desktop, header avatar on mobile) and sign out. The app redirects to `/login`.

At viewport 375×812:

- The "sigga" wordmark and tagline are centered horizontally.
- The "Continue with Google" button is full-width-ish (max-w-sm) and centered.
- No bottom nav, no header — login is its own layout.

At viewport 1024×768:

- Same content, still centered. There's plenty of empty space above and below — that's fine.

At viewport 1920×1080:

- Same. The button stays at max-w-sm (so it doesn't span the entire viewport). The wordmark sits centered.

If all three viewports look correct, **skip to Step 3 — no edits**. If anything is off (button stretching, content sliding to a corner), apply the smallest fix you can and document in Step 2.

Stop `bun dev`.

- [ ] **Step 2 (only if Step 1 surfaced an issue): Apply minimal fix**

If the login page is broken on desktop, the most likely fix is to constrain the outer wrapper. Edit `src/app/[locale]/login/page.tsx` so the outer `<main>` className becomes:

```tsx
<main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8 lg:min-h-dvh">
```

(Adding `lg:min-h-dvh` ensures the page fills the viewport for the centering to work even when the parent layout doesn't enforce a min-height.) Re-test all three viewports.

- [ ] **Step 3: Document the verification in this branch**

If no edit was needed: skip ahead to Task 7. (No commit; the verification is recorded in the PR description in Task 7.)

If an edit *was* needed, run QA:

```
Agent(subagent_type: "qa", description: "QA login page desktop fix", prompt: "Pre-commit review of src/app/[locale]/login/page.tsx — minimal class addition to keep desktop centering working. Verify lint, typecheck, no regression.")
```

On PASS:

```bash
git add "src/app/[locale]/login/page.tsx"
git commit -m "$(cat <<'EOF'
ui(login): keep login centered at desktop viewports

Adds lg:min-h-dvh so the existing flex-centering behaves correctly when the
page is rendered without the (app) shell on a wide viewport.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Manual smoke verification at three viewports + push branch + open PR

Final verification gate (per the design doc), then push the branch and open a PR for review.

**Files:**

- No code changes in this task.

- [ ] **Step 1: Run the three-viewport smoke**

Run `bun dev`. Sign in.

For each viewport below, walk every authenticated route and `login`. Note anything off.

**Viewport 375×812 — mobile baseline (should be unchanged):**

- `/` (Í dag) — bottom nav visible, sticky header visible. Greeting renders. AttentionCard, DrivingCta, NextAppointments, RecentLog (with inline expand) all render in the original single column.
- `/umonnun` — Dagbók and Lyf tabs visible, switching works. Add/edit log entry sheet slides up from the bottom.
- `/folk` — EmergencyTiles render, ContactList scrolls, tap a tile dials (or attempts to).
- `/pappirar` — Réttindi and Skjöl tabs work. Open a form sheet — slides up.
- `/timar` — Reglulegir tímar entry-point row above the tabs. "+" sheet slides up.
- `/timar/reglulegir` — series cards render. "Nýr reglulegur tími" sheet slides up.
- Sign out, then `/login` — centered, button visible.

**Viewport 1024×768 — the `lg:` boundary:**

- Sidebar visible on the left, 248 px wide. Bottom nav and mobile header gone.
- Each authenticated route — content column is 608 px wide (verify with DevTools), left-aligned with the sidebar edge. Right margin is ~72 px. No horizontal scrollbar.
- `/pappirar` specifically — column is 608 px (the `xl:` widening is NOT active yet).
- Open a sheet on any view — it appears as a centered modal, not a bottom slide-up. Esc and backdrop-click dismiss.
- `/login` — still centered.

**Viewport 1920×1080 — large desktop:**

- Sidebar still 248 px on the left; large empty cream area on the right.
- Each authenticated route — column still 608 px (massive empty cream to the right). NextAppointments cards, log entries, contacts, etc. all fit comfortably.
- `/pappirar` specifically — column is now 720 px (`xl:` widening at 1280 px has triggered). Document filename + meta should fit on one line.
- Open a sheet — centered modal, ~560 px wide.
- `/login` — wordmark centered, button stays at max-w-sm (does not span the entire viewport).

Stop `bun dev`.

- [ ] **Step 2: Push branch to origin**

```bash
git push -u origin claude/desktop-support
```

Expected: branch pushed; URL of the new push surfaced in CLI output.

- [ ] **Step 3: Open a PR**

Use `gh pr create` with the body below. Replace the smoke-test results placeholders with actual observations from Step 1 (good/bad/anything weird).

```bash
gh pr create --title "Desktop support — Sidebar shell at lg:, content cap, modal sheets" --body "$(cat <<'EOF'
## Summary

- Adds desktop support behind a single `lg:` (1024px) responsive breakpoint.
- New `Sidebar` component (248px fixed left) replaces the mobile `BottomNav` and `Header` at `lg:`.
- Content column is capped at 608px across all routes; Pappírar widens to 720px at `xl:` (≥1280px) where document lists benefit from the extra width.
- `Sheet side='bottom'` becomes a centered modal at `lg:` (~560px wide, zoom animation), preserving slide-from-bottom on mobile.
- Mobile shell, view bodies, cards, forms, density, typography, and tap targets are all unchanged.

## Why this approach

UX research (`UX Researcher` agent, 2026-04-18) recommended treating desktop as the mobile app rendered on a bigger screen with a sidebar replacing the bottom nav, the extra horizontal space left as intentional margin. No multi-pane, no dashboard cards, no shrinking. The Bókasafn aesthetic survives at scale by *not* filling the space.

Full design + research record: `docs/superpowers/specs/2026-04-18-desktop-support-design.md`
Implementation plan: `docs/superpowers/plans/2026-04-18-desktop-support.md`

## Test plan

Manual smoke at three viewports (Phase 16 e2e is out of scope; Vitest/Playwright not yet installed in this repo).

- [ ] 375×812 — mobile baseline, no regressions across `/`, `/umonnun`, `/folk`, `/pappirar`, `/timar`, `/timar/reglulegir`, `/login`. Bottom sheets slide from the bottom.
- [ ] 1024×768 — sidebar appears, mobile chrome gone, every route uses 608px column with no horizontal overflow. Pappírar still 608px (the `xl:` widening must NOT trigger at 1024). Sheets are centered modals.
- [ ] 1920×1080 — sidebar 248px on left, vast empty cream on right. Pappírar is 720px (the `xl:` widening triggered at 1280). All other routes still 608px.

### Smoke notes from local verification

- 375×812: <fill in>
- 1024×768: <fill in>
- 1920×1080: <fill in>
- Login at desktop: <fill in>

## Out of scope

- Vitest/Playwright setup (Phase 16).
- Keyboard shortcuts.
- Dark mode.
- Sidebar collapse/expand.
- Any view-level redesign.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The PR URL is the deliverable.

---

## Self-review checklist (run after writing the plan)

Already executed during plan authoring. Findings:

**Spec coverage:** Every section of `docs/superpowers/specs/2026-04-18-desktop-support-design.md` maps to a task:

- Layout architecture (breakpoint, mobile/desktop shells) → Tasks 1, 3.
- Sidebar component (visual rules, contents, dropdown) → Task 2.
- BottomNav and Header `lg:hidden` → Task 1.
- Per-view widths (608px, 720px Pappírar at `xl:`) → Task 4.
- Sheet responsive variant → Task 5.
- Login page verification → Task 6.
- Aesthetic preservation rules — encoded as the executor's hard constraints in the header.
- Real-time, i18n — explicitly no-changes; called out in the plan header and file structure.
- Manual browser verification at three viewports → Task 7.
- "Files to add / change" → matches the plan's File Structure table 1:1.
- "Explicitly NOT building" → encoded in the Out-of-scope section of the PR template.

**Placeholder scan:** No "TBD", "TODO", "implement later". Every code block contains the actual code to write or replace. Task 6 has a conditional ("if the login page is broken, apply this fix") — that's a bounded contingency with full code, not a placeholder.

**Type/identifier consistency:** Sidebar uses the same `IconKind`, `NavItem`, `ITEMS`, and `isActive` shape as `BottomNav`. Same `BookIcon` `kind` values. Same `nav` translation keys. Same `useQuery(api.users.me)` hook. No divergence.

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-04-18-desktop-support.md`.

User pre-authorized full implementation (option 1c) and is unavailable for execution-mode choice. **Proceeding with subagent-driven-development** (the recommended option) to maximize per-task review discipline and keep the parent context lean across the seven tasks.
