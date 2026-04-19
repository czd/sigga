"use client";

import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Link } from "@/i18n/navigation";

type AppointmentWithDriver = FunctionReturnType<
	typeof api.appointments.upcoming
>[number];

const WEEKDAY_FMT: Record<string, Intl.DateTimeFormatOptions> = {
	weekday: { weekday: "short" },
	day: { day: "numeric" },
	month: { month: "short" },
	time: { hour: "2-digit", minute: "2-digit", hour12: false },
};

function useAppointmentDateParts(timestamp: number, locale: string) {
	const d = new Date(timestamp);
	const weekday = new Intl.DateTimeFormat(locale, WEEKDAY_FMT.weekday)
		.format(d)
		.replace(/\.$/, "");
	const day = new Intl.DateTimeFormat(locale, WEEKDAY_FMT.day).format(d);
	const month = new Intl.DateTimeFormat(locale, WEEKDAY_FMT.month)
		.format(d)
		.replace(/\.$/, "");
	const time = new Intl.DateTimeFormat(locale, WEEKDAY_FMT.time).format(d);
	return { weekday, day, month, time };
}

function CancelledRow({ appointment }: { appointment: AppointmentWithDriver }) {
	const t = useTranslations("dashboard.nextAppointments");
	const locale = useLocale();
	const { day, month } = useAppointmentDateParts(appointment.startTime, locale);
	return (
		<p className="py-3 text-sm text-ink-soft italic">
			{t("cancelledLine", {
				day,
				month,
				title: appointment.title,
			})}
		</p>
	);
}

function AppointmentRow({
	appointment,
	onVolunteer,
	pending,
}: {
	appointment: AppointmentWithDriver;
	onVolunteer: (id: Id<"appointments">) => void;
	pending: boolean;
}) {
	const t = useTranslations("dashboard.nextAppointments");
	const locale = useLocale();
	const { weekday, day, time } = useAppointmentDateParts(
		appointment.startTime,
		locale,
	);
	const driverName =
		appointment.driver?.name ?? appointment.driver?.email ?? null;

	return (
		<div className="flex items-start gap-5 py-5">
			<div className="w-14 flex-shrink-0 text-center pt-0.5">
				<div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-soft">
					{weekday}
				</div>
				<div className="font-serif text-[1.75rem] leading-none text-ink mt-1">
					{day}
				</div>
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-sm text-ink-soft">{t("time", { time })}</div>
				<h3 className="font-serif text-lg leading-snug text-ink text-balance mt-0.5">
					{appointment.title}
				</h3>
				<div className="mt-2.5">
					{appointment.driver ? (
						<div className="inline-flex items-center gap-2 text-sm text-ink-soft">
							<UserAvatar
								name={appointment.driver.name}
								email={appointment.driver.email}
								imageUrl={appointment.driver.image}
								className="size-6 text-xs"
							/>
							<span>{t("driving", { name: driverName ?? "" })}</span>
						</div>
					) : (
						<button
							type="button"
							onClick={() => onVolunteer(appointment._id)}
							disabled={pending}
							className="inline-flex items-center gap-2 text-sm font-medium text-amber-ink transition-opacity disabled:opacity-60"
						>
							<span
								className="inline-block size-2 rounded-full"
								style={{ background: "#C9A35C" }}
								aria-hidden
							/>
							{t("noDriver")}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

export function NextAppointments({
	appointments,
}: {
	appointments: AppointmentWithDriver[] | undefined;
}) {
	const t = useTranslations("dashboard.nextAppointments");
	const tCommon = useTranslations("common");
	const volunteer = useMutation(api.appointments.volunteerToDrive);
	const [pendingId, setPendingId] = useState<Id<"appointments"> | null>(null);

	async function handleVolunteer(id: Id<"appointments">) {
		setPendingId(id);
		try {
			await volunteer({ id });
		} finally {
			setPendingId((current) => (current === id ? null : current));
		}
	}

	return (
		<section aria-labelledby="next-appointments-heading">
			<div className="flex items-baseline justify-between gap-3 mb-4">
				<h2
					id="next-appointments-heading"
					className="font-serif text-[1.4rem] text-ink font-normal tracking-tight"
				>
					{t("title")}
				</h2>
				<Link
					href="/timar"
					className="text-sm text-ink-soft hover:text-ink transition-colors"
				>
					{t("seeAll")}
				</Link>
			</div>

			{appointments === undefined ? (
				<p className="text-ink-soft py-2">{tCommon("loading")}</p>
			) : appointments.length === 0 ? (
				<p className="text-ink-soft py-2">{t("empty")}</p>
			) : (
				<ul className="divide-y" style={{ borderColor: "var(--divider)" }}>
					{appointments.map((apt) => (
						<li
							key={apt._id}
							className="border-0"
							style={{ borderTopColor: "var(--divider)" }}
						>
							{apt.status === "cancelled" ? (
								<CancelledRow appointment={apt} />
							) : (
								<AppointmentRow
									appointment={apt}
									onVolunteer={handleVolunteer}
									pending={pendingId === apt._id}
								/>
							)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
