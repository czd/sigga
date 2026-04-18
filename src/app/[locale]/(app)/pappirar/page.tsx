import { getTranslations, setRequestLocale } from "next-intl/server";
import { StackLayout } from "@/components/layout/StackLayout";
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
		<StackLayout className="pt-4 pb-28 gap-4" xlMaxWidth="xl:max-w-[1100px]">
			<div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
				{t("pappirar.title")}
			</div>
			<PappirarTabs />
		</StackLayout>
	);
}
