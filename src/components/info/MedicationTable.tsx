"use client";

import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Pencil, Pill, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function formatUpdatedAt(ts: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(ts));
}

function MedicationRow({
	medication,
	onEdit,
}: {
	medication: MedicationWithUpdater;
	onEdit: (med: MedicationWithUpdater) => void;
}) {
	const t = useTranslations("medications");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const [expanded, setExpanded] = useState(false);
	const hasDetails =
		Boolean(medication.prescriber) ||
		Boolean(medication.notes) ||
		Boolean(medication.updatedByUser);

	return (
		<Card className={cn(!medication.isActive && "opacity-75")}>
			<CardContent className="flex flex-col gap-2">
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					aria-expanded={expanded}
					className="flex items-start gap-3 text-left min-h-12 -mx-1 px-1 py-1 rounded-lg hover:bg-accent/40 transition-colors"
				>
					<div className="flex-1 min-w-0">
						<h3 className="text-lg font-semibold leading-snug">
							{medication.name}
						</h3>
						<p className="text-base mt-0.5">
							{medication.dose} · {medication.schedule}
						</p>
						{medication.purpose ? (
							<p className="text-base text-muted-foreground mt-1">
								{medication.purpose}
							</p>
						) : null}
					</div>
					{hasDetails ? (
						<span className="text-muted-foreground shrink-0 mt-1" aria-hidden>
							{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
						</span>
					) : null}
				</button>

				{expanded && hasDetails ? (
					<div className="pt-2 mt-1 border-t border-border flex flex-col gap-2 text-base">
						{medication.prescriber ? (
							<div>
								<span className="text-muted-foreground">
									{t("fields.prescriber")}:{" "}
								</span>
								<span>{medication.prescriber}</span>
							</div>
						) : null}
						{medication.notes ? (
							<p className="whitespace-pre-wrap text-foreground/90">
								{medication.notes}
							</p>
						) : null}
						{medication.updatedByUser ? (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<UserAvatar
									name={medication.updatedByUser.name}
									email={medication.updatedByUser.email}
									imageUrl={medication.updatedByUser.image}
									className="size-6"
								/>
								<span>
									{tCommon("lastUpdated")}{" "}
									{formatUpdatedAt(medication.updatedAt, locale)}{" "}
									{tCommon("by")}{" "}
									{medication.updatedByUser.name ??
										medication.updatedByUser.email ??
										""}
								</span>
							</div>
						) : null}
						<div className="pt-1">
							<Button
								variant="outline"
								size="touch"
								onClick={() => onEdit(medication)}
							>
								<Pencil aria-hidden />
								<span>{tCommon("edit")}</span>
							</Button>
						</div>
					</div>
				) : null}
			</CardContent>
		</Card>
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
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-xl font-semibold">{t("title")}</h3>
					<Button size="touch" onClick={() => setCreateOpen(true)}>
						<Plus aria-hidden />
						<span>{t("add")}</span>
					</Button>
				</div>

				{loading ? (
					<Card>
						<CardContent className="text-muted-foreground py-2">
							{tCommon("loading")}
						</CardContent>
					</Card>
				) : active.length === 0 ? (
					<EmptyState
						icon={<Pill size={40} aria-hidden />}
						title={t("empty")}
					/>
				) : (
					<ul className="flex flex-col gap-3">
						{active.map((med) => (
							<li key={med._id}>
								<MedicationRow medication={med} onEdit={setEditTarget} />
							</li>
						))}
					</ul>
				)}

				{inactive.length > 0 ? (
					<div className="flex flex-col gap-3">
						<Button
							variant="outline"
							size="touch"
							onClick={() => setShowInactive((v) => !v)}
							className="self-start"
						>
							{showInactive ? t("hideInactive") : t("showInactive")}
						</Button>
						{showInactive ? (
							<ul className="flex flex-col gap-3">
								{inactive.map((med) => (
									<li key={med._id}>
										<MedicationRow medication={med} onEdit={setEditTarget} />
									</li>
								))}
							</ul>
						) : null}
					</div>
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
