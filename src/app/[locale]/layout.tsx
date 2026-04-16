import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { routing } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale, namespace: "app" });
	return {
		title: t("name"),
		description: t("tagline"),
	};
}

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}
	setRequestLocale(locale);

	return (
		<ConvexAuthNextjsServerProvider>
			<html
				lang={locale}
				className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
			>
				<body className="min-h-full flex flex-col">
					<NextIntlClientProvider>
						<ConvexClientProvider>{children}</ConvexClientProvider>
					</NextIntlClientProvider>
				</body>
			</html>
		</ConvexAuthNextjsServerProvider>
	);
}
