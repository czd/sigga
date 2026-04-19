"use client";

import { useQuery } from "convex/react";
import { CalendarRange, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { SeriesCard } from "./SeriesCard";
import { SeriesForm } from "./SeriesForm";

type SeriesDoc = Doc<"recurringSeries">;

export function SeriesList() {
	const t = useTranslations("recurring");
	const tCommon = useTranslations("common");
	const series = useQuery(api.recurringSeries.list);
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<SeriesDoc | null>(null);

	const loading = series === undefined;

	return (
		<>
			{loading ? (
				<p className="text-ink-soft py-2">{tCommon("loading")}</p>
			) : series.length === 0 ? (
				<EmptyState
					icon={<CalendarRange size={40} aria-hidden />}
					title={t("empty.title")}
					description={t("empty.body")}
				/>
			) : (
				<ul className="flex flex-col gap-3">
					{series.map((row) => (
						<li key={row._id}>
							<SeriesCard series={row} onEdit={() => setEditTarget(row)} />
						</li>
					))}
				</ul>
			)}

			<div className="pt-2">
				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="w-full"
				>
					<Plus aria-hidden />
					<span>{t("newButton")}</span>
				</Button>
			</div>

			<SeriesForm open={createOpen} onOpenChange={setCreateOpen} />
			<SeriesForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editSeries={editTarget}
			/>
		</>
	);
}
