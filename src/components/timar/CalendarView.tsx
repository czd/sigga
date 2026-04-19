"use client";

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { MonthGrid, type RangeRow } from "./MonthGrid";
import { TimarDetail } from "./TimarDetail";
import { startOfWeek, WeekGrid } from "./WeekGrid";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type ViewMode = "month" | "week" | "list";

function updateSearchParams(patch: Record<string, string | null>) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	for (const [k, v] of Object.entries(patch)) {
		if (v === null) url.searchParams.delete(k);
		else url.searchParams.set(k, v);
	}
	window.history.replaceState(null, "", url.toString());
}

function monthStartUTC(now: Date, monthOffset: number): Date {
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1),
	);
}

export function CalendarView() {
	const t = useTranslations("timar");
	const locale = useLocale();
	const searchParams = useSearchParams();

	const initialView = ((): ViewMode => {
		const v = searchParams.get("view");
		return v === "week" || v === "list" ? v : "month";
	})();

	const [view, setView] = useState<ViewMode>(initialView);
	const [selected, setSelected] = useState<RangeRow | null>(null);
	const [monthOffset, setMonthOffset] = useState(0);
	const [weekOffset, setWeekOffset] = useState(0);
	const [createOpen, setCreateOpen] = useState(false);

	const handleSelect = useCallback((appointment: RangeRow) => {
		setSelected(appointment);
		updateSearchParams({ id: appointment._id });
	}, []);

	const handleCloseDetail = useCallback(() => {
		setSelected(null);
		updateSearchParams({ id: null });
	}, []);

	const handleViewChange = useCallback((next: ViewMode) => {
		setView(next);
		updateSearchParams({ view: next === "month" ? null : next });
	}, []);

	const handleToday = useCallback(() => {
		setMonthOffset(0);
		setWeekOffset(0);
	}, []);

	const now = new Date();
	const monthStart = monthStartUTC(now, monthOffset);
	const weekStartMs = startOfWeek(new Date()).getTime() + weekOffset * WEEK_MS;

	const monthLabel = new Intl.DateTimeFormat(locale, {
		month: "long",
		year: "numeric",
	}).format(monthStart);

	const weekLabel = (() => {
		const ws = new Date(weekStartMs);
		const we = new Date(weekStartMs + 6 * DAY_MS);
		const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric" });
		const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
		return `${dayFmt.format(ws)}.–${dayFmt.format(we)}. ${monthFmt.format(we).replace(/\.$/, "")}`;
	})();

	const navLabel =
		view === "month" ? monthLabel : view === "week" ? weekLabel : null;

	const showDetail = selected !== null;
	const activeId = selected?._id ?? null;

	return (
		<div className="flex flex-col gap-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					{view !== "list" ? (
						<>
							<Button
								variant="ghost"
								size="touch-icon"
								onClick={() => {
									if (view === "month") setMonthOffset((n) => n - 1);
									else setWeekOffset((n) => n - 1);
								}}
								aria-label={t("calendar.prev")}
							>
								<ChevronLeft aria-hidden />
							</Button>
							<div className="font-serif text-lg text-ink min-w-48 text-center capitalize">
								<ClientOnly fallback={<span>&nbsp;</span>}>
									{navLabel}
								</ClientOnly>
							</div>
							<Button
								variant="ghost"
								size="touch-icon"
								onClick={() => {
									if (view === "month") setMonthOffset((n) => n + 1);
									else setWeekOffset((n) => n + 1);
								}}
								aria-label={t("calendar.next")}
							>
								<ChevronRight aria-hidden />
							</Button>
							<Button variant="outline" onClick={handleToday} className="ml-1">
								{t("calendar.today")}
							</Button>
						</>
					) : null}
				</div>
				<div className="flex items-center gap-2">
					<ViewToggle view={view} onChange={handleViewChange} />
					<Button onClick={() => setCreateOpen(true)}>
						<Plus aria-hidden />
						<span>{t("new")}</span>
					</Button>
				</div>
			</div>

			{/* Calendar + optional detail pane */}
			<div
				className={cn(
					"grid gap-4",
					showDetail
						? "grid-cols-[1fr_320px] 2xl:grid-cols-[1fr_380px]"
						: "grid-cols-1",
				)}
			>
				<div className="min-w-0">
					{view === "month" ? (
						<ClientOnly fallback={<div className="min-h-96" aria-hidden />}>
							<MonthGrid
								monthStartMs={monthStart.getTime()}
								activeId={activeId}
								onSelect={handleSelect}
								compact={showDetail}
							/>
						</ClientOnly>
					) : view === "week" ? (
						<WeekGrid
							weekStartMs={weekStartMs}
							activeId={activeId}
							onSelect={handleSelect}
						/>
					) : (
						<div className="mx-auto max-w-[720px]">
							<AppointmentList />
						</div>
					)}
				</div>

				{showDetail && selected ? (
					<aside
						aria-label={t("detail.paneLabel")}
						className="bg-paper rounded-2xl ring-1 ring-foreground/10 p-5 min-w-0"
					>
						<div className="flex justify-end -mt-1 -mr-1 mb-1">
							<Button
								variant="ghost"
								size="touch-icon"
								onClick={handleCloseDetail}
								aria-label={t("detail.close")}
							>
								<X aria-hidden />
							</Button>
						</div>
						<TimarDetail
							appointment={selected}
							onMaterialized={(row) => setSelected(row)}
						/>
					</aside>
				) : null}
			</div>

			<AppointmentForm open={createOpen} onOpenChange={setCreateOpen} />

			{/* Quiet link to recurring-series management */}
			<div className="flex justify-end pt-2">
				<Link
					href="/timar/reglulegir"
					className="text-sm text-ink-soft hover:text-ink"
				>
					{t("calendar.recurringLink")}
				</Link>
			</div>
		</div>
	);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ViewToggle({
	view,
	onChange,
}: {
	view: ViewMode;
	onChange: (v: ViewMode) => void;
}) {
	const t = useTranslations("timar.view");
	return (
		<div
			role="radiogroup"
			aria-label={t("toggleLabel")}
			className="inline-flex rounded-lg bg-paper-deep p-1"
		>
			{(["month", "week", "list"] as const).map((key) => (
				// biome-ignore lint/a11y/useSemanticElements: segmented-toggle pattern — button with role=radio keeps the shared visual surface
				<button
					key={key}
					type="button"
					role="radio"
					aria-checked={view === key}
					onClick={() => onChange(key)}
					className={cn(
						"min-h-12 px-3 rounded-md text-sm font-medium transition-colors",
						view === key
							? "bg-paper text-ink-soft shadow-sm"
							: "text-ink-soft hover:text-ink",
					)}
				>
					{t(key)}
				</button>
			))}
		</div>
	);
}
