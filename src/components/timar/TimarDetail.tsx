"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { DriverPicker } from "@/components/appointments/DriverPicker";
import { Button } from "@/components/ui/button";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

type Props = {
	id: Id<"appointments">;
	onClose?: () => void;
};

export function TimarDetail({ id, onClose }: Props) {
	const t = useTranslations("timar");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const appointment = useQuery(api.appointments.get, { id });
	const update = useMutation(api.appointments.update);
	const [editOpen, setEditOpen] = useState(false);

	if (appointment === undefined) {
		return <p className="text-ink-faint">{tCommon("loading")}</p>;
	}
	if (appointment === null) {
		return <p className="text-ink-faint">{t("detail.noSelection")}</p>;
	}

	const statusLabel =
		appointment.status === "cancelled"
			? tCommon("cancelled") || "cancelled"
			: appointment.status === "completed"
				? tCommon("completed") || "completed"
				: "";

	return (
		<div className="flex flex-col gap-5">
			<header className="flex items-start gap-3">
				<div className="flex-1 min-w-0">
					<div className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
						<CalendarClock size={14} aria-hidden className="inline mr-1" />
						{formatAbsoluteWithTime(appointment.startTime, locale)}
					</div>
					<h2 className="font-serif text-[1.6rem] leading-tight mt-1 text-ink">
						{appointment.title}
					</h2>
					{statusLabel ? (
						<div className="text-sm text-ink-faint mt-1 italic">
							{statusLabel}
						</div>
					) : null}
				</div>
				{onClose ? (
					<Button
						variant="ghost"
						size="touch-icon"
						onClick={onClose}
						aria-label={tCommon("close")}
					>
						<X aria-hidden />
					</Button>
				) : null}
			</header>

			{appointment.location ? (
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint mb-1">
						{t("fields.location")}
					</div>
					<div className="text-base text-ink">{appointment.location}</div>
				</div>
			) : null}

			<div>
				<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint mb-2">
					{t("fields.driver")}
				</div>
				<DriverPicker
					value={appointment.driverId ?? null}
					onChange={async (driverId) => {
						await update({ id: appointment._id, driverId });
					}}
				/>
			</div>

			{appointment.notes ? (
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint mb-1">
						{t("fields.notes")}
					</div>
					<p className="text-base text-ink whitespace-pre-wrap">
						{appointment.notes}
					</p>
				</div>
			) : null}

			<div className="flex items-center gap-2 pt-2">
				<Button variant="ghost" size="touch" onClick={() => setEditOpen(true)}>
					<Pencil aria-hidden />
					<span>{tCommon("edit")}</span>
				</Button>
			</div>

			<AppointmentForm
				open={editOpen}
				onOpenChange={setEditOpen}
				editAppointment={appointment}
			/>
		</div>
	);
}
