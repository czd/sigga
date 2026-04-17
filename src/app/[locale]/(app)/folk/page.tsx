import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactList } from "@/components/info/ContactList";
import { EmergencyTiles } from "@/components/info/EmergencyTiles";

export default async function FolkPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations();

	return (
		<div className="px-6 pt-4 pb-28 flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
					{t("folk.title")}
				</div>
				<h2 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
					{t("folk.subtitle")}
				</h2>
			</header>
			<EmergencyTiles />
			<ContactList />
		</div>
	);
}
