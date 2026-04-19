import { setRequestLocale } from "next-intl/server";
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

	return (
		<>
			<Tracking />
			<Sidebar />
			<Header />
			<main className="flex-1 pb-32 md:pb-12 md:pl-[248px]">
				<div className="md:pl-24">{children}</div>
			</main>
			<BottomNav />
		</>
	);
}
