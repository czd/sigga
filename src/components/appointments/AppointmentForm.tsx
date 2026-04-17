"use client";

import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DriverPicker } from "./DriverPicker";

type AppointmentDoc = Doc<"appointments">;

type AppointmentFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editAppointment?: AppointmentDoc | null;
};

function toDatetimeLocal(ts: number | null): string {
	if (ts === null) return "";
	const d = new Date(ts);
	const pad = (n: number) => String(n).padStart(2, "0");
	const year = d.getFullYear();
	const month = pad(d.getMonth() + 1);
	const day = pad(d.getDate());
	const hours = pad(d.getHours());
	const minutes = pad(d.getMinutes());
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDatetimeLocal(value: string): number | null {
	if (!value) return null;
	const ts = new Date(value).getTime();
	return Number.isNaN(ts) ? null : ts;
}

export function AppointmentForm({
	open,
	onOpenChange,
	editAppointment,
}: AppointmentFormProps) {
	const t = useTranslations("timar");
	const tCommon = useTranslations("common");
	const create = useMutation(api.appointments.create);
	const update = useMutation(api.appointments.update);
	const remove = useMutation(api.appointments.remove);

	const [title, setTitle] = useState("");
	const [startTime, setStartTime] = useState("");
	const [location, setLocation] = useState("");
	const [notes, setNotes] = useState("");
	const [driverId, setDriverId] = useState<Id<"users"> | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setConfirmDelete(false);
		if (editAppointment) {
			setTitle(editAppointment.title);
			setStartTime(toDatetimeLocal(editAppointment.startTime));
			setLocation(editAppointment.location ?? "");
			setNotes(editAppointment.notes ?? "");
			setDriverId(editAppointment.driverId ?? null);
		} else {
			setTitle("");
			setStartTime("");
			setLocation("");
			setNotes("");
			setDriverId(null);
		}
	}, [open, editAppointment]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) {
			setError(t("errors.titleRequired"));
			return;
		}
		const ts = fromDatetimeLocal(startTime);
		if (ts === null) {
			setError(t("errors.startTimeRequired"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (editAppointment) {
				await update({
					id: editAppointment._id,
					title: trimmedTitle,
					startTime: ts,
					location: location.trim() || null,
					notes: notes.trim() || null,
					driverId: driverId ?? null,
				});
			} else {
				await create({
					title: trimmedTitle,
					startTime: ts,
					location: location.trim() || undefined,
					notes: notes.trim() || undefined,
					driverId: driverId ?? undefined,
				});
			}
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!editAppointment) return;
		setSaving(true);
		try {
			await remove({ id: editAppointment._id });
			setConfirmDelete(false);
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
		} finally {
			setSaving(false);
		}
	}

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent
					side="bottom"
					className="max-h-[95vh] overflow-y-auto rounded-t-2xl"
					showCloseButton={false}
				>
					<form
						onSubmit={handleSubmit}
						className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
					>
						<SheetHeader className="p-0">
							<SheetTitle className="text-xl font-semibold">
								{editAppointment ? t("editTitle") : t("createTitle")}
							</SheetTitle>
							<SheetDescription className="sr-only">
								{editAppointment ? t("editTitle") : t("createTitle")}
							</SheetDescription>
						</SheetHeader>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="appointment-title"
								className="text-base font-medium"
							>
								{t("fields.title")}
							</Label>
							<Input
								id="appointment-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="h-12 text-base"
								required
								autoFocus
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="appointment-start"
								className="text-base font-medium"
							>
								{t("fields.startTime")}
							</Label>
							<Input
								id="appointment-start"
								type="datetime-local"
								value={startTime}
								onChange={(e) => setStartTime(e.target.value)}
								className="h-12 text-base"
								required
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="appointment-location"
								className="text-base font-medium"
							>
								{t("fields.location")}
							</Label>
							<Input
								id="appointment-location"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								className="h-12 text-base"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="appointment-driver"
								className="text-base font-medium"
							>
								{t("fields.driver")}
							</Label>
							<DriverPicker
								id="appointment-driver"
								value={driverId}
								onChange={setDriverId}
								disabled={saving}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="appointment-notes"
								className="text-base font-medium"
							>
								{t("fields.notes")}
							</Label>
							<Textarea
								id="appointment-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className="text-base min-h-24 resize-none"
							/>
						</div>

						{error ? (
							<p className="text-base text-destructive" role="alert">
								{error}
							</p>
						) : null}

						<div className="flex gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								size="touch"
								onClick={() => onOpenChange(false)}
								disabled={saving}
								className="flex-1"
							>
								{tCommon("cancel")}
							</Button>
							<Button
								type="submit"
								size="touch"
								disabled={saving || title.trim().length === 0}
								className="flex-1"
							>
								{saving ? tCommon("saving") : tCommon("save")}
							</Button>
						</div>

						{editAppointment ? (
							<Button
								type="button"
								variant="destructive"
								size="touch"
								onClick={() => setConfirmDelete(true)}
								disabled={saving}
								className="self-start"
							>
								<Trash2 aria-hidden />
								<span>{tCommon("delete")}</span>
							</Button>
						) : null}
					</form>
				</SheetContent>
			</Sheet>

			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<DialogContent className="max-w-sm" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle className="text-xl">{tCommon("delete")}?</DialogTitle>
						<DialogDescription className="text-base">
							{t("deleteConfirm")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							variant="destructive"
							size="touch"
							onClick={handleDelete}
							disabled={saving}
						>
							{tCommon("delete")}
						</Button>
						<Button
							variant="outline"
							size="touch"
							onClick={() => setConfirmDelete(false)}
							disabled={saving}
						>
							{tCommon("cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
