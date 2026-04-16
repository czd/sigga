import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function TimarPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations();

	return (
		<div className="px-4 py-6 flex flex-col gap-6">
			<h2 className="text-3xl font-semibold">{t("timar.title")}</h2>
			<section className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
				<p className="text-muted-foreground">{t("common.comingSoon")}</p>
			</section>
		</div>
	);
}
