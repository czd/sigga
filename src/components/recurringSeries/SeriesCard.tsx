"use client";

import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { formatDays } from "@/lib/formatRecurrence";
import { cn } from "@/lib/utils";

type SeriesDoc = Doc<"recurringSeries">;

type SeriesCardProps = {
	series: SeriesDoc;
	onEdit: () => void;
};

export function SeriesCard({ series, onEdit }: SeriesCardProps) {
	const t = useTranslations("recurring");
	const tLong = useTranslations("recurring.form.daysLong");
	const locale = useLocale();
	const setActive = useMutation(api.recurringSeries.setActive);
	const remove = useMutation(api.recurringSeries.remove);
	const [pending, setPending] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const longLabels: Record<number, string> = {
		0: tLong("0"),
		1: tLong("1"),
		2: tLong("2"),
		3: tLong("3"),
		4: tLong("4"),
		5: tLong("5"),
		6: tLong("6"),
	};
	const daysLabel = formatDays(series.daysOfWeek, longLabels, locale);
	const cadence = t("cadence", { days: daysLabel, time: series.timeOfDay });

	async function handleToggle(next: boolean) {
		setPending(true);
		setError(null);
		try {
			await setActive({ id: series._id, isActive: next });
		} catch (err) {
			console.error(err);
			setError(t("form.errors.generic"));
		} finally {
			setPending(false);
		}
	}

	async function handleDelete() {
		setPending(true);
		setError(null);
		try {
			await remove({ id: series._id });
			setConfirmDelete(false);
		} catch (err) {
			console.error(err);
			setError(t("form.errors.generic"));
		} finally {
			setPending(false);
		}
	}

	return (
		<article className="flex flex-col gap-4 rounded-2xl bg-paper px-5 py-5 ring-1 ring-foreground/10">
			<div className="flex flex-col gap-1.5">
				<h3 className="font-serif text-lg leading-snug text-ink">
					{series.title}
				</h3>
				<p
					className={cn(
						"text-sm",
						series.isActive ? "text-ink-soft" : "text-ink-faint",
					)}
				>
					{cadence}
				</p>
				{series.location ? (
					<p className="text-sm text-ink-faint">{series.location}</p>
				) : null}
			</div>

			<div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
				<label
					htmlFor={`active-${series._id}`}
					className="flex items-center gap-3"
				>
					<Switch
						id={`active-${series._id}`}
						checked={series.isActive}
						onCheckedChange={handleToggle}
						disabled={pending}
					/>
					<span className="text-base text-ink-soft">
						{series.isActive ? t("active") : t("paused")}
					</span>
				</label>

				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						size="touch"
						onClick={onEdit}
						disabled={pending}
					>
						{t("edit")}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="touch"
						onClick={() => setConfirmDelete(true)}
						disabled={pending}
						className="text-destructive"
					>
						{t("delete")}
					</Button>
				</div>
			</div>

			{error ? (
				<p className="text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}

			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
				<DialogContent className="max-w-sm" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle className="text-xl">
							{t("deleteConfirm.title", { title: series.title })}
						</DialogTitle>
						<DialogDescription className="text-base">
							{t("deleteConfirm.body")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							variant="destructive"
							size="touch"
							onClick={handleDelete}
							disabled={pending}
						>
							{t("deleteConfirm.confirm")}
						</Button>
						<Button
							variant="outline"
							size="touch"
							onClick={() => setConfirmDelete(false)}
							disabled={pending}
						>
							{t("deleteConfirm.cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</article>
	);
}
