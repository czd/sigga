"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { CalendarView } from "@/components/timar/CalendarView";
import { SeriesEntryRow } from "@/components/timar/SeriesEntryRow";
import { Button } from "@/components/ui/button";

/**
 * Tímar view splits sharply by breakpoint:
 * - Mobile + tablet (<xl): the shipped list + create-button + recurring-row flow.
 * - Desktop (xl+): the full-width CalendarView (month/week/list switcher +
 *   inline detail pane). No list-on-left-calendar-on-right hybrid — that
 *   was the old confusing layout.
 */
export function TimarView() {
	const t = useTranslations("timar");
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<>
			{/* Mobile + tablet */}
			<div className="xl:hidden flex flex-col gap-6">
				<h1 className="font-serif text-[2.25rem] leading-[1.08] tracking-tight text-ink text-balance">
					{t("title")}
				</h1>
				<SeriesEntryRow />
				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="w-full"
				>
					<Plus aria-hidden />
					<span>{t("new")}</span>
				</Button>
				<AppointmentList />
				<AppointmentForm open={createOpen} onOpenChange={setCreateOpen} />
			</div>

			{/* Desktop */}
			<div className="hidden xl:block">
				<CalendarView />
			</div>
		</>
	);
}
