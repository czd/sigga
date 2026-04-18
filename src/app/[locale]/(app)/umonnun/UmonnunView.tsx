"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { MedicationTable } from "@/components/info/MedicationTable";
import { LogEntryForm } from "@/components/log/LogEntryForm";
import { LogFeed } from "@/components/log/LogFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UmonnunView() {
	const t = useTranslations();
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<>
			<div className="px-6 pt-4 pb-28 flex flex-col gap-6">
				<header className="flex flex-col gap-2">
					<div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
						{t("umonnun.title")}
					</div>
					<h2 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
						{t("umonnun.hvernig")}
					</h2>
				</header>

				<Tabs defaultValue="dagbok" className="gap-6">
					<TabsList className="h-12 w-full">
						<TabsTrigger
							value="dagbok"
							className="h-full text-base font-medium"
						>
							{t("umonnun.sections.dagbok")}
						</TabsTrigger>
						<TabsTrigger value="lyf" className="h-full text-base font-medium">
							{t("umonnun.sections.lyf")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="dagbok" className="flex flex-col gap-4">
						<Button
							size="touch"
							onClick={() => setCreateOpen(true)}
							className="w-full"
						>
							<Pencil aria-hidden />
							<span>{t("dagbok.write")}</span>
						</Button>
						<LogFeed />
					</TabsContent>

					<TabsContent value="lyf">
						<MedicationTable />
					</TabsContent>
				</Tabs>
			</div>
			<LogEntryForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
