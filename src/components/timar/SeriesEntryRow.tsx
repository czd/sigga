"use client";

import { useQuery } from "convex/react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { Link } from "@/i18n/navigation";

export function SeriesEntryRow() {
	const t = useTranslations("recurring");
	const series = useQuery(api.recurringSeries.list);

	const activeCount =
		series === undefined ? undefined : series.filter((s) => s.isActive).length;
	const hasAnyPaused =
		series !== undefined && series.length > 0 && activeCount === 0;

	const subtitle =
		activeCount === undefined
			? ""
			: hasAnyPaused
				? t("entryAllPaused")
				: t("entryCount", { count: activeCount });

	return (
		<Link
			href="/timar/reglulegir"
			className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-paper px-5 py-4 ring-1 ring-foreground/10 transition-colors outline-none hover:bg-paper-deep/60 focus-visible:ring-2 focus-visible:ring-ring"
		>
			<div className="flex flex-col">
				<span className="font-serif text-base text-ink">{t("entryLabel")}</span>
				<span className="text-sm text-ink-soft">{subtitle}</span>
			</div>
			<ChevronRight size={20} className="text-ink-soft" aria-hidden />
		</Link>
	);
}
