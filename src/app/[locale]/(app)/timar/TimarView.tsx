"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { PaneLayout } from "@/components/layout/PaneLayout";
import { SeriesEntryRow } from "@/components/timar/SeriesEntryRow";
import { TimarDetail } from "@/components/timar/TimarDetail";
import { startOfWeek, WeekGrid } from "@/components/timar/WeekGrid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function updateSearchParams(patch: Record<string, string | null>) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	for (const [k, v] of Object.entries(patch)) {
		if (v === null) url.searchParams.delete(k);
		else url.searchParams.set(k, v);
	}
	window.history.replaceState(null, "", url.toString());
}

export function TimarView() {
	const t = useTranslations("timar");
	const [createOpen, setCreateOpen] = useState(false);
	const searchParams = useSearchParams();

	// URL is read once for initial state (deep-link-friendly) and updated via
	// native history on each change, so clicks stay local and don't trigger
	// Next's RSC refresh.
	const [activeId, setActiveId] = useState<Id<"appointments"> | null>(
		(searchParams.get("id") as Id<"appointments"> | null) ?? null,
	);
	const [view, setView] = useState<"week" | "list">(
		(searchParams.get("view") as "week" | "list" | null) ?? "week",
	);

	// Week offset relative to the current week; 0 = this week, -1 = last, 1 = next
	const [weekOffset, setWeekOffset] = useState(0);
	const weekStartMs = startOfWeek(new Date()).getTime() + weekOffset * WEEK_MS;

	const handleSelect = useCallback((id: Id<"appointments">) => {
		setActiveId(id);
		updateSearchParams({ id });
	}, []);

	const handleCloseDetail = useCallback(() => {
		setActiveId(null);
		updateSearchParams({ id: null });
	}, []);

	const handleViewChange = useCallback((next: "week" | "list") => {
		setView(next);
		updateSearchParams({ view: next === "week" ? null : next });
	}, []);

	const listPane = (
		<div className="px-4 py-6 pb-28 xl:px-6 xl:pb-8 flex flex-col gap-6">
			<h2 className="text-3xl font-semibold">{t("title")}</h2>
			<SeriesEntryRow />
			<Button
				size="touch"
				onClick={() => setCreateOpen(true)}
				className="w-full"
			>
				<Plus aria-hidden />
				<span>{t("new")}</span>
			</Button>
			<AppointmentList />
		</div>
	);

	const detailPane = (
		<div className="xl:px-8 xl:py-8 flex flex-col gap-6">
			<div className="flex items-center justify-end gap-2">
				<ViewToggle view={view} onChange={handleViewChange} />
			</div>
			{activeId ? (
				<TimarDetail id={activeId} onClose={handleCloseDetail} />
			) : view === "week" ? (
				<WeekGrid
					weekStartMs={weekStartMs}
					onPrevWeek={() => setWeekOffset((n) => n - 1)}
					onNextWeek={() => setWeekOffset((n) => n + 1)}
					activeId={activeId}
					onSelect={handleSelect}
				/>
			) : (
				<p className="text-ink-faint">{t("detail.noSelection")}</p>
			)}
		</div>
	);

	return (
		<>
			<PaneLayout list={listPane} detail={detailPane} />
			<AppointmentForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}

function ViewToggle({
	view,
	onChange,
}: {
	view: "week" | "list";
	onChange: (v: "week" | "list") => void;
}) {
	const t = useTranslations("timar.view");
	return (
		<div
			role="tablist"
			aria-label="view"
			className="inline-flex rounded-lg bg-paper-deep p-1"
		>
			{(["week", "list"] as const).map((key) => (
				<button
					key={key}
					type="button"
					role="tab"
					aria-selected={view === key}
					onClick={() => onChange(key)}
					className={cn(
						"min-h-9 px-4 rounded-md text-sm font-medium transition-colors",
						view === key
							? "bg-paper text-ink-soft shadow-sm"
							: "text-ink-faint",
					)}
				>
					{t(key)}
				</button>
			))}
		</div>
	);
}
