"use client";

import { Pencil } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Id } from "@/../convex/_generated/dataModel";
import { MedicationTable } from "@/components/info/MedicationTable";
import { LogComposer } from "@/components/log/LogComposer";
import { LogEntryForm } from "@/components/log/LogEntryForm";
import { LogEntryReader } from "@/components/log/LogEntryReader";
import { LogFeed } from "@/components/log/LogFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function UmonnunView() {
	const t = useTranslations();
	const [createOpen, setCreateOpen] = useState(false);
	const searchParams = useSearchParams();
	const activeId = searchParams.get("id") as Id<"logEntries"> | null;

	return (
		<>
			<div className="flex flex-col gap-6">
				<header className="flex flex-col gap-2">
					<div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
						{t("umonnun.title")}
					</div>
					<h1 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
						{t("umonnun.hvernig")}
					</h1>
				</header>

				<Tabs defaultValue="dagbok" className="gap-6">
					<TabsList className="grid w-full grid-cols-2 rounded-xl border border-border bg-muted p-1 group-data-horizontal/tabs:h-auto">
						<TabsTrigger
							value="dagbok"
							className="min-h-12 rounded-lg text-base font-medium data-active:bg-card data-active:text-foreground data-active:shadow-sm"
						>
							{t("umonnun.sections.dagbok")}
						</TabsTrigger>
						<TabsTrigger
							value="lyf"
							className="min-h-12 rounded-lg text-base font-medium data-active:bg-card data-active:text-foreground data-active:shadow-sm"
						>
							{t("umonnun.sections.lyf")}
						</TabsTrigger>
					</TabsList>

					<TabsContent value="dagbok" className="flex flex-col gap-4">
						{/* Mobile + tablet: unchanged */}
						<div className="xl:hidden flex flex-col gap-4">
							<Button
								size="touch"
								onClick={() => setCreateOpen(true)}
								className="w-full"
							>
								<Pencil aria-hidden />
								<span>{t("dagbok.write")}</span>
							</Button>
							<LogFeed />
						</div>

						{/* Desktop xl:+: two-pane */}
						<div className="hidden xl:grid xl:grid-cols-[minmax(380px,1fr)_1.3fr] xl:gap-8">
							<div className="min-w-0">
								<LogFeed />
							</div>
							<aside className="flex flex-col gap-6 min-w-0">
								<LogComposer />
								{activeId ? (
									<LogEntryReader id={activeId} />
								) : (
									<p className="text-ink-soft border-t border-divider pt-4">
										{t("dagbok.detail.noSelection")}
									</p>
								)}
							</aside>
						</div>
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
