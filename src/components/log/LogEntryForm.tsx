"use client";

import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

const NO_APPOINTMENT = "__none__";

type EditTarget = {
	id: Id<"logEntries">;
	content: string;
	relatedAppointmentId: Id<"appointments"> | undefined;
};

type LogEntryFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editEntry?: EditTarget | null;
};

export function LogEntryForm({
	open,
	onOpenChange,
	editEntry,
}: LogEntryFormProps) {
	const t = useTranslations("dagbok");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const appointments = useQuery(api.appointments.list, { limit: 50 });
	const addEntry = useMutation(api.logEntries.add);
	const updateEntry = useMutation(api.logEntries.update);

	const [content, setContent] = useState("");
	const [appointmentId, setAppointmentId] = useState<string>(NO_APPOINTMENT);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (editEntry) {
			setContent(editEntry.content);
			setAppointmentId(editEntry.relatedAppointmentId ?? NO_APPOINTMENT);
		} else {
			setContent("");
			setAppointmentId(NO_APPOINTMENT);
		}
	}, [open, editEntry]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = content.trim();
		if (trimmed.length === 0) {
			setError(t("errors.empty"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const relatedAppointmentId =
				appointmentId === NO_APPOINTMENT
					? undefined
					: (appointmentId as Id<"appointments">);
			if (editEntry) {
				await updateEntry({
					id: editEntry.id,
					content: trimmed,
					relatedAppointmentId: relatedAppointmentId ?? null,
				});
			} else {
				await addEntry({
					content: trimmed,
					relatedAppointmentId,
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

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="max-h-[92vh] rounded-t-2xl"
				showCloseButton={false}
			>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
				>
					<SheetHeader className="p-0">
						<SheetTitle className="text-xl font-semibold">
							{editEntry ? t("editEntry") : t("newEntry")}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{t("contentPlaceholder")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="log-entry-content"
							className="text-base font-medium"
						>
							{t("contentLabel")}
						</Label>
						<Textarea
							id="log-entry-content"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder={t("contentPlaceholder")}
							rows={6}
							className="text-base min-h-40 resize-none"
							autoFocus
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="log-entry-appointment"
							className="text-base font-medium"
						>
							{t("linkAppointment")}
						</Label>
						<Select value={appointmentId} onValueChange={setAppointmentId}>
							<SelectTrigger
								id="log-entry-appointment"
								className="h-12 text-base"
							>
								<SelectValue placeholder={t("noAppointment")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_APPOINTMENT}>
									{t("noAppointment")}
								</SelectItem>
								{appointments?.map((apt) => (
									<SelectItem key={apt._id} value={apt._id}>
										{apt.title} ·{" "}
										{formatAbsoluteWithTime(apt.startTime, locale)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
							disabled={saving || content.trim().length === 0}
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
