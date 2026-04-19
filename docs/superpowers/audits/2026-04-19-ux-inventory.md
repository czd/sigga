# UX Inventory Matrix — 2026-04-19

> Phase A deliverable for the site-wide UX alignment initiative. See docs/superpowers/plans/2026-04-19-ux-alignment.md for the full workflow. Phase B turns this matrix into docs/ux-patterns.md.

## Method

Read every authenticated route under `src/app/[locale]/(app)/**`, their client `*View.tsx` components, every component under `src/components/{appointments,dashboard,info,log,nav,recurringSeries,shared,timar,layout,ui}/`, `messages/is.json`, `docs/spec.md`, and `CLAUDE.md`. Cells cite `file:line` for the dominant pattern on each surface; when two behaviours coexist on one surface (e.g. mobile vs `xl:` desktop) both are named. I audited from code only — no live app — so I noted behaviour that is data-dependent (empty states, cancelled-future-slot rendering, virtual occurrences, BRÝNT pill) in "Surfaces not visited" below. Pattern #18 (accessibility) is owned in parallel by the Accessibility Auditor at `docs/superpowers/audits/2026-04-19-a11y-audit.md`; this matrix flags `aria-label` mismatches and tap-target violations where they intersect other patterns but leaves the WCAG-focused analysis to them.

## Matrix

### Pattern 1 — Edit affordance

| Surface | How it works today | File pointer |
| --- | --- | --- |
| Dashboard — RecentLog preview | No edit affordance on the card itself. "Skrifa í dagbók" button under the quote opens `LogEntryForm` in create-mode only; editing requires navigating to Umönnun/Dagbók. | `src/components/dashboard/RecentLog.tsx:111-118` |
| Umönnun / Dagbók — list row | Pencil `touch-icon` button on the right of the row, visible only if `me?._id === entry.author?._id`, opens `LogEntryForm` with `editEntry`. No card-tap, no kebab. | `src/components/log/LogFeed.tsx:108-124` |
| Umönnun / Dagbók — desktop reader pane | Same pencil `touch-icon`, author-gated, opens the same sheet. | `src/components/log/LogEntryReader.tsx:73-82` |
| Umönnun / Lyf — medication row | Entire row is a `<button>` — tap anywhere opens `MedicationForm` in edit mode. No pencil, no kebab. | `src/components/info/MedicationTable.tsx:50-74` |
| Tímar — upcoming/past card (mobile) | Pencil `touch-icon` button pinned top-right of the card. `onClick={onEdit}` opens `AppointmentForm` in edit mode. The card body itself is not tappable. | `src/components/appointments/AppointmentCard.tsx:72-81` |
| Tímar — month/week pill (desktop) | Tapping a pill selects it and opens `TimarDetail` in the right-hand pane. From the detail pane a ghost "Breyta" button (pencil + label) opens the edit sheet. Two-step (select → edit). | `src/components/timar/CalendarView.tsx:103-117`; `src/components/timar/TimarDetail.tsx:161-169` |
| Tímar / Reglulegir — series card | Dedicated `variant="ghost" size="touch"` "Breyta" text button in the footer action row alongside the Virkt/Í hléi switch and "Eyða". No pencil, no card-tap. | `src/components/recurringSeries/SeriesCard.tsx:113-121` |
| Fólk — contact row (mobile/tablet) | Row expands inline on tap. An "Breyta" outline button with pencil icon appears inside the expanded block. Three distinct click targets in one row (expand button + tel tile + edit button). | `src/components/info/ContactList.tsx:99-135,167-175` |
| Fólk — contact detail pane (xl:) | Single `variant="outline" size="touch"` "Breyta" button with pencil icon in the detail body. Tap-on-row select → edit from detail. | `src/components/info/ContactDetail.tsx:79-88` |
| Gögn / Réttindi — mobile card | Whole card is an absolute-positioned transparent `<button>` overlay (`absolute inset-0`) that opens the edit sheet. No pencil. The "+ Enginn eigandi · tek þetta" button uses `e.stopPropagation()` to avoid triggering the edit. | `src/components/info/EntitlementList.tsx:106-111` |
| Gögn / Réttindi — desktop kanban card | Whole card is a draggable `<button>` — `onClick` opens edit, drag triggers column change. No pencil. | `src/components/info/EntitlementKanban.tsx:73-87` |
| Gögn / Skjöl — document row | Entire row is a `<button>` that opens a detail Sheet (mobile) or selects the detail pane (desktop). Deletion lives in the detail; the list row never exposes edit/delete directly. There is no "edit metadata" affordance at all — the form only appears during upload. | `src/components/info/DocumentList.tsx:107-142,177-291` |
| Gögn / Skjöl — desktop detail pane | Only Download and Delete buttons — no Edit/metadata-edit path exists anywhere. | `src/components/info/DocumentDetail.tsx:132-150` |

**Summary of the split:** Six distinct patterns are in production simultaneously — (a) tap-whole-row-to-edit (Lyf, Skjöl, Réttindi mobile, Réttindi kanban), (b) pencil `touch-icon` in corner (Dagbók feed, Dagbók reader, Tímar mobile card), (c) ghost text "Breyta" button in footer action row (Reglulegir series card), (d) select-then-edit-in-detail-pane (Tímar desktop, Fólk desktop), (e) tap-to-expand-then-outline-button (Fólk mobile), and (f) no edit at all (Skjöl metadata, Dashboard RecentLog). A user migrating from Messenger cannot learn one rule.

