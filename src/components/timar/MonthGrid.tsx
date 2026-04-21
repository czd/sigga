"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Repeat } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import { APP_TIME_ZONE } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RangeRow = FunctionReturnType<
	typeof api.appointments.byRange
>[number];

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
	activeId?: string | null;
	onSelect: (appointment: RangeRow) => void;
	/** When true, the calendar area is constrained (detail pane is open). */
	compact?: boolean;
};

export function MonthGrid({
	monthStartMs,
	activeId,
	onSelect,
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

	const weekdayFmt = new Intl.DateTimeFormat(locale, {
		weekday: "short",
		timeZone: APP_TIME_ZONE,
	});
	const timeFmt = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: APP_TIME_ZONE,
	});

	const weeksToRender = useMemo(() => {
		const lastWeekStart = new Date(gridStart.getTime() + 35 * DAY_MS);
		return lastWeekStart.getUTCMonth() === currentMonth ? 6 : 5;
	}, [gridStart, currentMonth]);

	const byDayKey = useMemo(() => {
		const map = new Map<string, RangeRow[]>();
		for (const a of appointments ?? []) {
			const d = new Date(a.startTime);
			const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
			const list = map.get(key) ?? [];
			list.push(a);
			map.set(key, list);
		}
		return map;
	}, [appointments]);

	const maxPills = compact ? 3 : 4;

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
						className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft px-2 py-2"
					>
						{label}
					</div>
				))}
			</div>
			<div
				className="grid grid-cols-7 gap-px rounded-xl overflow-hidden ring-1 ring-divider"
				style={{
					gridTemplateRows: `repeat(${weeksToRender}, minmax(8rem, 1fr))`,
				}}
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
								"flex flex-col gap-1 p-2 min-w-0",
								inMonth ? "bg-paper" : "bg-paper/40",
							)}
						>
							<div
								className={cn(
									"flex items-center justify-end h-6 px-1",
									isToday
										? "text-sage-shadow font-semibold"
										: inMonth
											? "text-ink-soft"
											: "text-ink-soft",
								)}
							>
								<span
									className={cn(
										"text-sm tabular-nums font-medium",
										isToday &&
											"inline-flex items-center justify-center rounded-full bg-sage/30 size-6",
									)}
								>
									{cellDate.getUTCDate()}
								</span>
							</div>
							<ul className="flex flex-col gap-0.5 text-sm leading-tight min-w-0">
								{dayAppts.slice(0, maxPills).map((a) => {
									const active = a._id === activeId;
									return (
										<li key={a._id}>
											<button
												type="button"
												onClick={() => onSelect(a)}
												className={cn(
													"flex items-center gap-1 w-full text-left rounded px-1.5 py-1 truncate transition-colors",
													active
														? "bg-sage-deep text-paper"
														: a.driver
															? "bg-sage/25 text-sage-shadow hover:bg-sage/35"
															: "bg-amber-bg-1 text-amber-ink-deep hover:bg-amber-bg-2",
												)}
											>
												{a.virtual ? (
													<Repeat
														aria-hidden
														className="shrink-0 size-3 opacity-70"
													/>
												) : null}
												<span className="tabular-nums shrink-0">
													{timeFmt.format(new Date(a.startTime))}
												</span>
												<span className="truncate">{a.title}</span>
											</button>
										</li>
									);
								})}
								{overflow > 0 ? (
									<li className="px-1.5 text-xs text-ink-soft">
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
