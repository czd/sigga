import { setRequestLocale } from "next-intl/server";
import { UmonnunView } from "./UmonnunView";

export default async function UmonnunPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return (
		<div className="lg:max-w-[704px]">
			<UmonnunView />
		</div>
	);
}