**Candidate canonical answer (for Phase B's consideration, not a decision):** Pick either (a) "tap card = edit" or (b) "pencil icon = edit" and apply it everywhere. Given the 60+ audience's Messenger mental model — tapping a message reveals options — pattern (a) is more discoverable. But pattern (b) is more forgiving for accidentally scrolled taps. The current split cannot stay.

### Pattern 2 — Destroy affordance

| Surface | How it works today | File pointer |
| --- | --- | --- |
| Dagbók entry | No delete. Only edit. (Per spec: append-only, editable.) | `src/components/log/LogEntryForm.tsx` (no `remove` call) |
| Lyf (medication) | No delete; inactive toggle in edit form only. Destroy is effectively "untick Virkt". | `src/components/info/MedicationForm.tsx:229-239` |
| Tímar — one-off appointment | In edit sheet, a `variant="destructive" size="touch"` button labelled "Eyða" opens a `<Dialog>` with `deleteConfirm` copy ("Ertu viss? Þetta er ekki hægt að afturkalla."). Dialog footer uses `flex-col` stack with destructive button first, cancel second. | `src/components/appointments/AppointmentForm.tsx:292-338` |
| Tímar — series-bound appointment | Same button, label swaps to "Hlaupa yfir" and dialog title to "Hlaupa yfir þennan tíma" with body `skipConfirm`. Sets `status: "cancelled"` instead of `remove`. Distinct verb + distinct confirm text. | `src/components/appointments/AppointmentForm.tsx:162,312-317` |
| Tímar — desktop detail pane | `variant="ghost" size="touch"` with `className="text-destructive"` and `Trash2` icon, label "Hætta við þennan tíma". NO confirm dialog — direct call to `update({status:"cancelled"})`. Skips the protection the mobile edit sheet has. | `src/components/timar/TimarDetail.tsx:170-181` |
| Tímar / Reglulegir series | `variant="ghost" size="touch"` with `className="text-destructive"` labelled just "Eyða" (no icon). Dialog has title `"Eyða {title}?"` and body "Eldri tímar verða áfram sýnilegir í Liðnir tímar.". Confirm label literal "Eyða" from `recurring.deleteConfirm.confirm`. | `src/components/recurringSeries/SeriesCard.tsx:122-132,141-170` |
| Fólk — contact | `variant="destructive" size="touch"` button in edit sheet with `Trash2` icon, label "Eyða". Dialog with `deleteConfirm` copy. Flex-col footer, destructive-first. | `src/components/info/ContactForm.tsx:298-342` |
| Gögn / Réttindi | Same `variant="destructive" size="touch"` with `Trash2`. Dialog with `deleteConfirm` copy. Flex-col footer, destructive-first. | `src/components/info/EntitlementForm.tsx:331-374` |
| Gögn / Skjöl — list-opened detail sheet | `variant="destructive" size="touch"` with `Trash2`, label "Eyða". Confirm dialog with stronger copy: "Ertu viss? Skjalið eyðist varanlega — þetta er ekki hægt að afturkalla." Flex-col footer. | `src/components/info/DocumentList.tsx:278-286,447-479` |
| Gögn / Skjöl — desktop detail pane | `variant="ghost" size="touch"` with `className="text-destructive"` and `Trash2`. Same dialog copy. Different button variant from the mobile sheet version of the same detail. | `src/components/info/DocumentDetail.tsx:141-149` |

**Summary of the split:** Three distinct button patterns — (a) solid `variant="destructive"` tinted button, (b) ghost button with `text-destructive` class, (c) ghost + `text-destructive` **without any confirm dialog** (Tímar desktop "Hætta við þennan tíma"). Confirm copy varies across three wordings: `deleteConfirm` common ("Ertu viss? Þetta er ekki hægt að afturkalla."), `documents.deleteConfirm` (adds "Skjalið eyðist varanlega"), and the series-specific body mentioning history preservation. Dialog footer is `flex-col` everywhere (destructive first, cancel second) — that's the one consistent choice.

**Candidate canonical answer:** Every destroy must funnel through `variant="destructive"` + confirm dialog. The Tímar desktop "Hætta við þennan tíma" bypass is the single most worrying finding of this audit — a 60+ user can accidentally cancel a real doctor appointment with one tap and no undo. Copy should be unified to one of two templates: "standard destroy" (Ertu viss?…) and "destroy with context" (subject-specific body).

### Pattern 3 — Create/new affordance

| Surface | How it works today | File pointer |
| --- | --- | --- |
| Dashboard | No global "new" — creation is contextual via RecentLog's "Skrifa í dagbók…" oval button and the DrivingCta's "Ég get skutlað" primary button. | `src/components/dashboard/RecentLog.tsx:111-118`; `src/components/dashboard/DrivingCta.tsx:67-74` |
| Umönnun / Dagbók mobile | Full-width `Button size="touch"` labelled "Skrifa" with `Pencil` icon at top of tab content. | `src/app/[locale]/(app)/umonnun/UmonnunView.tsx:49-58` |
| Umönnun / Dagbók desktop | `LogComposer` inline textarea + "Senda" button — a completely different affordance (compose-in-place vs open-sheet). | `src/components/log/LogComposer.tsx:66-91` |
| Umönnun / Lyf | Create lives in two places: `EmptyState` action prop (when 0 active meds) and an outline "Bæta við" button with `Plus` icon below the list. | `src/components/info/MedicationTable.tsx:112-120,134-142` |
| Tímar mobile | Full-width `Button size="touch"` labelled "Nýr tími" with `Plus` icon, right under SeriesEntryRow. | `src/app/[locale]/(app)/timar/TimarView.tsx:29-36` |
| Tímar desktop | `Button size="sm"` (NOT `size="touch"` — ~32 px tall) labelled "Nýr tími" with `Plus` in the toolbar's right-side cluster. Below the project 48 px floor. | `src/components/timar/CalendarView.tsx:143-146` |
| Tímar / Reglulegir | Full-width `Button size="touch"` labelled "Nýr reglulegur tími" with `Plus`, anchored below the list. | `src/components/recurringSeries/SeriesList.tsx:45-54` |
| Fólk | Small round `+` button (`size-10` = 40 px) inline with the filter chips. Icon only, `aria-label={t("add")}`. The smallest and least visible "add" in the app. | `src/components/info/ContactList.tsx:265-272` |
| Gögn / Réttindi mobile | Two places: `EmptyState` action when empty, AND a `variant="outline" size="touch"` "Bæta við" button with `Plus` at the bottom of the list. | `src/components/info/EntitlementList.tsx:397-403,463-472` |
| Gögn / Réttindi kanban | Per-column 24 px `+` icon-only button ("size-6") in the column header. Four tiny buttons instead of one. | `src/components/info/EntitlementKanban.tsx:150-158` |
| Gögn / Skjöl | Dashed-border "Bæta við skjali" block with `Upload` icon (`min-h-14`) as a full-width call-to-action panel. Different visual treatment from every other "add" button. | `src/components/info/DocumentList.tsx:394-401` |

**Summary of the split:** Five different create affordances — (1) full-width touch button with Plus (Tímar mobile, Reglulegir, Dagbók mobile), (2) outline touch button at list bottom (Lyf, Réttindi mobile), (3) inline compose-in-place (Dagbók desktop), (4) small icon-only `+` (Fólk `size-10`, Kanban `size-6`), (5) dashed-border full-width CTA panel (Skjöl). Tímar desktop's toolbar `size="sm"` variant is a 6th. No position convention — top of view, bottom of list, toolbar, column header, inline with filters.

**Candidate canonical answer:** Full-width touch button at a predictable position (top-of-content or anchored above the tab nav) — the Tímar-mobile / Reglulegir pattern. Kanban per-column adds can stay, but should use a larger target. The Fólk `size-10` and Tímar desktop `size-sm` buttons violate the 48 px floor.

### Pattern 4 — Form container (sheet vs dialog, CTA placement)

| Surface | How it works today | File pointer |
| --- | --- | --- |
| LogEntryForm | Bottom `Sheet`, `max-h-[92vh]`, `rounded-t-2xl`, `showCloseButton={false}`. Bottom-footer CTAs: Cancel outline (flex-1) + Save primary (flex-1), side-by-side. Destructive button (none — no delete). | `src/components/log/LogEntryForm.tsx:107-200` |
| AppointmentForm | Bottom `Sheet` `max-h-[95vh]`, `rounded-t-2xl`, `showCloseButton={false}`. Bottom-footer: Cancel outline + Save primary (flex-1 each). Destructive button is separate `self-start` at the bottom outside the save/cancel row. | `src/components/appointments/AppointmentForm.tsx:166-306` |
| MedicationForm | Same bottom sheet pattern. Cancel+Save footer. No destructive (medications have no delete). "Virkt" checkbox is inline in the form body. | `src/components/info/MedicationForm.tsx:122-267` |
| ContactForm | Same bottom sheet. Cancel+Save footer. Destructive "Eyða" button `self-start` below the footer. | `src/components/info/ContactForm.tsx:149-313` |
| EntitlementForm | Same bottom sheet. Cancel+Save. Destructive `self-start` below footer. Adds a Select for `owner` and `status` which is the most complex form in the app. | `src/components/info/EntitlementForm.tsx:153-345` |
| SeriesForm | Same bottom sheet. Cancel+Save footer. NO destructive in the form (delete lives on the SeriesCard). Adds `DayPicker` chip grid. | `src/components/recurringSeries/SeriesForm.tsx:126-259` |
| DocumentUpload | Same bottom sheet. Cancel + "Hlaða upp" (not "Vista"!). `showCloseButton={false}`. Shows a `secondary` "Velja skjal" button inline with file-name text. | `src/components/info/DocumentUpload.tsx:122-257` |
| Document detail (mobile, `DocumentList` internal) | Bottom `Sheet`, `max-h-[85vh]`, `showCloseButton={true}` (the only form-ish sheet with the X button shown). Used as read/delete, not edit. | `src/components/info/DocumentList.tsx:200-289` |
| Delete-confirm dialogs (all) | `<Dialog>`, `DialogContent className="max-w-sm"`, `showCloseButton={false}`, `DialogFooter className="flex-col gap-2 sm:flex-col"` — destructive button first then cancel. | e.g. `src/components/info/EntitlementForm.tsx:348-374` |
| Claim-confirm dialog | Same dialog pattern but with `size="touch"` default-variant "Já, ég tek þetta" as primary, cancel below. | `src/components/info/EntitlementList.tsx:485-527` |
| shadcn dialog/sheet primitives | Hardcoded English `<span className="sr-only">Close</span>` and `<Button variant="outline">Close</Button>`. | `src/components/ui/dialog.tsx:77,116`; `src/components/ui/sheet.tsx:78` |

**Summary of the split:** Sheet shape is remarkably consistent — bottom, 85–95 % max-height, rounded-top, `showCloseButton={false}`. CTA placement is consistent too: Cancel-outline + Save-primary paired at the footer with `flex-1` each. **But** destructive buttons are inconsistently placed (some inside the form below the footer as `self-start`, none in SeriesForm), and the "Upload" button uses the verb "Hlaða upp" instead of the common `tCommon("save")` "Vista". Dialog footer is universally `flex-col` stacked, destructive-first. The biggest finding is the **hardcoded English "Close"** in the shadcn primitives — screen readers announce "Close" (English) even in Icelandic mode.

**Candidate canonical answer:** Sheet-from-bottom is the form primitive; Dialog is the confirm primitive. Document this pair explicitly. Move the destructive button into the form footer alongside Save/Cancel (three-button row) OR standardise on `self-start` below it — pick one. Replace the primitive's sr-only "Close" with `tCommon("close")` (key already exists in `is.json:21`).

### Pattern 5 — Empty state

| Surface | Component / Copy | File pointer |
| --- | --- | --- |
| Dashboard — NextAppointments | Plain `<p className="text-ink-faint py-2">` with key `dashboard.nextAppointments.empty` ("Engir tímar á næstunni"). No icon, no CTA. | `src/components/dashboard/NextAppointments.tsx:154-155` |
| Dashboard — RecentLog | Plain `<p>` with `dashboard.recentLog.empty` ("Engar færslur í dagbók ennþá"). No icon. | `src/components/dashboard/RecentLog.tsx:107` |
| Dashboard — SinceLastVisit | Plain `<p>` with `dashboard.sinceLastVisit.empty` ("Ekkert nýtt frá síðustu heimsókn.") — note the period; most empties have none. | `src/components/dashboard/SinceLastVisit.tsx:76` |
| Umönnun / Dagbók | `EmptyState` with `BookOpen` icon, title "Engar færslur í dagbók ennþá", description "Byrjaðu á að skrifa fyrstu færsluna." No action button. | `src/components/log/LogFeed.tsx:68-76` |
| Umönnun / Lyf | `EmptyState` with `Pill` icon, title "Engin lyf skráð", `action={<Button size="touch">…Bæta við…</Button>}`. Has CTA. | `src/components/info/MedicationTable.tsx:110-120` |
| Tímar list | `EmptyState` with `CalendarClock` icon, title "Engir tímar á næstunni" / "Engir liðnir tímar". No description, no action. | `src/components/appointments/AppointmentList.tsx:70-74` |
| Tímar / Reglulegir | `EmptyState` with `CalendarRange` icon, title "Engir reglulegir tímar", description "Reglulegir tímar sem endurtaka sig — t.d. Virkni og Vellíðan — birtast hér." No action. | `src/components/recurringSeries/SeriesList.tsx:29-34` |
| Fólk — contact list | `EmptyState` with `Users` icon, title "Engir tengiliðir skráðir" (default) or "Engir tengiliðir finnast." (search active). No description, no action. | `src/components/info/ContactList.tsx:279-283` |
| Gögn / Réttindi | `EmptyState` with `FileText` icon, title "Engin réttindi skráð", `action={<Button>…Bæta við…</Button>}`. Has CTA. | `src/components/info/EntitlementList.tsx:394-403` |
| Gögn / Réttindi — filter empty | Plain `<div className="rounded-2xl border border-dashed…">` with `emptyFilter` ("Ekkert í þessum flokki."). Not `EmptyState`. | `src/components/info/EntitlementList.tsx:420-423` |
| Gögn / Skjöl | `EmptyState` with `FileText` icon, title "Engin skjöl skráð", description "Hladdu upp lyfseðlum, bréfum eða vottorðum til að hafa allt á einum stað.", `action=<Button>…Hlaða upp…</Button>`. Only empty state with a full trio (icon+desc+action). | `src/components/info/DocumentList.tsx:353-364` |
| Skjöl pane empty (desktop) | Plain `<p className="text-ink-faint text-base italic">` with `pappirar.skjolEmptyPane` ("Veldu skjal til að skoða."). | `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx:151-152` |
| Fólk pane empty (desktop) | Plain `<p className="text-ink-faint text-base italic">` with `folk.selectHint` ("Veldu manneskju til að skoða."). | `src/app/[locale]/(app)/folk/FolkView.tsx:56-59` |
| Week grid empty | Plain `<p className="text-ink-faint text-center py-6">` with `timar.weekGrid.noAppointments` ("Engir tímar þessa viku."). | `src/components/timar/WeekGrid.tsx:295-299` |
| `EmptyState` primitive | Dashed border, `bg-muted/40`, text-center, icon above title above description above action. `text-lg font-medium` title; `text-base text-muted-foreground` description. | `src/components/shared/EmptyState.tsx:10-29` |

**Summary of the split:** Three tiers in use — (1) warm `EmptyState` component with icon + description + action (Lyf, Réttindi, Skjöl), (2) `EmptyState` without action or description (Dagbók, Tímar, Reglulegir, Fólk), (3) a plain `<p>` with `text-ink-faint` (Dashboard cards, pane hints, week grid). Copy tone is uniformly warm and Icelandic — that's a win — but punctuation is inconsistent (sentence-final period present in `sinceLastVisit.empty`, `pappirar.headlines.*`, `recurring.empty.body`, missing in most others). `EmptyState` uses `bg-muted/40` + dashed border which is brand-inconsistent with the Bókasafn paper/ring-1 convention used everywhere else.

**Candidate canonical answer:** Use `EmptyState` for every "list is empty" condition with a mandatory trio: icon + warm short title + action button (even for Dagbók, where "Skrifa færslu" is the action). Separate "list filtered to empty" and "detail pane deselected" into a third style — a plain italic ink-faint line is OK there. Re-theme `EmptyState` to the Bókasafn aesthetic (bg-paper + ring-1 instead of bg-muted dashed).

### Pattern 6 — Headline style

| Surface | Class / Copy | File pointer |
| --- | --- | --- |
| Dashboard greeting | `font-serif text-[2.5rem] leading-[1.08] tracking-tight text-balance text-foreground` — "Góðan daginn, *Elin*." | `src/app/[locale]/(app)/page.tsx:77-86` |
| Dashboard — attention column (xl:) | `font-serif text-[1.4rem] text-ink font-normal tracking-tight` — "Þarf athygli" | `src/app/[locale]/(app)/page.tsx:115-119` |
| Dashboard — NextAppointments title | `font-serif text-[1.4rem] text-ink font-normal tracking-tight` — "Næstu tímar" | `src/components/dashboard/NextAppointments.tsx:138-143` |
| Dashboard — SinceLastVisit title | Same — `font-serif text-[1.4rem] text-ink font-normal tracking-tight` — "Síðan síðast" | `src/components/dashboard/SinceLastVisit.tsx:66-71` |
| Dashboard — WeekStrip | Tiny uppercase `text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint` — "Vika {week} · {dateRange}". Not serif. | `src/components/dashboard/WeekStrip.tsx:87-91` |
| Umönnun | `font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance` — "Hvernig Siggu líður." (warm sentence with period) | `src/app/[locale]/(app)/umonnun/UmonnunView.tsx:29` |
| Umönnun Lyf section | `font-serif text-[1.6rem] font-normal tracking-tight text-ink` — "Lyf" (one-word noun) | `src/components/info/MedicationTable.tsx:96-98` |
| Tímar mobile | `text-3xl font-semibold` (no `font-serif`!) — "Tímar" | `src/app/[locale]/(app)/timar/TimarView.tsx:27` |
| Tímar / Reglulegir | `font-serif text-3xl font-normal tracking-tight text-ink` — "Reglulegir tímar" | `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx:20-22` |
| Tímar desktop (calendar nav label) | `font-serif text-lg text-ink min-w-48 text-center capitalize` — month/week label only; no page heading. | `src/components/timar/CalendarView.tsx:114-118` |
| Fólk | `font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance` — "Sími, læknar, þjónusta." (warm sentence with period) | `src/app/[locale]/(app)/folk/FolkView.tsx:39-41` |
| Gögn / Pappírar | `font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance` — "Réttindi í vinnslu." / "Allt í höfn." / "Engin réttindi enn." (dynamic, with last word italicised via `renderHeadline`). | `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx:90-92,163-174` |
| Login | `text-3xl font-semibold` (no serif) — "Sigga" | `src/app/[locale]/login/page.tsx:34` |
| Error | `font-serif text-3xl font-normal` — "Eitthvað fór úrskeiðis" | `src/app/[locale]/(app)/error.tsx:36` |
| Nytjun (admin) | `font-serif text-[2rem] leading-tight font-normal` — "Notkun" | `src/app/[locale]/(app)/nytjun/page.tsx:44,57` |
| Sheet titles | `font-serif text-xl` (Reglulegir) vs `text-xl font-semibold` (every other form). Inconsistent use of serif. | `src/components/recurringSeries/SeriesForm.tsx:137-139` vs `src/components/log/LogEntryForm.tsx:119-121` |
| Detail panes (Contact, Document, Appointment) | `font-serif text-[1.75rem]` (Contact) / `text-[1.6rem]` (Document, Appointment detail) — three different rem values for the same role. | `src/components/info/ContactDetail.tsx:44`; `src/components/info/DocumentDetail.tsx:74`; `src/components/timar/TimarDetail.tsx:119` |

**Summary of the split:** Main headline sizes use 5 different rem values (`2.5`, `2.25`, `2`, `1.75`, `1.6`, `1.4`). Tímar mobile is the one and only page heading that is NOT serif (`text-3xl font-semibold`) — a clear inconsistency with every other top-level page. Umönnun, Fólk, Gögn all use the same warm-sentence-with-period pattern ("Hvernig Siggu líður." / "Sími, læknar, þjónusta." / "Réttindi í vinnslu.") — but Tímar and Reglulegir use dry noun headings ("Tímar" / "Reglulegir tímar"). Dashboard greeting uses a fresh `2.5rem` size used nowhere else.

**Candidate canonical answer:** Codify a 3-tier type scale — `text-[2.25rem]` for top-page headline (Umönnun / Fólk / Gögn are the template), `text-[1.6rem]` for section/detail titles, `text-[1.4rem]` for dashboard cards. Serif throughout. Mandate the warm-sentence-with-period pattern for page headlines; retire the dry noun headings at Tímar and Reglulegir.

### Pattern 7 — Tap targets

| Surface / Element | Measured height | File pointer |
| --- | --- | --- |
| `size="touch"` button | `h-14` (56 px) | `src/components/ui/button.tsx:35-36` |
| `size="touch-icon"` | `size-14` (56 px) | `src/components/ui/button.tsx:37` |
| `size="sm"` button | `h-7` (28 px) | `src/components/ui/button.tsx:27` |
| `size="icon-sm"` | `size-7` (28 px) | `src/components/ui/button.tsx:32-33` |
| Tímar desktop "Nýr tími" | `size="sm"` ≈ 28 px — **violation** (below 48 px floor) | `src/components/timar/CalendarView.tsx:143` |
| Tímar desktop view-toggle tabs | `min-h-9` (36 px) — **violation** | `src/components/timar/CalendarView.tsx:237-249` |
| Tímar desktop "Today" pill | `size="sm"` ≈ 28 px — **violation** | `src/components/timar/CalendarView.tsx:131-137` |
| Tímar desktop close-detail X | `size="touch-icon"` (56 px) — OK | `src/components/timar/CalendarView.tsx:187-195` |
| Fólk filter chips | `h-10` (40 px) — **violation** (CLAUDE.md tightened chips to 48 px) | `src/components/info/ContactList.tsx:255` |
| Fólk "+" add button | `size-10` (40 px) — **violation** | `src/components/info/ContactList.tsx:265-272` |
| Fólk tel tile in row | `size-11` (44 px) — **violation** of 48 px | `src/components/info/ContactList.tsx:124-131` |
| Fólk name-initial avatar (expand trigger region) | `size-11` (44 px) inside a larger `<button>` with `py-3` padding — whole hit target is ~64 px, OK | `src/components/info/ContactList.tsx:107-112` |
| Réttindi claim CTA | `min-h-12` (48 px) — **exactly on the floor, not preferred 56 px** | `src/components/info/EntitlementList.tsx:161` |
| Réttindi filter chips | `min-h-12` (48 px) — same, on the floor | `src/components/info/EntitlementList.tsx:293` |
| Kanban per-column `+` | `size-6` (24 px) — **severe violation** | `src/components/info/EntitlementKanban.tsx:154-158` |
| DocumentList sort tabs | `min-h-12` (48 px) — OK | `src/components/info/DocumentList.tsx:382` |
| Document dashed upload CTA | `min-h-14` (56 px) — OK | `src/components/info/DocumentList.tsx:397` |
| AppointmentList tabs (mobile) | `min-h-12` (48 px) — OK | `src/components/appointments/AppointmentList.tsx:53` |
| Pappírar tab triggers | `min-h-12` (48 px) — OK | `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx:110` |
| Umönnun Tabs shadcn | `h-full` inside `h-12` TabsList — OK (48 px) | `src/app/[locale]/(app)/umonnun/UmonnunView.tsx:35-44` |
| SeriesEntryRow row | `min-h-14` (56 px) — OK | `src/components/timar/SeriesEntryRow.tsx:28` |
| DayPicker chips | `h-12` (48 px) — OK | `src/components/recurringSeries/DayPicker.tsx:40` |
| RecentLog "Skrifa í dagbók…" button | `py-4` (~57 px including `px-5`) — OK but not using `size="touch"` | `src/components/dashboard/RecentLog.tsx:111-118` |
| Sidebar nav items (desktop) | `min-h-12` (48 px) — OK | `src/components/nav/Sidebar.tsx:88-89` |
| BottomNav items | `min-h-16` (64 px) — OK | `src/components/nav/BottomNav.tsx:71` |
| SidebarWeekCalendar day chips | `h-10` (40 px) — **violation** (desktop-only; CLAUDE.md is mobile-first but 48 px floor applies broadly) | `src/components/nav/SidebarWeekCalendar.tsx:88` |
| AttentionCard "Ég tek…" + "Seinna" | `py-2.5` with no height class → ~36 px — **violation** (uses custom `<Link>` styling, not Button) | `src/components/dashboard/AttentionCard.tsx:47-60` |

**Summary of the split:** Six concrete violations of the 48 px floor and five more at exactly 48 px (below the 56 px `size="touch"` preference). The Tímar desktop toolbar has three `size="sm"` buttons in a row — all ≤ 36 px. The kanban `+` is 24 px. The AttentionCard CTAs (one of the most prominent buttons on the dashboard) are ~36 px. Entitlement claim and filter chips sit at 48 px (on the floor, not preferred). Mobile-first surfaces are mostly compliant; desktop surfaces are where the shortfalls concentrate.

**Candidate canonical answer:** Promote the `size="touch"` default to a hard rule for any surface a user taps at least weekly — including desktop. Eliminate `size="sm"` outside of truly tertiary controls. Replace the `<Link>` CTAs in AttentionCard with `<Button asChild size="touch">` so the shared size contract applies.

### Pattern 8 — List-detail responsive behaviour

| Surface | <768 px | md: 768–1279 | xl: ≥1280 | File pointer |
| --- | --- | --- | --- | --- |
| Dashboard | Single column stack | Same (centred `xl:max-w-[1400px]`) | Command Post: `WeekStrip` full-width above 2-col `SinceLastVisit` + attention aside | `src/app/[locale]/(app)/page.tsx:90-134` |
| Umönnun / Dagbók | Skrifa button + feed | Same | 2-col: feed left, composer + reader right (`xl:grid xl:grid-cols-[minmax(380px,1fr)_1.3fr]`) | `src/app/[locale]/(app)/umonnun/UmonnunView.tsx:47-77` |
| Umönnun / Lyf | List of medication rows | Same | Same single list — no desktop evolution | `src/components/info/MedicationTable.tsx:93-166` |
| Tímar | List + "Nýr tími" + SeriesEntryRow | Same | Full-page-swap: Calendar (month/week/list) with optional right detail pane | `src/app/[locale]/(app)/timar/TimarView.tsx:25-46` |
| Tímar / Reglulegir | Single list | Same | Same | `src/app/[locale]/(app)/timar/reglulegir/ReglulegirView.tsx` |
| Fólk | Expand-in-row | Same | 2-col: list + detail pane (`xl:grid-cols-[minmax(340px,420px)_1fr]`) | `src/app/[locale]/(app)/folk/FolkView.tsx:46-64` |
| Gögn / Réttindi | Vertical list with status sections | Same | 4-col Kanban (`EntitlementKanban`) | `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx:132-139` |
| Gögn / Skjöl | List opens detail in Sheet | Same | 2-col: list + detail pane (`xl:grid-cols-[minmax(320px,380px)_1fr]`) | `src/app/[locale]/(app)/pappirar/PappirarTabs.tsx:140-158` |
| Login | Single column | Same | Same | `src/app/[locale]/login/page.tsx` |

**Summary of the split:** Four distinct `xl:` strategies — (A) single-column unchanged (Lyf, Reglulegir, Login), (B) 2-col list+detail pane (Fólk, Skjöl), (C) bespoke Command Post (Dashboard 3-zone), (D) full-page-swap with internal detail pane (Tímar), and (E) structure-changes-entirely (Réttindi: list becomes kanban). The `PaneLayout` primitive at `src/components/layout/PaneLayout.tsx` exists but is not used anywhere — Fólk and Skjöl implement their own grids. There is no `md:` breakpoint story at all — mobile and tablet are identical everywhere.

**Candidate canonical answer:** The `md:` gap is fine — there is no reason to design for 768–1279 as a distinct experience. Pick a single `xl:` pattern per content type: (1) stream-of-entries views (Dagbók) use list+detail; (2) catalog views (Fólk, Skjöl, Réttindi) use list+detail; (3) calendar is sui generis and deserves a documented exception; (4) dashboard is also sui generis. Adopt `PaneLayout` (already written, unused) as the canonical list+detail primitive. Retire the bespoke grids in FolkView / PappirarTabs that duplicate it.

### Pattern 9 — Date/time formatting

| Surface | Format used | File pointer |
| --- | --- | --- |
| Dashboard date ribbon | Absolute `formatAbsolute` ("17. apríl 2026") | `src/app/[locale]/(app)/page.tsx:44` |
| Dashboard — NextAppointments row | Split absolute: weekday + day stacked; time as "kl. {time}" next to title | `src/components/dashboard/NextAppointments.tsx:69-83` |
| Dashboard — SinceLastVisit per-item timestamp | **Relative** via `classifyRelative` ("Rétt í þessu", "Fyrir X mín.", "Í gær", etc.) | `src/components/dashboard/SinceLastVisit.tsx:10-30,126` |
| Dashboard — RecentLog eyebrow | Relative, lowercased: "dagbók · síðasta færsla · *í gær*" | `src/components/dashboard/RecentLog.tsx:52-57` |
| DrivingCta | `formatAbsoluteWithTime` ("fös. 18. apríl kl. 14:00") | `src/components/dashboard/DrivingCta.tsx:57` |
| Dagbók feed entry date | Absolute + `·` + absolute time ("17. apr. · 14:30") — never relative, even for entries from today | `src/components/log/LogFeed.tsx:26-43,99` |
| Dagbók reader date | Same absolute + time | `src/components/log/LogEntryReader.tsx:18-29` |
| AppointmentCard | `formatAbsoluteWithTime` — absolute only | `src/components/appointments/AppointmentCard.tsx:54-55` |
| Tímar detail pane header | `formatAbsoluteWithTime` | `src/components/timar/TimarDetail.tsx:107-108` |
| Week grid headers | Weekday + UTC date number | `src/components/timar/WeekGrid.tsx:262-277` |
| Month grid pills | Time only (`HH:mm`) | `src/components/timar/MonthGrid.tsx:174-176` |
| Document row meta | Short date "17. apr." (no time) | `src/components/info/DocumentList.tsx:58-63,100` |
| Document detail | Full date "17. apríl 2026" | `src/components/info/DocumentList.tsx:65-71`; `src/components/info/DocumentDetail.tsx:54-58` |
| "edited" marker on log entries | Italic word "Breytt" — no timestamp | `src/components/log/LogFeed.tsx:100-104` |

**Summary of the split:** Two patterns coexist cleanly — **relative** for "when something happened" in activity streams (`SinceLastVisit`, `RecentLog`'s eyebrow, Dagbók composer draft indicator); **absolute** for "when something will happen" (appointments, appointment lists, week grid) and for authored content persisted in the log feed (even though Dagbók feed is "when was this written"). The split is mostly intuitive but the log feed's insistence on absolute even for "í dag" and "í gær" is at odds with RecentLog. No explicit rule is documented.

**Candidate canonical answer:** Pass the rule into the docs: **future events → absolute (with weekday), past events written/stored by family → relative for ≤7 days, absolute thereafter, with time appended if present.** Dagbók feed should use the same logic as RecentLog instead of forcing absolute.

### Pattern 10 — Actor attribution

| Surface | "Who did X" shown? | File pointer |
| --- | --- | --- |
| Dagbók feed entry | Author avatar (size-10) + name + date header; `Breytt` badge but no "edited by" | `src/components/log/LogFeed.tsx:87-105` |
| Dagbók reader | Same — author avatar + name + date | `src/components/log/LogEntryReader.tsx:52-71` |
| AppointmentCard | Driver avatar + name when assigned; "Enginn skutlar" + Ég get! otherwise. No createdBy / updatedBy surfaced. | `src/components/appointments/AppointmentCard.tsx:83-116` |
| Tímar detail pane | Driver shown via `DriverPicker`; no createdBy/updatedBy | `src/components/timar/TimarDetail.tsx:138-147` |
| Medication row | No actor shown anywhere (`updatedByUser` is on the doc but never rendered) | `src/components/info/MedicationTable.tsx:44-75` |
| Contact row | No actor | `src/components/info/ContactList.tsx:99-135` |
| Entitlement card | Owner avatar + `firstName(owner) + "sér um"` — or claim CTA when null | `src/components/info/EntitlementList.tsx:141-166` |
| Entitlement kanban card | Owner avatar + first name — no "sér um" suffix | `src/components/info/EntitlementKanban.tsx:103-115` |
| Document row | Uploader first name inside the meta pill sequence ("Lyfseðill · 17. apr · Elin") | `src/components/info/DocumentList.tsx:99-133` |
| Document detail pane | Uploader avatar + name + date | `src/components/info/DocumentDetail.tsx:82-97` |
| SinceLastVisit feed | Per-item actor name in sentence templates: `t("log", {name})`, `t("document", {name, fileName})`, `t("entitlementStatus", {name, title, newStatus})`. Appointment items **omit** actor ("Nýr tími: {title}"). | `src/components/dashboard/SinceLastVisit.tsx:97-119`; `messages/is.json:54-58` |
| DrivingCta | Doesn't name the creator of the appointment | `src/components/dashboard/DrivingCta.tsx:49-65` |

**Summary of the split:** Actor visibility follows no rule. Dagbók and Documents surface the author everywhere; Réttindi surfaces the owner (not the updater); Appointments surface only the driver; Medications surface nothing. The SinceLastVisit feed is internally inconsistent — three of its four item kinds include the actor, but `appointment` omits it. The `ownerSuffix` copy ("sér um") is only used in one of the two entitlement surfaces (list, not kanban).

**Candidate canonical answer:** At minimum, the SinceLastVisit `appointment` item should include the actor ("{name} bætti tíma: {title}") — it's a logged family-facing mutation. For the broader rule: every list row that has an `updatedBy` or `authorId` should surface a subtle last-actor line for 60+ users who want to know who recently touched something. Tiered visibility (avatar+name in detail, name-only in list, hidden in forms) would be consistent.

### Pattern 11 — Toast feedback

| Surface | Toast fired? | File pointer |
| --- | --- | --- |
| LogEntryForm save | No toast; sheet closes on success | `src/components/log/LogEntryForm.tsx:96-97` |
| AppointmentForm save | No toast; sheet closes | `src/components/appointments/AppointmentForm.tsx:128-129` |
| MedicationForm save | No toast | `src/components/info/MedicationForm.tsx:106-107` |
| ContactForm save | No toast | `src/components/info/ContactForm.tsx:124-125` |
| EntitlementForm save | No toast | `src/components/info/EntitlementForm.tsx:126-127` |
| DocumentUpload save | No toast | `src/components/info/DocumentUpload.tsx:105-107` |
| SeriesForm save | No toast | `src/components/recurringSeries/SeriesForm.tsx:115-117` |
| SeriesCard pause/resume | No toast fired — but `recurring.pauseToast` ("{title} sett í hlé") and `recurring.resumeToast` ("Næsti tími: {when}") exist in both locales with no consumer | `src/components/recurringSeries/SeriesCard.tsx:50-61`; `messages/is.json:211-212` |
| Entitlement drag in kanban | No toast | `src/components/info/EntitlementKanban.tsx:216-229` |
| Volunteer-to-drive (Dashboard) | No toast | `src/components/dashboard/NextAppointments.tsx:126-133` |
| Claim entitlement | No toast; dialog closes on success | `src/components/info/EntitlementList.tsx:371-383` |

**Summary of the split:** The app ships no toast system. No `toast()` import exists in `src/components/**`. Dead translation keys `recurring.pauseToast` / `recurring.resumeToast` were written but never wired. Confirmation is currently "the sheet closes and the list re-renders in real time" — which works for a sighted user in a quiet moment but gives zero feedback when a save silently succeeds on a slow connection.

**Candidate canonical answer:** Make an explicit, documented choice. Either (a) ship no toasts and delete the two dead keys; document that real-time re-render *is* the feedback (add a brief focus-return animation if needed); or (b) adopt shadcn Sonner toasts for write confirmations only (not reads, not queries) and wire the two dead keys plus add parallel keys for the other forms.

### Pattern 12 — Loading state

| Surface | Pattern | File pointer |
| --- | --- | --- |
| Dashboard NextAppointments | `<p className="text-ink-faint py-2">Hleð…</p>` | `src/components/dashboard/NextAppointments.tsx:152-153` |
| Dashboard SinceLastVisit | Same plain text "Hleð…" | `src/components/dashboard/SinceLastVisit.tsx:73-74` |
| Dashboard RecentLog | Renders nothing while `entry === undefined` | `src/components/dashboard/RecentLog.tsx:106` |
| WeekStrip | Empty aria-hidden skeleton min-h-32 | `src/components/dashboard/WeekStrip.tsx:52-56` |
| LogFeed | `<Card><CardContent>Hleð…</CardContent></Card>` — uses shadcn Card, not the ink-faint minimal style | `src/components/log/LogFeed.tsx:58-65` |
| Umönnun / Lyf | `rounded-2xl bg-paper px-4 py-6 ring-1 ring-foreground/10 text-muted-foreground` block with "Hleð..." | `src/components/info/MedicationTable.tsx:106-109` |
| Tímar list | `<Card><CardContent>Hleð…</CardContent></Card>` | `src/components/appointments/AppointmentList.tsx:64-69` |
| Fólk list | Paper-block variant: `rounded-2xl bg-paper ... ring-1 ring-foreground/10` | `src/components/info/ContactList.tsx:275-278` |
| Gögn / Réttindi | Paper-block variant | `src/components/info/EntitlementList.tsx:389-392` |
| Gögn / Skjöl | Paper-block variant | `src/components/info/DocumentList.tsx:349-352` |
| Reglulegir series | Plain `<p className="text-ink-faint py-2">Hleð…</p>` | `src/components/recurringSeries/SeriesList.tsx:27-28` |
| Month grid | `ClientOnly` wrapper with `min-h-96` placeholder — skeleton only | `src/components/timar/CalendarView.tsx:161`; `src/components/timar/MonthGrid.tsx` |
| EmergencyTiles | Bespoke 3-cell grid skeleton (`bg-paper-deep/60 ring-1`) | `src/components/info/EmergencyTiles.tsx:64-79` |
| ContactDetail / DocumentDetail | Plain `<p className="text-ink-faint">Hleð…</p>` | `src/components/info/ContactDetail.tsx:32`; `src/components/info/DocumentDetail.tsx:46` |

**Summary of the split:** Four patterns are in use — (1) minimal plain paragraph "Hleð…", (2) shadcn Card + "Hleð…", (3) paper-block (bg-paper ring-1) + "Hleð…", (4) custom skeleton (WeekStrip, EmergencyTiles, MonthGrid). The shadcn Card usage (LogFeed, AppointmentList) looks visibly different from the surrounding Bókasafn aesthetic because it uses shadcn's default Card styling rather than the paper-block pattern.

**Candidate canonical answer:** Pick skeleton-or-text by surface role: list-shaped loading → paper-block with "Hleð…"; detail-shaped → plain italic ink-faint line; grid-shaped (calendar, tiles) → aria-hidden skeleton. Retire the Card variant. Retire the "render nothing" variant (Dashboard RecentLog) — it makes the page appear empty on slow connections.

### Pattern 13 — Error state

| Surface | Pattern | File pointer |
| --- | --- | --- |
| LogEntryForm validation | Inline `<p className="text-base text-destructive" role="alert">` at end of form | `src/components/log/LogEntryForm.tsx:173-177` |
| AppointmentForm | Same inline `text-destructive` `role="alert"` | `src/components/appointments/AppointmentForm.tsx:265-269` |
| MedicationForm | Same | `src/components/info/MedicationForm.tsx:241-245` |
| ContactForm | Same | `src/components/info/ContactForm.tsx:271-275` |
| EntitlementForm | Same | `src/components/info/EntitlementForm.tsx:304-308` |
| DocumentUpload | Same | `src/components/info/DocumentUpload.tsx:230-234` |
| SeriesForm | Same | `src/components/recurringSeries/SeriesForm.tsx:228-232` |
| SeriesCard toggle / delete | Smaller inline `text-sm text-destructive` `role="alert"` within the card | `src/components/recurringSeries/SeriesCard.tsx:135-139` |
| Entitlement claim dialog | Inline `text-base text-destructive` `role="alert"` inside dialog content | `src/components/info/EntitlementList.tsx:505-509` |
| Volunteer to drive | Silent — `try/catch` with `console.error`, no user feedback | `src/components/dashboard/NextAppointments.tsx:126-133` |
| Tímar detail pane cancel | Silent — `try/finally` with only `pending` flag | `src/components/timar/TimarDetail.tsx:65-74` |
| Kanban drag-to-change-status | Silent — `console.error(err)` only | `src/components/info/EntitlementKanban.tsx:225-229` |
| AppointmentCard volunteer | Silent — `try/finally` | `src/components/appointments/AppointmentCard.tsx:41-48` |
| Document delete | Silent — `try/finally` | `src/components/info/DocumentList.tsx:326-338` |
| App-level error | `(app)/error.tsx` full-page with serif "Eitthvað fór úrskeiðis" + "Reyna aftur" button | `src/app/[locale]/(app)/error.tsx:36` |
| Login error | `<p className="text-base text-red-600 max-w-sm text-center">` — not using `text-destructive` token | `src/app/[locale]/login/page.tsx:46-47` |

**Summary of the split:** Form-validation errors are consistently surfaced inline with `role="alert"`. Network/mutation errors in **non-form** actions (volunteer, kanban drag, document delete, tímar cancel) are **silently swallowed** — the user sees nothing if the call fails. Login uses the raw `text-red-600` Tailwind token instead of the `text-destructive` design token — the only place in the app that does.

**Candidate canonical answer:** Pair the toast decision (Pattern 11) with error surfacing: every mutation's catch branch either sets a local error message or fires a toast. Silent `console.error` is insufficient for this audience — they will try the action once, see nothing happen, and assume it worked. Login must use `text-destructive`.

### Pattern 14 — Optimistic UI

| Surface | Optimistic? | File pointer |
| --- | --- | --- |
| Volunteer to drive (Dashboard) | Blocking — sets `pending=true` until Convex returns | `src/components/dashboard/NextAppointments.tsx:126-133` |
| Volunteer to drive (AppointmentCard) | Blocking — `volunteering` flag | `src/components/appointments/AppointmentCard.tsx:39-48` |
| Claim entitlement | Blocking — dialog stays open with `claiming` disabled, no optimistic owner | `src/components/info/EntitlementList.tsx:371-383` |
| Kanban drag-drop | Waits for round-trip — column change visible only after Convex refresh | `src/components/info/EntitlementKanban.tsx:216-229` |
| Week-grid driver drag-and-drop | Same — `await update(...)` then next Convex tick shows | `src/components/timar/WeekGrid.tsx:204-233` |
| SeriesCard pause toggle | Blocking — `pending=true`, then toggle visibly moves after Convex | `src/components/recurringSeries/SeriesCard.tsx:50-61` |
| RecentLog inline expand | Pure local state — instant | `src/components/dashboard/RecentLog.tsx:69-78` |
| Virtual-occurrence materialize-then-assign | Two awaits chained — perceptibly slow (materialize then update) | `src/components/timar/WeekGrid.tsx:218-232`; `src/components/timar/TimarDetail.tsx:36-63` |

**Summary of the split:** Nothing is optimistic. Every data mutation waits for Convex round-trip. This is a non-issue on a fast connection but can feel unresponsive on mobile LTE — a tap on "Ég get!" for the driving CTA doesn't visibly react until the server returns. No framework is set up (no `useOptimisticUpdate`, no local-state-then-reconcile).

**Candidate canonical answer:** Leave as-is for v1 given the audience — optimistic UI adds complexity and the current round-trip is fast in practice. Document the choice explicitly. If a slow-network complaint arises, volunteering-to-drive is the top candidate because it's the highest-frequency tap.

### Pattern 15 — Phone/tel affordance

| Surface | Tel link? | File pointer |
| --- | --- | --- |
| Fólk — emergency tiles | `<a href={telHref(phone)}>` with full-tile hit area, `min-h-28`. `telHref` normalises to `+354` | `src/components/info/EmergencyTiles.tsx:39-55,11-18` |
| Fólk — contact row "call pill" | `<a href={telHref(phone)}>` circular 44 px `size-11` pill — **44 px, below floor** | `src/components/info/ContactList.tsx:124-131` |
| Fólk — expanded contact details | Large `<a href={telHref(phone)}>` with `min-h-12 rounded-xl bg-primary/10 text-lg`. Tappable, bigger than 48 px | `src/components/info/ContactList.tsx:141-149` |
| Fólk — detail pane (desktop) | Same large tel tile, `min-h-14 text-xl` | `src/components/info/ContactDetail.tsx:53-61` |
| ContactForm edit input | Numeric `<Input type="tel" inputMode="tel">` — not tappable-as-phone, just the edit field | `src/components/info/ContactForm.tsx:232-241` |
| Phone-like strings elsewhere (contact notes, medication prescriber, entitlement notes) | NOT tel-linked even when phone numbers appear ("543 9560" in Óskar læknir notes, Brjóstamiðstöð phones in entitlement notes) | e.g. `docs/spec.md:991,997`; rendered as plain text in `ContactList` notes and `EntitlementList` description |
| Dashboard / Tímar / Umönnun | Zero phone surface | — |
| AttentionCard referencing Brjóstamiðstöð | Does NOT carry a tel link to Brjóstamiðstöð even though the current top entitlement is "Vottorð fyrir heimahjúkrun" routed through that number | `src/components/dashboard/AttentionCard.tsx:43-76` |

**Summary of the split:** All **structured** `phone` fields on the `contacts` table are correctly tel-linked. All **notes** fields containing phone numbers (medication prescriber notes, entitlement notes, contact notes) render as plain text. The row pill is at 44 px (below 48 floor). CLAUDE.md explicitly lists tel links as "the single most-used feature, zero extra taps between need and call" — the notes gap is measurable: the "Brjóstamiðstöð 543 9560" phone lives in three places in the seed data, only one of which is tappable.

**Candidate canonical answer:** Keep structured `phone` fields tel-linked. Add a simple phone-number autolinker to any user-visible free-text body (`contact.notes`, `entitlement.notes`, `medication.notes`, `appointment.notes`, `document.notes`) — server-rendered regex linkifier on the client. Enlarge the contact-row pill to 48 px.

### Pattern 16 — Color semantics

| Surface / Meaning | Sage | Amber | Paper-deep | Destructive |
| --- | --- | --- | --- | --- |
| DrivingCta (needs driver) | sage-gradient background | — | — | — |
| AttentionCard | — | amber-bg-1→amber-bg-2 gradient, amber-ink text | — | — |
| Month/week pill with driver | `bg-sage/25` + `text-sage-shadow` | — | — | — |
| Month/week pill unassigned | — | `bg-amber-bg-1` + `text-amber-ink-deep` | — | — |
| Month/week pill selected | `bg-sage-deep text-paper` (solid sage, not amber-alerting) | — | — | — |
| Entitlement kanban card urgent | — | amber-left-bar `bg-amber-ink/70`; urgent pill `bg-amber-bg-1 text-amber-ink-deep` | — | — |
| Entitlement status dot `approved` | `bg-sage-shadow` | — | — | — |
| Entitlement status dot `in_progress` | `bg-sage-deep` | — | — | — |
| Entitlement status dot `not_applied` | — | `bg-wheat-deep` (not amber — semantic drift) | — | — |
| Entitlement status dot `denied` | — | — | — | `bg-ink-faint` (grey, not destructive tint) |
| Progress bar segment `denied` | — | — | `bg-divider-strong` | — |
| Progress bar segment `not_applied` | — | — | `bg-wheat` | — |
| Destroy button | — | — | — | `variant="destructive"` → `bg-destructive/10 text-destructive` |
| Contact row tel pill | `bg-sage/30 text-sage-shadow` | — | — | — |
| Emergency tile — Neyðarlína (coral) | — | — | Raw hex `bg-[#f1d9d9] text-[#9a4a4a]` (coral — not in palette) | — |
| Emergency tile — Eitrunarmiðstöð (wheat) | — | `bg-[#ece1c2] text-amber-ink-deep` (raw hex + amber token) | — | — |
| Emergency tile — Læknavaktin (sage) | `bg-[#d7dec9] text-sage-shadow` (raw hex + sage token) | — | — | — |
| Dashboard greeting volunteer (amber dot in row) | — | `bg: #C9A35C` raw hex | — | — |
| Cancelled appointment marker (past future) | — | `bg-amber-ink` dot | — | — |

**Summary of the split:** Sage = positive/assigned/approved is fairly consistent. Amber is overloaded — it means "needs attention" (AttentionCard), "unassigned slot" (calendar pills), "urgent" (entitlements), AND "cancelled" (month strip dot). Wheat is used for "not applied" entitlement status — a visually distinct third amber-adjacent role. The emergency tiles introduce four raw hex colours (coral #f1d9d9, coral-ink #9a4a4a, wheat #ece1c2, sage #d7dec9) that aren't in the Bókasafn palette. DocumentList also uses a raw `bg-[#e9d0cb] text-[#8a4e48]` for PDF thumbnails.

**Candidate canonical answer:** Lock the semantics: sage = calm/done; sage-deep = selected/focused; amber = needs-attention-now; wheat = neutral-pending; destructive = destroy-only. Reassign `denied` from `bg-ink-faint`/`bg-divider-strong` to `text-destructive` / destructive-tinted to carry the "negative outcome" meaning. Promote the emergency tile and PDF-thumbnail raw hexes into named `--tone-coral-*` / `--tone-wheat-deep` tokens in `globals.css` — or replace them with existing tokens.

### Pattern 17 — i18n coverage

| Surface | Issue | File pointer |
| --- | --- | --- |
| `dialog.tsx` sr-only close | Hardcoded English "Close" | `src/components/ui/dialog.tsx:77` |
| `dialog.tsx` optional footer close | Hardcoded English "Close" text button | `src/components/ui/dialog.tsx:116` |
| `sheet.tsx` sr-only close | Hardcoded English "Close" | `src/components/ui/sheet.tsx:78` |
| Login error path | Uses `err.message` directly — may surface English Convex/OAuth error strings to user | `src/app/[locale]/login/page.tsx:23-24` |
| Kanban — status bucket headers | Re-uses `entitlements.statuses.*` (correct) | `src/components/info/EntitlementKanban.tsx:145-147` |
| Document PDF/IMG/DOC thumbnail labels | Hardcoded English "PDF", "IMG", "DOC" | `src/components/info/DocumentList.tsx:53-55` |
| Sort key labels | Uses `documents.sort.recent` / `byCategory` (correct) | `src/components/info/DocumentList.tsx:341-344` |
| Kanban drag overlay aria-label | `aria-label="view"` hardcoded (desktop only) | `src/components/timar/CalendarView.tsx:233` |
| AttentionCard raw colour | No i18n issue — noted under Pattern 16 | — |
| Recurring `entryCount` pluralization | Correctly uses ICU plural — mixed both `#` and `{count}` placeholders; `is.json` uses `#` for 0/1 and `#` elsewhere, no bug | `messages/is.json:188` |
| `{count} virkir` vs `# virkir` drift | `is.json` uses `#` throughout `entryCount`; `en.json` may differ (not read in this audit) | `messages/is.json:188` |
| Dagbók eyebrow "dagbók" is .toLowerCase()'d | Relies on `.toLowerCase()` of the translated value — works in Icelandic, could break in locales with tiered case rules | `src/components/dashboard/RecentLog.tsx:57` |

**Summary of the split:** Three genuinely hardcoded user-visible English strings (Dialog's "Close" ×2 and Sheet's "Close") plus a cosmetic but hardcoded "view" aria-label. Thumbnail kind labels ("PDF" "IMG" "DOC") are borderline — short acronyms are conventionally left untranslated but would need a review if French-Canadian or similar ever mattered. Login error message is bypassing localisation by surfacing raw OAuth/Convex errors.

**Candidate canonical answer:** Wrap the shadcn primitives so `showCloseButton` consumes a locale-aware label. Add `common.view` and use it. Catch-and-translate login errors to the existing `auth.signInFailed`.

### Pattern 18 — Accessibility

Owned in parallel by the Accessibility Auditor at `docs/superpowers/audits/2026-04-19-a11y-audit.md`. From this audit I flagged issues that cross into other patterns (SR labels in primitives — Pattern 17; tap-target violations — Pattern 7; silent error swallowing — Pattern 13) but did not perform the WCAG-focused pass.

### Pattern 19 — Commitment confirmation (self-assignment / task claim)

> Added 2026-04-19 after user reported family members have repeatedly volunteered themselves as drivers by accident. The pattern is distinct from Pattern 2 (Destroy) because nothing is being deleted — the user is committing themselves to a responsibility. But the UX consequence is similar: a misclick creates an unwanted state that someone has to unwind.

| Surface | Action | How it works today | File pointer |
| --- | --- | --- | --- |
| Dashboard — DrivingCta primary button ("Ég get skutlað") | Assigns current user as appointment driver | **No confirm.** Click → instant mutation. `try/finally` swallows any error. | `src/components/dashboard/DrivingCta.tsx:20-30,63-75` |
| Dashboard — NextAppointments volunteer CTA on an appointment row without a driver | Assigns current user as appointment driver | **No confirm.** Click → instant mutation. Silent on error. | `src/components/dashboard/NextAppointments.tsx:123-131` |
| Tímar — AppointmentCard "Ég skutla" button | Assigns current user as appointment driver | **No confirm.** Click → instant mutation. `volunteering` flag blocks double-tap during the round-trip, but there is no pre-commit gate. | `src/components/appointments/AppointmentCard.tsx:36-48,103-110` |
| Tímar / detail pane — driver-assignment dropdown | Assign / change / unset driver (any user, not just self) | **No confirm.** `Select` → `onValueChange` → direct mutation. | `src/components/timar/TimarDetail.tsx:*` (pane render path) |
| Tímar / week grid — drag avatar onto appointment | Assigns dragged user as appointment driver | **No confirm.** `onDragEnd` → materialize-if-virtual → `update({driverId})`. | `src/components/timar/WeekGrid.tsx:208-237` |
| Gögn / Réttindi — "+ Enginn eigandi · tek þetta" claim button | Claims entitlement ownership for current user | **Has confirm dialog** with `rettindi.claim.confirmTitle` + `confirmBody` + `confirmAction` ("Já, ég tek þetta"). The only commitment surface that already gates the action. | `src/components/info/EntitlementList.tsx:332, 485-527` |

**Summary of the split:** Six self-assignment / driver-assignment surfaces, five of which commit instantly without a confirmation. The one that *does* confirm — entitlement claim — sets the template (body copy names the specific item, primary button is affirmative-first-person in Icelandic "Já, ég tek þetta"). The instant-commit surfaces also silently swallow errors (see Pattern 13), so a failed mutation appears to the user as "nothing happened" and encourages a second click — compounding the risk of accidental assignment.

**Candidate canonical answer:** Every commitment action (volunteering, claiming, assigning responsibility whether to self or others) goes through a confirmation dialog modelled on the existing `rettindi.claim` dialog. Body copy names the subject ("Ertu viss um að þú viljir skutla í {apptTitle} kl. {time}?" or similar); primary button is the affirmative first-person commit ("Já, ég skutla"); cancel button is `common.cancel`. The week-grid drag-to-assign is the one exception worth considering — drag is already an intentional gesture, but the target should probably still confirm before committing since the gesture is easy to trigger by mistake on touch devices. Pattern decision: apply the confirm dialog uniformly; if drag-to-assign feels over-gated, handle that as a documented exemption in the rulebook.

## Cross-cutting observations

1. The `EmptyState` primitive's `bg-muted/40 border-dashed` styling is the single most jarring visual in the app — it clashes with the Bókasafn paper/ring-1 convention used everywhere else. It feels borrowed from shadcn defaults.
2. Sheet vs Dialog choice is perfectly correlated with a *different* axis than the ones the plan flagged: Sheet = "enter data / complete a task", Dialog = "confirm a decision". That correlation is worth documenting as the canonical rule.
3. `showCloseButton={true}` appears on exactly one sheet (`DocumentList`'s detail sheet, for read-only content). Everywhere a user is filling a form, the close button is intentionally hidden and the explicit Cancel button carries the dismiss role. Worth codifying.
4. Destructive-button placement-outside-the-footer is the consistent pattern (self-start below Save/Cancel) in every form except SeriesForm (which has no destroy) and DocumentDetail's mobile sheet (destroy inside the main action column). The single exception is the Tímar desktop detail pane where destroy is a ghost inline button with no confirm dialog — a serious outlier.
5. `common.cancel` translates to "Hætta við". Tímar's `detail.cancel` copy is "Hætta við þennan tíma" for cancelling an appointment. The same verb ("hætta við") means "dismiss this form" in 99 % of the app and "cancel this appointment" in the one desktop pane — a semantic collision for the same 60+ user.
6. The `xl:` desktop Command Post (`SinceLastVisit` + `WeekStrip` + attention column) is only accessible via the dashboard; mobile users never see `SinceLastVisit`. Since the whole "what changed since I last visited" concept is most valuable to the weekly-checker use case, it's strange that mobile gets neither the week strip nor the since-last-visit feed.
7. The `recurring.entryLabel` text in `SeriesEntryRow` is "Reglulegir tímar" — identical to the page heading of `/timar/reglulegir`. Tapping a thing called "Reglulegir tímar" takes you to a page called "Reglulegir tímar" with no contextual reframing. Works, but is visually repetitive.
8. `DocumentList` has two completely separate DocumentDetail implementations — one internal (`src/components/info/DocumentList.tsx:177-291`, opens in a mobile Sheet with `showCloseButton=true`) and one standalone (`src/components/info/DocumentDetail.tsx`, renders in the desktop pane). They show the same data but with materially different layouts and action sets. This is duplication the codebase will regret.
9. ContactList's row has three independent click targets — the name-initial/name block (expand), the tel pill (call), and (after expand) the edit button. Three targets in a row ~64 px tall means the 60+ user has to aim. The desktop pane collapses this to one "tap the row to view; tap a button inside the pane to act" which is gentler.
10. Dashboard greeting uses `text-[2.5rem]` — the app's largest headline — but the greeting itself is `Góðan daginn, {name}` which is short. The other top-page headlines ("Hvernig Siggu líður.", "Réttindi í vinnslu.", "Sími, læknar, þjónusta.") are sentences, use `text-[2.25rem]`, and read as warm micro-statements. Dashboard feels louder than the content warrants.
11. The `AttentionCard` and `DrivingCta` use full-bleed gradient backgrounds and hex colours inline — both bypass the token system entirely. Moving these to `var(--amber-bg-1) / var(--sage)` tokens (which they partially do) would let them respond to any future palette refinement.
12. Four different progress-or-status indicators exist on `/pappirar`: the `ProgressTracker` bar, the status-color dot in section headers, the status name italic in cards, and the kanban column header — all visually distinct ways of saying "this item is in `in_progress` state". Consider consolidating.
13. Icelandic headlines ≥ 28 characters word-wrap into three lines on a 375 px viewport ("Hvernig Siggu líður." is 20 chars — fine; "Reglulegir tímar sem endurtaka sig — t.d. Virkni og Vellíðan — birtast hér." from the empty-state body is 75 chars and wraps aggressively). The `text-balance` class is applied on page headlines but not on empty-state descriptions — small inconsistency.
14. The Skjöl document list has no "edit metadata" flow at all — once uploaded you can only download or delete. That's quietly missing for a family that will re-categorise a scanned letter.
15. The floating "X" close button on the desktop Tímar detail pane (`CalendarView.tsx:187-195`) is the only close-detail affordance on desktop. `Escape` does not dismiss the pane. Keyboard users are stuck reaching for the mouse.

## Surfaces not visited

- Cancelled-future-slot rendering in `NextAppointments` (`CancelledRow` at `src/components/dashboard/NextAppointments.tsx:36-49`) — code is clear, but the visual weight vs upcoming rows wasn't verifiable without data.
- Virtual-occurrence materialize-on-interaction flow — code-reviewable but the latency / UX of the two-awaits chain only matters on a slow connection.
- BRÝNT pill rendering on actual seed data — the `EntitlementList.EntitlementCard` and kanban card paths are clear, but seeing the amber-left-bar in context would confirm its contrast.
- Claim dialog copy interpolation — `confirmBody` uses `\"{title}\"` with straight quotes. Icelandic typography conventions use curly quotes („…") and the `SinceLastVisit.entitlementStatus` key already uses them correctly. Worth a live check.
- The `Tabs` primitive behaviour with > 1 tab across the `xl:` breakpoint in Umönnun — the `xl:self-start` class on `TabsList` changes its width behaviour and wasn't rendered mentally with certainty.
- AttentionCard rendering when there are 2+ additional items — the `more` plural key and the secondary "Sjá öll →" link.
- Sidebar attention badge visibility with actual non-zero counts.

## Seed items already flagged — verified

1. **Edit affordance split (pencil vs card-tap vs kebab vs sheet)** — **confirmed and worse than described**. Six distinct patterns identified in Pattern 1, not three. No kebab menu is actually in use; the "sheet" route is the one in Fólk (edit button inside expanded block), not a direct "tap opens sheet".
2. **Destroy affordance split** — **confirmed**. Additional finding: Tímar desktop detail pane has a destructive action with **no confirm dialog at all** — this is the riskiest single interaction in the app.
3. **Tap-target floor**: `EntitlementList.tsx` chips `h-10` and claim CTA — **partially corrected**. Current code has `min-h-12` (48 px) on both (`:293`, `:161`). Still at the 48 px floor, not the 56 px `size="touch"` preference. The worse offenders are now Tímar desktop's `size="sm"` cluster, the kanban `size-6` add button, the Fólk filter chips `h-10`, and the Fólk `+` at `size-10`.
4. **Hardcoded English in primitives** — **confirmed**. Three locations (Dialog sr-only, Dialog footer, Sheet sr-only). Login also surfaces raw English error strings.
5. **Unused toast keys (`pauseToast` / `resumeToast`)** — **confirmed**. Both exist in `is.json:211-212` and are never imported / fired. No toast system present at all.
6. **Form-container split** — **refuted as originally worded**. Sheet vs Dialog is actually consistent (sheet = enter data, dialog = confirm). CTA-in-header vs CTA-in-footer is **not** a real split — every form uses footer CTAs. What IS inconsistent is destructive-button placement and the hardcoded "Hlaða upp" verb on DocumentUpload.
7. **List-detail vs full-page on md: and xl:** — **confirmed**. Four distinct `xl:` strategies identified (A single-col / B list+detail / C command-post / D full-page swap / E kanban swap). `md:` is a non-breakpoint; mobile and tablet are identical.
8. **Headline sizes** — **confirmed and expanded**. Six distinct rem values in use for headline-role text: 2.5, 2.25, 2, 1.75, 1.6, 1.4. Additionally, Tímar mobile is the one page heading that is NOT `font-serif` — a standalone inconsistency.
9. **Date format split (relative vs absolute)** — **confirmed**. Rule is *almost* intuitive ("future = absolute, past = relative") but Dagbók feed breaks it by forcing absolute even for today/yesterday. Rule not written anywhere.
10. **Actor attribution** — **confirmed and expanded**. SinceLastVisit's `appointment` item uniquely omits the actor. Medications never surface an updater. Entitlement kanban drops the `ownerSuffix` that the list uses. No consistent rule.
11. **Color semantics audit** — **confirmed; two genuine semantic drifts found**. (1) `denied` entitlement uses grey (`bg-ink-faint`/`bg-divider-strong`) instead of a destructive tint, diluting the amber=warning meaning. (2) `not_applied` uses `wheat`/`wheat-deep` — fine by itself, but introduces a third amber-adjacent tone. Plus five raw hex colours in EmergencyTiles and DocumentList PDF thumbs that aren't in the token system.
12. **Empty-state tone** — **confirmed warm and consistent in copy**; what's inconsistent is *component choice* (three tiers: full `EmptyState`, `EmptyState`-without-action, plain `<p>`) and punctuation (period present on some headlines, absent on others). The warm tone CLAUDE.md praises is intact everywhere.
13. **Phone `tel:` coverage** — **confirmed partial**. All structured `phone` fields are tappable. All phone numbers embedded in free-text `notes` fields (contact notes, entitlement notes, medication notes) render as plain text. The row call-pill is 44 px — one pixel shy of the supposed floor in two places. Emergency tiles are generous (min-h-28, full area tappable). CLAUDE.md calls this the most-used feature; the `notes`-embedded number gap matters most for the Brjóstamiðstöð (543 9560) and Bati (553-1234) numbers which appear in multiple free-text contexts.
