import { getTranslations, setRequestLocale } from "next-intl/server";
import { UpplysingarTabs } from "@/components/info/UpplysingarTabs";

export default async function UpplysingarPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations();

	return (
		<div className="px-4 py-6 pb-28 flex flex-col gap-6">
			<h2 className="text-3xl font-semibold">{t("upplysingar.title")}</h2>
			<UpplysingarTabs />
		</div>
	);
}
