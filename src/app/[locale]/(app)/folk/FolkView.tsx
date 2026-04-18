"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { Id } from "@/../convex/_generated/dataModel";
import { ContactDetail } from "@/components/info/ContactDetail";
import { ContactList } from "@/components/info/ContactList";
import { EmergencyTiles } from "@/components/info/EmergencyTiles";

export function FolkView() {
	const t = useTranslations();
	const searchParams = useSearchParams();

	// Local state mirrors the URL, but clicks update only local state + native
	// history. That way selecting a contact doesn't trigger Next's RSC refresh
	// (which flashed the whole page). The URL-as-initial-state read here covers
	// deep-linking: a share-link like /folk?contact=abc still populates correctly
	// on page load.
	const [activeId, setActiveId] = useState<Id<"contacts"> | null>(
		(searchParams.get("contact") as Id<"contacts"> | null) ?? null,
	);

	const handleSelect = useCallback((id: Id<"contacts">) => {
		setActiveId(id);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.set("contact", id);
			window.history.replaceState(null, "", url.toString());
		}
	}, []);

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
						<div className="flex items-center justify-center h-full min-h-[40vh]">
							<p className="text-ink-faint text-base italic">
								{t("folk.selectHint")}
							</p>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
