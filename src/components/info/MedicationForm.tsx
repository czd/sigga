"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type MedicationDoc = Doc<"medications">;

type MedicationFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editMedication?: MedicationDoc | null;
};

export function MedicationForm({
	open,
	onOpenChange,
	editMedication,
}: MedicationFormProps) {
	const t = useTranslations("medications");
	const tCommon = useTranslations("common");
	const create = useMutation(api.medications.create);
	const update = useMutation(api.medications.update);

	const [name, setName] = useState("");
	const [dose, setDose] = useState("");
	const [schedule, setSchedule] = useState("");
	const [purpose, setPurpose] = useState("");
	const [prescriber, setPrescriber] = useState("");
	const [notes, setNotes] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (editMedication) {
			setName(editMedication.name);
			setDose(editMedication.dose);
			setSchedule(editMedication.schedule);
			setPurpose(editMedication.purpose ?? "");
			setPrescriber(editMedication.prescriber ?? "");
			setNotes(editMedication.notes ?? "");
			setIsActive(editMedication.isActive);
		} else {
			setName("");
			setDose("");
			setSchedule("");
			setPurpose("");
			setPrescriber("");
			setNotes("");
			setIsActive(true);
		}
	}, [open, editMedication]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		const trimmedDose = dose.trim();
		const trimmedSchedule = schedule.trim();
		if (trimmedName.length === 0) {
			setError(t("errors.nameRequired"));
			return;
		}
		if (trimmedDose.length === 0 || trimmedSchedule.length === 0) {
			setError(t("errors.doseScheduleRequired"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (editMedication) {
				await update({
					id: editMedication._id,
					name: trimmedName,
					dose: trimmedDose,
					schedule: trimmedSchedule,
					purpose: purpose.trim() || null,
					prescriber: prescriber.trim() || null,
					notes: notes.trim() || null,
					isActive,
				});
			} else {
				await create({
					name: trimmedName,
					dose: trimmedDose,
					schedule: trimmedSchedule,
					purpose: purpose.trim() || undefined,
					prescriber: prescriber.trim() || undefined,
					notes: notes.trim() || undefined,
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

	const canSubmit =
		name.trim().length > 0 &&
		dose.trim().length > 0 &&
		schedule.trim().length > 0;

	return (
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
							{editMedication ? t("editTitle") : t("createTitle")}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{editMedication ? t("editTitle") : t("createTitle")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-2">
						<Label htmlFor="medication-name" className="text-base font-medium">
							{t("fields.name")}
						</Label>
						<Input
							id="medication-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="h-12 text-base"
							required
							autoFocus
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="medication-dose" className="text-base font-medium">
							{t("fields.dose")}
						</Label>
						<Input
							id="medication-dose"
							value={dose}
							onChange={(e) => setDose(e.target.value)}
							className="h-12 text-base"
							placeholder={t("placeholders.dose")}
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="medication-schedule"
							className="text-base font-medium"
						>
							{t("fields.schedule")}
						</Label>
						<Input
							id="medication-schedule"
							value={schedule}
							onChange={(e) => setSchedule(e.target.value)}
							className="h-12 text-base"
							placeholder={t("placeholders.schedule")}
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="medication-purpose"
							className="text-base font-medium"
						>
							{t("fields.purpose")}
						</Label>
						<Input
							id="medication-purpose"
							value={purpose}
							onChange={(e) => setPurpose(e.target.value)}
							className="h-12 text-base"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="medication-prescriber"
							className="text-base font-medium"
						>
							{t("fields.prescriber")}
						</Label>
						<Input
							id="medication-prescriber"
							value={prescriber}
							onChange={(e) => setPrescriber(e.target.value)}
							className="h-12 text-base"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="medication-notes" className="text-base font-medium">
							{t("fields.notes")}
						</Label>
						<Textarea
							id="medication-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="text-base min-h-24 resize-none"
						/>
					</div>

					{editMedication ? (
						<Label className="flex items-center gap-3 min-h-12 cursor-pointer text-base font-normal">
							<Checkbox
								checked={isActive}
								onCheckedChange={(v) => setIsActive(v === true)}
							/>
							<span>{t("fields.active")}</span>
						</Label>
					) : null}

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
							disabled={saving || !canSubmit}
							className="flex-1"
						>
							{saving ? tCommon("saving") : tCommon("save")}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
