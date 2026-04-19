import { getTranslations, setRequestLocale } from "next-intl/server";
import { Tracking } from "@/components/analytics/Tracking";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { Header } from "@/components/shared/Header";

export default async function AppLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const tCommon = await getTranslations("common");

	return (
		<>
			<a
				href="#main-content"
				className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-paper focus-visible:px-4 focus-visible:py-3 focus-visible:text-base focus-visible:font-medium focus-visible:text-ink focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
			>
				{tCommon("skipToContent")}
			</a>
			<Tracking />
			<Sidebar />
			<Header />
			<main
				id="main-content"
				className="flex-1 pb-32 md:pb-12 md:pl-[248px]"
			>
				<div className="md:pl-24">{children}</div>
			</main>
			<BottomNav />
		</>
	);
}
