"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(now: Date): Date {
	// Monday as start of week. Iceland has no DST so UTC math is safe.
	const d = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
	const dow = d.getUTCDay(); // 0 = Sun, 1 = Mon, ...
	const offset = dow === 0 ? -6 : 1 - dow;
	d.setUTCDate(d.getUTCDate() + offset);
	return d;
}

function isSameUTCDay(a: Date, b: Date): boolean {
	return (
		a.getUTCFullYear() === b.getUTCFullYear() &&
		a.getUTCMonth() === b.getUTCMonth() &&
		a.getUTCDate() === b.getUTCDate()
	);
}

function isoDate(d: Date): string {
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function SidebarWeekCalendar() {
	const locale = useLocale();
	const t = useTranslations("nav.miniCal");
	const now = new Date();
	const weekStart = startOfWeek(now);
	const appointments = useQuery(api.appointments.byWeek, {
		weekStartMs: weekStart.getTime(),
	});

	const weekdayFormatter = new Intl.DateTimeFormat(locale, {
		weekday: "narrow",
	});
	const fullDateFormatter = new Intl.DateTimeFormat(locale, {
		weekday: "long",
		day: "numeric",
		month: "long",
	});

	return (
		<div className="px-4 pb-4 pt-4 border-t border-divider mt-4">
			<div className="grid grid-cols-7 gap-1">
				{Array.from({ length: 7 }).map((_, i) => {
					const cellDate = new Date(weekStart.getTime() + i * DAY_MS);
					const isToday = isSameUTCDay(cellDate, now);
					const dayAppts = (appointments ?? []).filter((a) => {
						const d = new Date(a.startTime);
						return isSameUTCDay(d, cellDate);
					});
					const aria = isToday
						? `${fullDateFormatter.format(cellDate)}, ${t("today")}`
						: fullDateFormatter.format(cellDate);
					return (
						<Link
							key={cellDate.toISOString()}
							href={{
								pathname: "/timar",
								query: { view: "week", day: isoDate(cellDate) },
							}}
							aria-label={aria}
							className={cn(
								"flex flex-col items-center justify-center h-10 rounded-lg transition-colors text-[0.65rem]",
								isToday
									? "bg-paper text-sage-shadow font-semibold"
									: "text-ink-faint hover:bg-paper/60",
							)}
						>
							<span className="text-[0.6rem] leading-none opacity-70">
								{weekdayFormatter.format(cellDate)}
							</span>
							<span className="text-xs leading-none mt-0.5">
								{cellDate.getUTCDate()}
							</span>
							{dayAppts.length > 0 ? (
								<span
									className="size-1 rounded-full bg-sage-deep mt-0.5"
									aria-hidden
								/>
							) : (
								<span className="size-1 mt-0.5" aria-hidden />
							)}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
