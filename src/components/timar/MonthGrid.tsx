"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the ISO week (Monday) containing `d`, in UTC. */
function startOfWeek(d: Date): Date {
	const day = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
	const dow = day.getUTCDay();
	const offset = dow === 0 ? -6 : 1 - dow;
	day.setUTCDate(day.getUTCDate() + offset);
	return day;
}

function isSameUTCDay(a: Date, b: Date): boolean {
	return (
		a.getUTCFullYear() === b.getUTCFullYear() &&
		a.getUTCMonth() === b.getUTCMonth() &&
		a.getUTCDate() === b.getUTCDate()
	);
}

type Props = {
	/** First UTC millisecond of the month being displayed. */
	monthStartMs: number;
	activeId?: Id<"appointments"> | null;
	onSelectAppointment: (id: Id<"appointments">) => void;
	/** When true, the calendar area is constrained (detail pane is open). */
	compact?: boolean;
};

export function MonthGrid({
	monthStartMs,
	activeId,
	onSelectAppointment,
	compact,
}: Props) {
	const locale = useLocale();
	const t = useTranslations("timar.monthGrid");

	const monthStart = new Date(monthStartMs);
	const gridStart = startOfWeek(monthStart);
	// Six weeks covers every possible month alignment.
	const gridEndExclusive = new Date(gridStart.getTime() + 42 * DAY_MS);

	const appointments = useQuery(api.appointments.byRange, {
		startMs: gridStart.getTime(),
		endMs: gridEndExclusive.getTime(),
	});

	const now = new Date();
	const currentMonth = monthStart.getUTCMonth();

	const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
	const timeFmt = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	/** Whether to render 5 or 6 weeks. If the 6th week is entirely in the next
	 * month we skip it to keep the grid tighter. */
	const weeksToRender = useMemo(() => {
		const lastWeekStart = new Date(gridStart.getTime() + 35 * DAY_MS);
		return lastWeekStart.getUTCMonth() === currentMonth ? 6 : 5;
	}, [gridStart, currentMonth]);

	// Group appointments by YYYY-MM-DD key for fast lookup
	const byDayKey = useMemo(() => {
		const map = new Map<string, typeof appointments>();
		for (const a of appointments ?? []) {
			const d = new Date(a.startTime);
			const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
			const list = map.get(key) ?? [];
			list.push(a);
			map.set(key, list);
		}
		return map;
	}, [appointments]);

	const maxPills = compact ? 2 : 3;

	// Weekday header — Monday first to match startOfWeek.
	const weekdayHeaders = Array.from({ length: 7 }).map((_, i) => {
		const d = new Date(gridStart.getTime() + i * DAY_MS);
		return weekdayFmt.format(d).replace(/\.$/, "");
	});

	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-7 gap-px">
				{weekdayHeaders.map((label) => (
					<div
						key={`wd-${label}`}
						className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-faint px-2 py-1.5"
					>
						{label}
					</div>
				))}
			</div>
			<div
				className="grid grid-cols-7 grid-rows-[repeat(var(--rows),_minmax(0,1fr))] gap-px rounded-xl overflow-hidden ring-1 ring-divider"
				style={
					{
						"--rows": weeksToRender,
						gridTemplateRows: `repeat(${weeksToRender}, minmax(6rem, 1fr))`,
					} as React.CSSProperties
				}
			>
				{Array.from({ length: weeksToRender * 7 }).map((_, cellIdx) => {
					const cellDate = new Date(gridStart.getTime() + cellIdx * DAY_MS);
					const inMonth = cellDate.getUTCMonth() === currentMonth;
					const isToday = isSameUTCDay(cellDate, now);
					const dayKey = `${cellDate.getUTCFullYear()}-${cellDate.getUTCMonth()}-${cellDate.getUTCDate()}`;
					const dayAppts = byDayKey.get(dayKey) ?? [];
					const overflow = Math.max(0, dayAppts.length - maxPills);
					return (
						<div
							key={cellDate.toISOString()}
							className={cn(
								"flex flex-col gap-1 p-1.5 min-h-0",
								inMonth ? "bg-paper" : "bg-paper/40",
							)}
						>
							<div
								className={cn(
									"flex items-center justify-end h-5 px-1",
									isToday
										? "text-sage-shadow font-semibold"
										: inMonth
											? "text-ink-soft"
											: "text-ink-faint",
								)}
							>
								<span
									className={cn(
										"text-xs tabular-nums",
										isToday &&
											"inline-flex items-center justify-center rounded-full bg-sage/30 size-5",
									)}
								>
									{cellDate.getUTCDate()}
								</span>
							</div>
							<ul className="flex flex-col gap-0.5 text-[0.7rem] leading-tight min-h-0">
								{dayAppts.slice(0, maxPills).map((a) => {
									const active = a._id === activeId;
									return (
										<li key={a._id}>
											<button
												type="button"
												onClick={() => onSelectAppointment(a._id)}
												className={cn(
													"block w-full text-left rounded px-1.5 py-0.5 truncate transition-colors",
													active
														? "bg-sage-deep text-paper"
														: a.driver
															? "bg-paper-deep text-ink hover:bg-paper-deep/80"
															: "bg-amber-bg-1 text-amber-ink-deep hover:bg-amber-bg-2",
												)}
											>
												<span className="tabular-nums">
													{timeFmt.format(new Date(a.startTime))}
												</span>{" "}
												<span className="truncate">{a.title}</span>
											</button>
										</li>
									);
								})}
								{overflow > 0 ? (
									<li className="px-1.5 text-ink-faint">
										{t("more", { count: overflow })}
									</li>
								) : null}
							</ul>
						</div>
					);
				})}
			</div>
		</div>
	);
}
