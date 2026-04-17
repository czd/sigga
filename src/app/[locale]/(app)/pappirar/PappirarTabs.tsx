"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { DocumentList } from "@/components/info/DocumentList";
import { EntitlementList } from "@/components/info/EntitlementList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/navigation";

const TAB_VALUES = ["rettindi", "skjol"] as const;
type TabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: TabValue = "rettindi";

function isTabValue(value: string | null): value is TabValue {
	return value !== null && (TAB_VALUES as readonly string[]).includes(value);
}

export function PappirarTabs() {
	const t = useTranslations("pappirar.tabs");
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const rawTab = searchParams.get("tab");
	const tab: TabValue = isTabValue(rawTab) ? rawTab : DEFAULT_TAB;

	const handleChange = useCallback(
		(next: string) => {
			if (!isTabValue(next)) return;
			const params = new URLSearchParams(searchParams.toString());
			if (next === DEFAULT_TAB) {
				params.delete("tab");
			} else {
				params.set("tab", next);
			}
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	return (
		<Tabs value={tab} onValueChange={handleChange} className="gap-6">
			<TabsList className="sticky top-0 z-10 h-auto w-full rounded-xl bg-muted p-1 shadow-sm">
				{TAB_VALUES.map((value) => (
					<TabsTrigger
						key={value}
						value={value}
						className="min-h-12 flex-1 text-base font-semibold"
					>
						{t(value)}
					</TabsTrigger>
				))}
			</TabsList>

			<TabsContent
				value="rettindi"
				forceMount
				className="data-[state=inactive]:hidden"
			>
				<EntitlementList />
			</TabsContent>
			<TabsContent
				value="skjol"
				forceMount
				className="data-[state=inactive]:hidden"
			>
				<DocumentList />
			</TabsContent>
		</Tabs>
	);
}
