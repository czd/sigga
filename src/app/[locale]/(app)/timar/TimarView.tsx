"use client";

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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

export function TimarView() {
	const t = useTranslations("timar");
	const [createOpen, setCreateOpen] = useState(false);
	const searchParams = useSearchParams();
	const router = useRouter();

	const activeId = searchParams.get("id") as Id<"appointments"> | null;
	const view = (searchParams.get("view") as "week" | "list" | null) ?? "week";

	// Week offset relative to the current week; 0 = this week, -1 = last, 1 = next
	const [weekOffset, setWeekOffset] = useState(0);
	const weekStartMs = startOfWeek(new Date()).getTime() + weekOffset * WEEK_MS;

	const updateQuery = useCallback(
		(patch: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParams.toString());
			for (const [k, v] of Object.entries(patch)) {
				if (v === null) next.delete(k);
				else next.set(k, v);
			}
			const qs = next.toString();
			router.replace(qs ? `?${qs}` : "?", { scroll: false });
		},
		[router, searchParams],
	);

	const handleSelect = (id: Id<"appointments">) => {
		updateQuery({ id });
	};

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
				<ViewToggle
					view={view}
					onChange={(v) => updateQuery({ view: v === "week" ? null : v })}
				/>
			</div>
			{activeId ? (
				<TimarDetail id={activeId} onClose={() => updateQuery({ id: null })} />
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
