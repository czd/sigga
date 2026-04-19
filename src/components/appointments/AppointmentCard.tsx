"use client";

import { useMutation } from "convex/react";
import { BookOpen, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
	const tDriving = useTranslations("driving.confirm");
	const locale = useLocale();
	const volunteer = useMutation(api.appointments.volunteerToDrive);
	const [confirmOpen, setConfirmOpen] = useState(false);

	async function handleConfirm() {
		await volunteer({ id: appointment._id });
	}

	return (
		<article className="flex flex-col gap-4 rounded-2xl bg-paper px-5 py-5 ring-1 ring-foreground/10">
			<button
				type="button"
				onClick={onEdit}
				aria-label={tCommon("edit")}
				className="-mx-2 -mt-2 rounded-lg px-2 pt-2 pb-1 text-left outline-none transition-colors hover:bg-paper-deep/40 focus-visible:ring-3 focus-visible:ring-ring"
			>
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
			</button>

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
						<Button size="touch" onClick={() => setConfirmOpen(true)}>
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
			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={tDriving("title")}
				body={tDriving("body", {
					title: appointment.title,
					when: formatAbsoluteWithTime(appointment.startTime, locale),
				})}
				confirmLabel={tDriving("action")}
				onConfirm={handleConfirm}
			/>
		</article>
	);
}
