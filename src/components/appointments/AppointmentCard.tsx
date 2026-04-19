"use client";

import { useMutation } from "convex/react";
import { BookOpen, MapPin, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

type AppointmentDoc = Doc<"appointments">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type AppointmentWithDriver = AppointmentDoc & { driver: UserSummary | null };

type AppointmentCardProps = {
	appointment: AppointmentWithDriver;
	variant: "upcoming" | "past";
	onEdit: () => void;
	onLogEntry?: (id: Id<"appointments">) => void;
};

export function AppointmentCard({
	appointment,
	variant,
	onEdit,
	onLogEntry,
}: AppointmentCardProps) {
	const t = useTranslations("timar");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const volunteer = useMutation(api.appointments.volunteerToDrive);
	const [volunteering, setVolunteering] = useState(false);

	async function handleVolunteer() {
		setVolunteering(true);
		try {
			await volunteer({ id: appointment._id });
		} finally {
			setVolunteering(false);
		}
	}

	return (
		<article className="flex flex-col gap-4 rounded-2xl bg-paper px-5 py-5 ring-1 ring-foreground/10">
			<div className="flex items-start gap-3">
				<div className="flex-1 min-w-0">
					<div className="text-sm text-ink-soft">
						{formatAbsoluteWithTime(appointment.startTime, locale)}
					</div>
					<h3 className="mt-0.5 font-serif text-lg leading-snug text-ink">
						{appointment.title}
					</h3>
					{appointment.location ? (
						<div className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-soft">
							<MapPin size={16} aria-hidden />
							<span>{appointment.location}</span>
						</div>
					) : null}
					{appointment.notes ? (
						<p className="mt-2 text-base whitespace-pre-wrap line-clamp-3 text-ink/90">
							{appointment.notes}
						</p>
					) : null}
				</div>
				<Button
					variant="ghost"
					size="touch-icon"
					onClick={onEdit}
					aria-label={tCommon("edit")}
					className="-my-1 -mr-1"
				>
					<Pencil aria-hidden />
				</Button>
			</div>

			<div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
				{appointment.driver ? (
					<div className="flex items-center gap-2 min-w-0">
						<UserAvatar
							name={appointment.driver.name}
							email={appointment.driver.email}
							imageUrl={appointment.driver.image}
							className="size-8"
						/>
						<span className="text-base text-ink-soft truncate">
							{appointment.driver.name ??
								appointment.driver.email ??
								t("fields.driver")}
						</span>
					</div>
				) : variant === "upcoming" ? (
					<>
						<span className="text-base text-ink-soft">
							{t("fields.noDriverAssigned")}
						</span>
						<Button
							size="touch"
							onClick={handleVolunteer}
							disabled={volunteering}
						>
							{t("volunteer")}
						</Button>
					</>
				) : (
					<span className="text-base text-ink-soft">
						{t("fields.noDriverAssigned")}
					</span>
				)}

				{variant === "past" && onLogEntry ? (
					<Button
						variant="outline"
						size="touch"
						onClick={() => onLogEntry(appointment._id)}
					>
						<BookOpen aria-hidden />
						<span>{t("logEntry")}</span>
					</Button>
				) : null}
			</div>
		</article>
	);
}
