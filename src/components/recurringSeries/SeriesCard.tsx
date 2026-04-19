"use client";

import { useMutation } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { formatDays } from "@/lib/formatRecurrence";

type SeriesDoc = Doc<"recurringSeries">;

type SeriesCardProps = {
	series: SeriesDoc;
	onEdit: () => void;
};

export function SeriesCard({ series, onEdit }: SeriesCardProps) {
	const t = useTranslations("recurring");
	const tCommon = useTranslations("common");
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
		} catch (err) {
			console.error(err);
			setError(t("form.errors.generic"));
			throw err;
		} finally {
			setPending(false);
		}
	}

	return (
		<article className="flex flex-col gap-4 rounded-2xl bg-paper px-5 py-5 ring-1 ring-foreground/10">
			<button
				type="button"
				onClick={onEdit}
				disabled={pending}
				aria-label={tCommon("editItem", { title: series.title })}
				className="-mx-2 -mt-2 flex flex-col gap-1.5 rounded-lg px-2 pt-2 pb-1 text-left outline-none transition-colors hover:bg-paper-deep/40 focus-visible:ring-3 focus-visible:ring-ring"
			>
				<h3 className="font-serif text-lg leading-snug text-ink">
					{series.title}
				</h3>
				<p className="text-sm text-ink-soft">{cadence}</p>
				{series.location ? (
					<p className="text-sm text-ink-soft">{series.location}</p>
				) : null}
			</button>

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

			<ConfirmDialog
				open={confirmDelete}
				onOpenChange={setConfirmDelete}
				title={t("deleteConfirm.title", { title: series.title })}
				body={t("deleteConfirm.body")}
				confirmLabel={tCommon("delete")}
				confirmVariant="destructive"
				onConfirm={handleDelete}
			/>
		</article>
	);
}
