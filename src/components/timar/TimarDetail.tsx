"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Pencil, Repeat, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { DriverPicker } from "@/components/appointments/DriverPicker";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatAbsoluteWithTime } from "@/lib/formatDate";
import type { RangeRow } from "./MonthGrid";

type Props = {
	appointment: RangeRow;
	/**
	 * Called after a virtual occurrence was materialized into a real row.
	 * Parent should swap its selected-state to the real row so subsequent
	 * interactions (edit, cancel, rendering) have the real id.
	 */
	onMaterialized?: (row: RangeRow) => void;
};

export function TimarDetail({ appointment, onMaterialized }: Props) {
	const t = useTranslations("timar");
	const tCommon = useTranslations("common");
	const tDriving = useTranslations("driving.confirm");
	const locale = useLocale();
	const update = useMutation(api.appointments.update);
	const materialize = useMutation(api.appointments.materializeOccurrence);
	const me = useQuery(api.users.me);
	const users = useQuery(api.users.list);
	const [editOpen, setEditOpen] = useState(false);
	const [pending, setPending] = useState(false);
	const [pendingDriverId, setPendingDriverId] = useState<Id<"users"> | null>(
		null,
	);

	const isVirtual = appointment.virtual;

	async function realize(): Promise<Id<"appointments"> | null> {
		if (!isVirtual) return appointment._id as Id<"appointments">;
		if (!appointment.seriesId) return null;
		const newId = await materialize({
			seriesId: appointment.seriesId,
			startTimeMs: appointment.startTime,
		});
		// Tell the parent to swap to the materialized row. Construct a synthetic
		// RangeRow for the new real appointment so the UI updates immediately;
		// the next Convex tick will deliver the authoritative row.
		onMaterialized?.({
			...appointment,
			_id: newId,
			virtual: false,
		});
		return newId;
	}

	async function commitDriverChange(driverId: Id<"users"> | null) {
		setPending(true);
		try {
			const id = await realize();
			if (!id) return;
			await update({ id, driverId });
		} finally {
			setPending(false);
		}
	}

	function handleDriverChange(driverId: Id<"users"> | null) {
		// Unassign is not a commit — apply directly. Assign (self or other) gates
		// through ConfirmDialog per Pattern 19.
		if (driverId === null) {
			void commitDriverChange(null);
			return;
		}
		setPendingDriverId(driverId);
	}

	const pendingDriverName = pendingDriverId
		? (users?.find((u) => u._id === pendingDriverId)?.name ??
			users?.find((u) => u._id === pendingDriverId)?.email ??
			"")
		: "";
	const isSelfAssign = pendingDriverId !== null && pendingDriverId === me?._id;

	async function handleCancel() {
		setPending(true);
		try {
			const id = await realize();
			if (!id) return;
			await update({ id, status: "cancelled" });
		} finally {
			setPending(false);
		}
	}

	async function handleEdit() {
		// Ensure the appointment is real before opening the edit sheet.
		if (isVirtual) {
			await realize();
			// Give the Convex tick a beat to deliver the real row; parent will
			// swap selected and the next render will have a real _id.
		}
		setEditOpen(true);
	}

	// AppointmentForm's edit path reads only fields present on RangeRow; the
	// other Doc fields (_creationTime, createdBy/updatedBy, updatedAt) are not
	// read during edit. Safe to cast for the form's purposes.
	const editTarget = isVirtual
		? null
		: ({
				_id: appointment._id as Id<"appointments">,
				title: appointment.title,
				startTime: appointment.startTime,
				endTime: appointment.endTime ?? undefined,
				location: appointment.location ?? undefined,
				notes: appointment.notes ?? undefined,
				driverId: appointment.driverId ?? undefined,
				status: appointment.status,
				seriesId: appointment.seriesId ?? undefined,
			} as unknown as Doc<"appointments">);

	return (
		<div className="flex flex-col gap-5">
			<header>
				<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
					<CalendarClock size={14} aria-hidden />
					<span>{formatAbsoluteWithTime(appointment.startTime, locale)}</span>
					{isVirtual ? (
						<span
							className="inline-flex items-center gap-1 rounded-full bg-paper-deep px-2 py-0.5 text-[0.65rem] text-ink-soft normal-case tracking-normal"
							title={t("detail.virtualHint")}
						>
							<Repeat aria-hidden size={11} />
							{t("detail.recurring")}
						</span>
					) : null}
				</div>
				<h2 className="font-serif text-[1.6rem] leading-tight mt-1 text-ink">
					{appointment.title}
				</h2>
				{appointment.status === "cancelled" ? (
					<div className="text-sm text-ink-soft mt-1 italic">
						{t("detail.cancelledStatus")}
					</div>
				) : null}
			</header>

			{appointment.location ? (
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-1">
						{t("fields.location")}
					</div>
					<div className="text-base text-ink">{appointment.location}</div>
				</div>
			) : null}

			<div>
				<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-2">
					{t("fields.driver")}
				</div>
				<DriverPicker
					value={appointment.driverId ?? null}
					onChange={handleDriverChange}
					disabled={pending}
				/>
			</div>

			{appointment.notes ? (
				<div>
					<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft mb-1">
						{t("fields.notes")}
					</div>
					<p className="text-base text-ink whitespace-pre-wrap">
						{appointment.notes}
					</p>
				</div>
			) : null}

			<div className="flex items-center gap-2 pt-2 flex-wrap">
				<Button
					variant="ghost"
					size="touch"
					onClick={handleEdit}
					disabled={pending}
				>
					<Pencil aria-hidden />
					<span>{tCommon("edit")}</span>
				</Button>
				{appointment.status === "upcoming" ? (
					<Button
						variant="ghost"
						size="touch"
						onClick={handleCancel}
						disabled={pending}
						className="text-destructive"
					>
						<Trash2 aria-hidden />
						<span>{t("detail.cancel")}</span>
					</Button>
				) : null}
			</div>

			{editTarget ? (
				<AppointmentForm
					open={editOpen}
					onOpenChange={setEditOpen}
					editAppointment={editTarget}
				/>
			) : null}
			<ConfirmDialog
				open={pendingDriverId !== null}
				onOpenChange={(next) => {
					if (!next) setPendingDriverId(null);
				}}
				title={
					isSelfAssign
						? tDriving("title")
						: tDriving("assignOtherTitle", { name: pendingDriverName })
				}
				body={
					isSelfAssign
						? tDriving("body", {
								title: appointment.title,
								when: formatAbsoluteWithTime(appointment.startTime, locale),
							})
						: tDriving("assignOtherBody", {
								name: pendingDriverName,
								title: appointment.title,
								when: formatAbsoluteWithTime(appointment.startTime, locale),
							})
				}
				confirmLabel={
					isSelfAssign
						? tDriving("action")
						: tDriving("assignOtherAction", { name: pendingDriverName })
				}
				onConfirm={async () => {
					const id = pendingDriverId;
					setPendingDriverId(null);
					await commitDriverChange(id);
				}}
			/>
		</div>
	);
}
