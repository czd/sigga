import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UsageView } from "./UsageView";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	return { title: `${t("admin.usage.title")} · ${t("app.name")}` };
}

export default async function UsagePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <UsageView />;
}
