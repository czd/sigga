"use client";

import { useQuery } from "convex/react";
import { CalendarClock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { LogEntryForm } from "@/components/log/LogEntryForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { cn } from "@/lib/utils";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentForm } from "./AppointmentForm";

type Tab = "upcoming" | "past";
type AppointmentDoc = Doc<"appointments">;

export function AppointmentList() {
	const t = useTranslations("timar");
	const [tab, setTab] = useState<Tab>("upcoming");
	const upcoming = useQuery(
		api.appointments.upcoming,
		tab === "upcoming" ? { limit: 50 } : "skip",
	);
	const past = useQuery(
		api.appointments.past,
		tab === "past" ? { limit: 50 } : "skip",
	);
	const [editTarget, setEditTarget] = useState<AppointmentDoc | null>(null);
	const [logForAppointment, setLogForAppointment] =
		useState<Id<"appointments"> | null>(null);

	const entries = tab === "upcoming" ? upcoming : past;
	const loading = entries === undefined;

	return (
		<>
			<div
				role="tablist"
				aria-label={t("title")}
				className="grid grid-cols-2 rounded-xl border border-border bg-muted p-1"
			>
				{(["upcoming", "past"] as const).map((key) => (
					<button
						key={key}
						type="button"
						role="tab"
						id={`appointment-tab-${key}`}
						aria-controls={`appointment-panel-${key}`}
						aria-selected={tab === key}
						onClick={() => setTab(key)}
						className={cn(
							"min-h-12 rounded-lg text-base font-medium transition-colors",
							tab === key
								? "bg-card text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{t(`tabs.${key}`)}
					</button>
				))}
			</div>

			<div
				role="tabpanel"
				id={`appointment-panel-${tab}`}
				aria-labelledby={`appointment-tab-${tab}`}
			>
				{loading ? (
					<LoadingLine />
				) : entries.length === 0 ? (
					<EmptyState
						icon={<CalendarClock size={40} aria-hidden />}
						title={t(`empty.${tab}`)}
					/>
				) : (
					<ul className="flex flex-col gap-3">
						{entries.map((apt) => (
							<li key={apt._id}>
								<AppointmentCard
									appointment={apt}
									variant={tab}
									onEdit={() => setEditTarget(apt)}
									onLogEntry={
										tab === "past"
											? (id) => setLogForAppointment(id)
											: undefined
									}
								/>
							</li>
						))}
					</ul>
				)}
			</div>

			<AppointmentForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editAppointment={editTarget}
			/>

			<LogEntryForm
				open={logForAppointment !== null}
				onOpenChange={(open) => {
					if (!open) setLogForAppointment(null);
				}}
				preselectedAppointmentId={logForAppointment ?? undefined}
			/>
		</>
	);
}
