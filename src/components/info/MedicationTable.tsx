"use client";

import { useQuery } from "convex/react";
import type { LucideIcon } from "lucide-react";
import { Moon, Pill, Plus, Sun, Syringe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MedicationForm } from "./MedicationForm";

type MedicationDoc = Doc<"medications">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type MedicationWithUpdater = MedicationDoc & {
	updatedByUser: UserSummary | null;
};

function iconFor(med: MedicationDoc): LucideIcon {
	const haystack =
		`${med.name} ${med.schedule} ${med.notes ?? ""}`.toLowerCase();
	if (/(spraut|inject)/.test(haystack)) return Syringe;
	if (/(kvöld|nótt|fyrir svefn|á kvöldin)/.test(haystack)) return Moon;
	if (/(morgn|morgun|á daginn|dag)/.test(haystack)) return Sun;
	return Pill;
}

function MedicationRow({
	medication,
	onEdit,
	isLast,
}: {
	medication: MedicationWithUpdater;
	onEdit: (med: MedicationWithUpdater) => void;
	isLast: boolean;
}) {
	const Icon = iconFor(medication);
	const subtitle = medication.purpose ?? medication.notes ?? null;

	return (
		<li className={cn(!isLast && "border-b border-divider")}>
			<button
				type="button"
				onClick={() => onEdit(medication)}
				className="flex w-full items-start gap-4 px-4 py-4 text-left outline-none focus-visible:bg-paper-deep/60"
			>
				<span
					aria-hidden
					className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-deep text-ink-faint"
				>
					<Icon className="size-5" strokeWidth={1.6} aria-hidden />
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-1">
					<span className="font-serif text-lg leading-tight font-semibold text-ink">
						{medication.name}
					</span>
					<span className="text-base text-ink">
						{medication.dose} <span className="text-ink-faint">·</span>{" "}
						{medication.schedule}
					</span>
					{subtitle ? (
						<span className="text-sm italic text-ink-soft">{subtitle}</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

export function MedicationTable() {
	const t = useTranslations("medications");
	const tCommon = useTranslations("common");
	const [showInactive, setShowInactive] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<MedicationWithUpdater | null>(
		null,
	);

	const medications = useQuery(api.medications.list, {});
	const loading = medications === undefined;

	const active = medications?.filter((m) => m.isActive) ?? [];
	const inactive = medications?.filter((m) => !m.isActive) ?? [];

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex items-baseline justify-between gap-3">
					<h3 className="font-serif text-[1.6rem] font-normal tracking-tight text-ink">
						{t("title")}
					</h3>
					{!loading && active.length > 0 ? (
						<span className="text-sm text-ink-soft">
							{t("countActive", { count: active.length })}
						</span>
					) : null}
				</div>

				{loading ? (
					<div className="rounded-2xl bg-paper px-4 py-6 ring-1 ring-foreground/10 text-muted-foreground">
						{tCommon("loading")}
					</div>
				) : active.length === 0 ? (
					<EmptyState
						icon={<Pill size={40} aria-hidden />}
						title={t("empty")}
						action={
							<Button size="touch" onClick={() => setCreateOpen(true)}>
								<Plus aria-hidden />
								<span>{t("add")}</span>
							</Button>
						}
					/>
				) : (
					<ul className="overflow-hidden rounded-2xl bg-paper ring-1 ring-foreground/10">
						{active.map((med, i) => (
							<MedicationRow
								key={med._id}
								medication={med}
								onEdit={setEditTarget}
								isLast={i === active.length - 1}
							/>
						))}
					</ul>
				)}

				<div className="flex flex-wrap items-center gap-3">
					<Button
						variant="outline"
						size="touch"
						onClick={() => setCreateOpen(true)}
					>
						<Plus aria-hidden />
						<span>{t("add")}</span>
					</Button>
					{inactive.length > 0 ? (
						<Button
							variant="ghost"
							size="touch"
							onClick={() => setShowInactive((v) => !v)}
						>
							{showInactive ? t("hideInactive") : t("showInactive")}
						</Button>
					) : null}
				</div>

				{inactive.length > 0 && showInactive ? (
					<ul className="overflow-hidden rounded-2xl bg-paper/60 ring-1 ring-foreground/10">
						{inactive.map((med, i) => (
							<MedicationRow
								key={med._id}
								medication={med}
								onEdit={setEditTarget}
								isLast={i === inactive.length - 1}
							/>
						))}
					</ul>
				) : null}
			</div>

			<MedicationForm open={createOpen} onOpenChange={setCreateOpen} />
			<MedicationForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editMedication={editTarget}
			/>
		</>
	);
}
