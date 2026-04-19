import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StackLayout } from "@/components/layout/StackLayout";
import { ReglulegirView } from "./ReglulegirView";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	return { title: `${t("recurring.title")} · ${t("app.name")}` };
}

export default async function ReglulegirPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return (
		<StackLayout>
			<ReglulegirView />
		</StackLayout>
	);
}
