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
		<div className="px-6 pt-4 pb-28 flex flex-col gap-8">
			<header className="flex flex-col gap-2">
				<div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
					{t("pappirar.title")}
				</div>
				<h2 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
					{t("pappirar.subtitle")}
				</h2>
			</header>
			<PappirarTabs />
		</div>
	);
}
