import { setRequestLocale } from "next-intl/server";
import { StackLayout } from "@/components/layout/StackLayout";
import { FolkView } from "./FolkView";

export default async function FolkPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<StackLayout className="pt-4 pb-28 gap-6" xlMaxWidth="xl:max-w-[1200px]">
			<FolkView />
		</StackLayout>
	);
}
