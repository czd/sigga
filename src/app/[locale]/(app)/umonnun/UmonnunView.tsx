"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MedicationTable } from "@/components/info/MedicationTable";
import { LogEntryForm } from "@/components/log/LogEntryForm";
import { LogFeed } from "@/components/log/LogFeed";
import { Button } from "@/components/ui/button";

export function UmonnunView() {
	const t = useTranslations();
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<>
			<div className="px-6 pt-4 pb-28 flex flex-col gap-10">
				<header className="flex flex-col gap-2">
					<div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
						{t("umonnun.title")}
					</div>
					<h2 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
						{t("umonnun.hvernig")}
					</h2>
				</header>

				<section aria-label={t("umonnun.sections.lyf")}>
					<MedicationTable />
				</section>

				<section
					aria-labelledby="umonnun-dagbok-heading"
					className="flex flex-col gap-4"
				>
					<h3
						id="umonnun-dagbok-heading"
						className="font-serif text-[1.4rem] font-normal tracking-tight text-ink"
					>
						{t("umonnun.sections.dagbok")}
					</h3>
					<LogFeed />
				</section>
			</div>
			<div
				className="fixed inset-x-0 bottom-24 z-20 flex justify-end px-6 pb-2"
				style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
			>
				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="shadow-lg rounded-full"
				>
					<Pencil aria-hidden />
					<span>{t("dagbok.write")}</span>
				</Button>
			</div>
			<LogEntryForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
