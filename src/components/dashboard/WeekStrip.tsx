"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Link } from "@/i18n/navigation";
import { APP_TIME_ZONE } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(now: Date): Date {
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

function isoDate(d: Date): string {
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function weekNumber(d: Date): number {
	// ISO week number.
	const t = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
	);
	const day = t.getUTCDay() || 7;
	t.setUTCDate(t.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
	return Math.ceil(((t.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
}

export function WeekStrip() {
	return (
		<ClientOnly
			fallback={
				<section
					aria-labelledby="week-strip-heading"
					className="grid grid-cols-7 gap-2 min-h-32"
					aria-hidden
				/>
			}
		>
			<WeekStripContent />
		</ClientOnly>
	);
}

function WeekStripContent() {
	const locale = useLocale();
	const t = useTranslations("dashboard.weekStrip");
	const now = new Date();
	const weekStart = startOfWeek(now);
	const appointments = useQuery(api.appointments.byWeek, {
		weekStartMs: weekStart.getTime(),
	});

	const weekdayFmt = new Intl.DateTimeFormat(locale, {
		weekday: "short",
		timeZone: APP_TIME_ZONE,
	});
	const dayFmt = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		timeZone: APP_TIME_ZONE,
	});
	const monthFmt = new Intl.DateTimeFormat(locale, {
		month: "short",
		timeZone: APP_TIME_ZONE,
	});
	const timeFmt = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: APP_TIME_ZONE,
	});

	const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
	const dateRange = `${dayFmt.format(weekStart)}.–${dayFmt.format(weekEnd)}. ${monthFmt.format(weekEnd).replace(/\.$/, "")}`;
	const weekLabel = t("title", { week: weekNumber(weekStart), dateRange });

	return (
		<section aria-labelledby="week-strip-heading">
			<h3
				id="week-strip-heading"
				className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft mb-3"
			>
				{weekLabel}
			</h3>
			<div className="grid grid-cols-7 gap-2">
				{Array.from({ length: 7 }).map((_, i) => {
					const cellDate = new Date(weekStart.getTime() + i * DAY_MS);
					const isToday = isSameUTCDay(cellDate, now);
					const dayAppts = (appointments ?? [])
						.filter((a) => isSameUTCDay(new Date(a.startTime), cellDate))
						.sort((a, b) => a.startTime - b.startTime);
					return (
						<Link
							key={cellDate.toISOString()}
							href={{
								pathname: "/timar",
								query: { view: "week", day: isoDate(cellDate) },
							}}
							className={cn(
								"flex flex-col gap-2 p-3 rounded-xl min-h-32 transition-colors",
								isToday
									? "bg-paper ring-1 ring-sage/30"
									: "bg-paper/60 hover:bg-paper",
							)}
						>
							<div className="flex items-baseline gap-2">
								<div
									className={cn(
										"text-[0.7rem] font-semibold uppercase tracking-[0.1em]",
										isToday ? "text-sage-shadow" : "text-ink-soft",
									)}
								>
									{weekdayFmt.format(cellDate).replace(/\.$/, "")}
								</div>
								<div
									className={cn(
										"font-serif text-lg leading-none",
										isToday ? "text-ink" : "text-ink-soft",
									)}
								>
									{cellDate.getUTCDate()}
								</div>
							</div>
							<div className="flex flex-col gap-1 text-[0.75rem]">
								{dayAppts.slice(0, 2).map((a) => (
									<AppointmentChip
										key={a._id as Id<"appointments">}
										id={a._id}
										title={a.title}
										startTime={a.startTime}
										driver={a.driver}
										timeFmt={timeFmt}
									/>
								))}
								{dayAppts.length > 2 ? (
									<div className="text-ink-soft">
										{t("more", { count: dayAppts.length - 2 })}
									</div>
								) : null}
							</div>
						</Link>
					);
				})}
			</div>
		</section>
	);
}

type DriverInfo = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
} | null;

function AppointmentChip({
	title,
	startTime,
	driver,
	timeFmt,
}: {
	id: Id<"appointments">;
	title: string;
	startTime: number;
	driver: DriverInfo;
	timeFmt: Intl.DateTimeFormat;
}) {
	return (
		<div className="flex items-start gap-1.5 leading-tight">
			<div className="flex-shrink-0 text-ink-soft font-medium w-10">
				{timeFmt.format(new Date(startTime))}
			</div>
			<div className="flex-1 min-w-0">
				<div className="truncate text-ink">{title}</div>
				<div className="mt-0.5">
					{driver ? (
						<UserAvatar
							name={driver.name}
							email={driver.email}
							imageUrl={driver.image}
							className="size-4 text-[0.5rem]"
						/>
					) : (
						<span
							className="inline-block size-1.5 rounded-full bg-amber-ink"
							aria-hidden
						/>
					)}
				</div>
			</div>
		</div>
	);
}
