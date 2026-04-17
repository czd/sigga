import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactList } from "@/components/info/ContactList";
import { MedicationTable } from "@/components/info/MedicationTable";

export default async function UpplysingrPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations();

	return (
		<div className="px-4 py-6 pb-28 flex flex-col gap-8">
			<h2 className="text-3xl font-semibold">{t("upplysingr.title")}</h2>
			<MedicationTable />
			<ContactList />
		</div>
	);
}
