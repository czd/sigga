import { setRequestLocale } from "next-intl/server";
import { BottomNav } from "@/components/nav/BottomNav";
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
			<Header />
			<main className="flex-1 pb-24">{children}</main>
			<BottomNav />
		</>
	);
}
