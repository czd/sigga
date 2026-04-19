import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StackLayout } from "@/components/layout/StackLayout";
import { TimarView } from "./TimarView";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	return { title: `${t("nav.appointments")} · ${t("app.name")}` };
}

export default async function TimarPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return (
		<StackLayout xlMaxWidth="xl:max-w-[1400px]">
			<TimarView />
		</StackLayout>
	);
}
