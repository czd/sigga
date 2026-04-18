"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { SeriesEntryRow } from "@/components/timar/SeriesEntryRow";
import { Button } from "@/components/ui/button";

export function TimarView() {
	const t = useTranslations("timar");
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<>
			<div className="px-4 py-6 pb-28 flex flex-col gap-6">
				<h2 className="text-3xl font-semibold">{t("title")}</h2>
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
			</div>
			<AppointmentForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
