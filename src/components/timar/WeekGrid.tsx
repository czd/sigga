"use client";

import { useQuery } from "convex/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfWeek(now: Date): Date {
	const d = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
	const dow = d.getUTCDay();
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

type Props = {
	weekStartMs: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	activeId?: Id<"appointments"> | null;
	onSelect: (id: Id<"appointments">) => void;
};

export function WeekGrid({
	weekStartMs,
	onPrevWeek,
	onNextWeek,
	activeId,
	onSelect,
}: Props) {
	const locale = useLocale();
	const t = useTranslations("timar.weekGrid");
	const appointments = useQuery(api.appointments.byWeek, { weekStartMs });
	const now = new Date();

	const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
	const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric" });
	const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
	const timeFmt = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const weekStart = new Date(weekStartMs);
	const weekEnd = new Date(weekStartMs + 6 * DAY_MS);
	const dateRange = `${dayFmt.format(weekStart)}.–${dayFmt.format(weekEnd)}. ${monthFmt.format(weekEnd).replace(/\.$/, "")}`;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<Button
					variant="ghost"
					size="touch-icon"
					onClick={onPrevWeek}
					aria-label={t("prev")}
				>
					<ChevronLeft aria-hidden />
				</Button>
				<div className="font-serif text-lg text-ink">{dateRange}</div>
				<Button
					variant="ghost"
					size="touch-icon"
					onClick={onNextWeek}
					aria-label={t("next")}
				>
					<ChevronRight aria-hidden />
				</Button>
			</div>

			<div className="grid grid-cols-7 gap-2">
				{Array.from({ length: 7 }).map((_, i) => {
					const cellDate = new Date(weekStartMs + i * DAY_MS);
					const isToday = isSameUTCDay(cellDate, now);
					const dayAppts = (appointments ?? [])
						.filter((a) => isSameUTCDay(new Date(a.startTime), cellDate))
						.sort((a, b) => a.startTime - b.startTime);
					return (
						<div
							key={cellDate.toISOString()}
							className={cn(
								"flex flex-col gap-2 p-3 rounded-xl min-h-48",
								isToday ? "bg-paper ring-1 ring-sage/30" : "bg-paper/60",
							)}
						>
							<div className="flex items-baseline gap-2">
								<div
									className={cn(
										"text-[0.7rem] font-semibold uppercase tracking-[0.1em]",
										isToday ? "text-sage-shadow" : "text-ink-faint",
									)}
								>
									{weekdayFmt.format(cellDate).replace(/\.$/, "")}
								</div>
								<div
									className={cn(
										"font-serif text-xl leading-none",
										isToday ? "text-ink" : "text-ink-soft",
									)}
								>
									{cellDate.getUTCDate()}
								</div>
							</div>
							<div className="flex flex-col gap-2 text-sm">
								{dayAppts.map((a) => {
									const active = a._id === activeId;
									return (
										<button
											key={a._id}
											type="button"
											onClick={() => onSelect(a._id)}
											className={cn(
												"text-left rounded-lg p-2 bg-paper transition-colors",
												active
													? "ring-2 ring-sage-deep"
													: "ring-1 ring-foreground/10 hover:ring-foreground/20",
											)}
										>
											<div className="text-xs text-ink-soft font-medium">
												{timeFmt.format(new Date(a.startTime))}
											</div>
											<div className="text-sm text-ink truncate mt-0.5">
												{a.title}
											</div>
											<div className="mt-1">
												{a.driver ? (
													<UserAvatar
														name={a.driver.name}
														email={a.driver.email}
														imageUrl={a.driver.image}
														className="size-5 text-[0.55rem]"
													/>
												) : (
													<span
														className="inline-block size-2 rounded-full bg-amber-ink"
														aria-hidden
													/>
												)}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>

			{appointments && appointments.length === 0 ? (
				<p className="text-ink-faint text-center py-6">{t("noAppointments")}</p>
			) : null}
		</div>
	);
}
