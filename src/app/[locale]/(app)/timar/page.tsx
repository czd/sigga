import { setRequestLocale } from "next-intl/server";
import { TimarView } from "./TimarView";

export default async function TimarPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <TimarView />;
}
