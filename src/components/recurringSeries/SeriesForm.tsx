"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
import { DayPicker } from "./DayPicker";

type SeriesDoc = Doc<"recurringSeries">;

type SeriesFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editSeries?: SeriesDoc | null;
};

export function SeriesForm({
	open,
	onOpenChange,
	editSeries,
}: SeriesFormProps) {
	const t = useTranslations("recurring");
	const tCommon = useTranslations("common");
	const create = useMutation(api.recurringSeries.create);
	const update = useMutation(api.recurringSeries.update);

	const [title, setTitle] = useState("");
	const [days, setDays] = useState<number[]>([]);
	const [time, setTime] = useState("09:00");
	const [duration, setDuration] = useState("");
	const [location, setLocation] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setError(null);
		if (editSeries) {
			setTitle(editSeries.title);
			setDays([...editSeries.daysOfWeek].sort((a, b) => a - b));
			setTime(editSeries.timeOfDay);
			setDuration(
				editSeries.durationMinutes !== undefined
					? String(editSeries.durationMinutes)
					: "",
			);
			setLocation(editSeries.location ?? "");
			setNotes(editSeries.notes ?? "");
		} else {
			setTitle("");
			setDays([]);
			setTime("09:00");
			setDuration("");
			setLocation("");
			setNotes("");
		}
	}, [open, editSeries]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) {
			setError(t("form.errors.titleRequired"));
			return;
		}
		if (days.length === 0) {
			setError(t("form.errors.daysRequired"));
			return;
		}
		if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
			setError(t("form.errors.timeRequired"));
			return;
		}
		const durationMinutes =
			duration.trim().length > 0 ? Number(duration) : undefined;
		if (durationMinutes !== undefined && !Number.isFinite(durationMinutes)) {
			setError(t("form.errors.generic"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (editSeries) {
				await update({
					id: editSeries._id,
					title: trimmedTitle,
					daysOfWeek: days,
					timeOfDay: time,
					durationMinutes: duration.trim().length > 0 ? durationMinutes : null,
					location: location.trim() || null,
					notes: notes.trim() || null,
				});
			} else {
				await create({
					title: trimmedTitle,
					daysOfWeek: days,
					timeOfDay: time,
					durationMinutes,
					location: location.trim() || undefined,
					notes: notes.trim() || undefined,
				});
			}
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("form.errors.generic"));
		} finally {
			setSaving(false);
		}
	}

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
						<SheetTitle className="font-serif text-xl">
							{editSeries ? t("form.editTitle") : t("form.createTitle")}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{editSeries ? t("form.editTitle") : t("form.createTitle")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-title" className="text-base font-medium">
							{t("form.fields.title")}
						</Label>
						<Input
							id="series-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							className="h-12 text-base"
							required
							autoFocus
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label className="text-base font-medium">
							{t("form.fields.days")}
						</Label>
						<DayPicker value={days} onChange={setDays} disabled={saving} />
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-time" className="text-base font-medium">
							{t("form.fields.time")}
						</Label>
						<Input
							id="series-time"
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="h-12 text-base"
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-duration" className="text-base font-medium">
							{t("form.fields.duration")}
						</Label>
						<Input
							id="series-duration"
							type="number"
							min={1}
							max={1440}
							inputMode="numeric"
							value={duration}
							onChange={(e) => setDuration(e.target.value)}
							className="h-12 text-base"
						/>
						<p className="text-sm text-ink-soft">
							{t("form.fields.durationHint")}
						</p>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-location" className="text-base font-medium">
							{t("form.fields.location")}
						</Label>
						<Input
							id="series-location"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							className="h-12 text-base"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="series-notes" className="text-base font-medium">
							{t("form.fields.notes")}
						</Label>
						<Textarea
							id="series-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="min-h-24 resize-none text-base"
						/>
					</div>

					{editSeries ? (
						<p className="text-sm text-ink-soft">{t("form.editNextNote")}</p>
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
							disabled={
								saving || title.trim().length === 0 || days.length === 0
							}
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
