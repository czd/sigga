"use client";

import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

type DrivingCandidate = {
	_id: Id<"appointments">;
	title: string;
	startTime: number;
	location?: string;
};

export function DrivingCta({ appointment }: { appointment: DrivingCandidate }) {
	const t = useTranslations("dashboard.drivingCta");
	const tDriving = useTranslations("driving.confirm");
	const locale = useLocale();
	const volunteer = useMutation(api.appointments.volunteerToDrive);
	const [confirmOpen, setConfirmOpen] = useState(false);

	async function handleConfirm() {
		await volunteer({ id: appointment._id });
	}

	return (
		<section
			aria-label={t("eyebrow")}
			className="relative overflow-hidden rounded-[28px] px-6 pt-6 pb-6 text-paper shadow-[0_10px_30px_-12px_rgba(79,98,67,0.4)]"
			style={{
				background:
					"linear-gradient(160deg, var(--sage) 0%, var(--sage-deep) 60%, var(--sage-shadow) 100%)",
			}}
		>
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background:
						"radial-gradient(ellipse at 20% 0%, rgba(255,255,255,0.22), transparent 60%)",
				}}
				aria-hidden
			/>
			<div className="relative flex flex-col gap-3">
				<div className="text-xs font-semibold uppercase tracking-[0.16em] text-paper/75">
					{t("eyebrow")}
				</div>
				<div className="font-serif text-[1.65rem] leading-[1.2] font-normal text-balance text-paper">
					{appointment.title}
				</div>
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-paper/90">
					<span>{formatAbsoluteWithTime(appointment.startTime, locale)}</span>
					{appointment.location ? (
						<>
							<span className="opacity-60" aria-hidden>
								·
							</span>
							<span>{appointment.location}</span>
						</>
					) : null}
				</div>
				<button
					type="button"
					onClick={() => setConfirmOpen(true)}
					className="mt-3 w-full rounded-full bg-paper px-5 py-3.5 text-base font-semibold text-sage-shadow shadow-[0_2px_0_rgba(79,98,67,0.35)] transition-opacity"
				>
					{t("volunteer")}
				</button>
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
		</section>
	);
}
