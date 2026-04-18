import { setRequestLocale } from "next-intl/server";
import { StackLayout } from "@/components/layout/StackLayout";
import { TimarView } from "./TimarView";

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
