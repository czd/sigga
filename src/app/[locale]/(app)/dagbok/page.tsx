import { setRequestLocale } from "next-intl/server";
import { DagbokView } from "./DagbokView";

export default async function DagbokPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	return <DagbokView />;
}
