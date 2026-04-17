import { setRequestLocale } from "next-intl/server";
import { ReglulegirView } from "./ReglulegirView";

export default async function ReglulegirPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <ReglulegirView />;
}
