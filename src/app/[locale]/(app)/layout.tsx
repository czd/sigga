import { setRequestLocale } from "next-intl/server";
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
			<Sidebar />
			<Header />
			<main className="flex-1 pb-32 lg:pb-12 lg:pl-[248px]">
				<div className="lg:pl-24">{children}</div>
			</main>
			<BottomNav />
		</>
	);
}
