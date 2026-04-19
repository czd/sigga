"use client";

import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { SeriesList } from "@/components/recurringSeries/SeriesList";
import { Link } from "@/i18n/navigation";

export function ReglulegirView() {
	const t = useTranslations("recurring");

	return (
		<div className="px-4 py-6 pb-28 flex flex-col gap-6">
			<Link
				href="/timar"
				className="inline-flex items-center gap-1 rounded-md text-sm text-ink-soft transition-colors outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/50"
			>
				<ChevronLeft size={18} aria-hidden />
				<span>{t("backToTimar")}</span>
			</Link>
			<h2 className="font-serif text-3xl font-normal tracking-tight text-ink">
				{t("title")}
			</h2>
			<SeriesList />
		</div>
	);
}
