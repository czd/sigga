"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ContactList } from "./ContactList";
import { DocumentList } from "./DocumentList";
import { EntitlementList } from "./EntitlementList";
import { MedicationTable } from "./MedicationTable";

const TAB_VALUES = ["lyf", "simaskra", "rettindi", "skjol"] as const;
type TabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: TabValue = "lyf";

function isTabValue(value: string | null): value is TabValue {
	return value !== null && (TAB_VALUES as readonly string[]).includes(value);
}

export function UpplysingarTabs() {
	const t = useTranslations("upplysingar.tabs");
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
				value="lyf"
				forceMount
				className="data-[state=inactive]:hidden"
			>
				<MedicationTable />
			</TabsContent>
			<TabsContent
				value="simaskra"
				forceMount
				className="data-[state=inactive]:hidden"
			>
				<ContactList />
			</TabsContent>
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
