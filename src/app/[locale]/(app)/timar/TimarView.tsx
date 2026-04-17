"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { AppointmentList } from "@/components/appointments/AppointmentList";
import { Button } from "@/components/ui/button";

export function TimarView() {
	const t = useTranslations("timar");
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<>
			<div className="px-4 py-6 pb-28 flex flex-col gap-6">
				<h2 className="text-3xl font-semibold">{t("title")}</h2>
				<AppointmentList />
			</div>
			<div
				className="fixed inset-x-0 bottom-16 z-20 flex justify-end px-4 pb-2"
				style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
			>
				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="shadow-lg"
				>
					<Plus aria-hidden />
					<span>{t("new")}</span>
				</Button>
			</div>
			<AppointmentForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
