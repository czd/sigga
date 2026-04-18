"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Id } from "@/../convex/_generated/dataModel";
import { ContactDetail } from "@/components/info/ContactDetail";
import { ContactList } from "@/components/info/ContactList";
import { EmergencyTiles } from "@/components/info/EmergencyTiles";
import { usePathname, useRouter } from "@/i18n/navigation";

export function FolkView() {
	const t = useTranslations();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const activeId = searchParams.get("contact") as Id<"contacts"> | null;

	const handleSelect = useCallback(
		(id: Id<"contacts">) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set("contact", id);
			const qs = params.toString();
			router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	return (
		<>
			<header className="flex flex-col gap-2">
				<div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
					{t("folk.title")}
				</div>
				<h2 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
					{t("folk.subtitle")}
				</h2>
			</header>
			<EmergencyTiles />

			{/* Mobile + tablet: unchanged single-column */}
			<div className="xl:hidden">
				<ContactList />
			</div>

			{/* Desktop xl:+: list + detail */}
			<div className="hidden xl:grid xl:grid-cols-[minmax(340px,420px)_1fr] xl:gap-6">
				<ContactList onRowClick={handleSelect} activeId={activeId} />
				<div className="bg-paper rounded-2xl p-6 min-h-[40vh]">
					{activeId ? (
						<ContactDetail id={activeId} />
					) : (
						<p className="text-ink-faint">{t("folk.selectHint")}</p>
					)}
				</div>
			</div>
		</>
	);
}
