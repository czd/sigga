import { getTranslations, setRequestLocale } from "next-intl/server";
import { PappirarTabs } from "./PappirarTabs";

export default async function PappirarPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations();

	return (
		<div className="px-6 pt-4 pb-28 flex flex-col gap-4 lg:max-w-[704px] xl:max-w-[816px]">
			<div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
				{t("pappirar.title")}
			</div>
			<PappirarTabs />
		</div>
	);
}
