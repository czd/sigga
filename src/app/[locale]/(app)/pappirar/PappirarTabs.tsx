"use client";

import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { DocumentDetail } from "@/components/info/DocumentDetail";
import { DocumentList } from "@/components/info/DocumentList";
import { EntitlementKanban } from "@/components/info/EntitlementKanban";
import { EntitlementList } from "@/components/info/EntitlementList";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TAB_VALUES = ["rettindi", "skjol"] as const;
type TabValue = (typeof TAB_VALUES)[number];
const DEFAULT_TAB: TabValue = "rettindi";

function isTabValue(value: string | null): value is TabValue {
	return value !== null && (TAB_VALUES as readonly string[]).includes(value);
}

export function PappirarTabs() {
	const t = useTranslations("pappirar");
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const rawTab = searchParams.get("tab");
	const tab: TabValue = isTabValue(rawTab) ? rawTab : DEFAULT_TAB;
	const activeDocId = searchParams.get("doc") as Id<"documents"> | null;

	const handleDocSelect = useCallback(
		(id: Id<"documents">) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set("doc", id);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	const handleDocClear = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());
		params.delete("doc");
		const qs = params.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	}, [pathname, router, searchParams]);

	const entitlements = useQuery(api.entitlements.list, {});
	const documents = useQuery(api.documents.list, {});

	const entitlementCount = entitlements?.length;
	const documentCount = documents?.length;

	const entitlementsDone = entitlements?.filter(
		(e) => e.status === "approved",
	).length;
	const entitlementsTotal = entitlementCount ?? 0;
	const entitlementsInProgress = entitlementsTotal - (entitlementsDone ?? 0);

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

	let headline: string;
	if (tab === "skjol") {
		headline =
			documentCount === 0 ? t("headlines.skjolEmpty") : t("headlines.skjol");
	} else if (entitlementsTotal === 0) {
		headline = t("headlines.rettindiEmpty");
	} else if (entitlementsInProgress === 0) {
		headline = t("headlines.rettindiAllDone");
	} else {
		headline = t("headlines.rettindi");
	}

	return (
		<div className="flex flex-col gap-5">
			<h2 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
				{renderHeadline(headline)}
			</h2>

			<div
				role="tablist"
				aria-label={t("title")}
				className="grid grid-cols-2 rounded-xl border border-border bg-muted p-1"
			>
				{TAB_VALUES.map((value) => {
					const count = value === "rettindi" ? entitlementCount : documentCount;
					const active = tab === value;
					return (
						<button
							key={value}
							type="button"
							role="tab"
							aria-selected={active}
							onClick={() => handleChange(value)}
							className={cn(
								"flex min-h-12 items-center justify-center gap-2 rounded-lg text-base font-medium transition-colors",
								active
									? "bg-card text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<span>{t(`tabs.${value}`)}</span>
							{count !== undefined ? (
								<span
									className={cn(
										"text-sm tabular-nums",
										active ? "text-ink-faint" : "text-ink-faint/80",
									)}
								>
									{count}
								</span>
							) : null}
						</button>
					);
				})}
			</div>

			<div className={cn(tab === "rettindi" ? "" : "hidden")}>
				<div className="xl:hidden">
					<EntitlementList />
				</div>
				<div className="hidden xl:block">
					<EntitlementKanban />
				</div>
			</div>
			<div className={cn(tab === "skjol" ? "" : "hidden")}>
				<div className="xl:hidden">
					<DocumentList />
				</div>
				<div className="hidden xl:grid xl:grid-cols-[minmax(320px,380px)_1fr] xl:gap-6">
					<DocumentList onRowClick={handleDocSelect} activeId={activeDocId} />
					<div className="bg-paper rounded-2xl p-6 min-h-[40vh]">
						{activeDocId ? (
							<DocumentDetail id={activeDocId} onAfterDelete={handleDocClear} />
						) : (
							<p className="text-ink-faint">{t("skjolEmptyPane")}</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function renderHeadline(text: string) {
	const match = text.match(/^(.*\s)(\S+)([.!?])\s*$/);
	if (!match) return text;
	const [, lead, last, punct] = match;
	return (
		<>
			{lead}
			<em className="italic">{last}</em>
			{punct}
		</>
	);
}
