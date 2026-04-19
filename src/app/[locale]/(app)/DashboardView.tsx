"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import { AttentionCard } from "@/components/dashboard/AttentionCard";
import { DrivingCta } from "@/components/dashboard/DrivingCta";
import { NextAppointments } from "@/components/dashboard/NextAppointments";
import { RecentLog } from "@/components/dashboard/RecentLog";
import { SinceLastVisit } from "@/components/dashboard/SinceLastVisit";
import { WeekStrip } from "@/components/dashboard/WeekStrip";
import { StackLayout } from "@/components/layout/StackLayout";
import { formatAbsolute } from "@/lib/formatDate";

const URGENT_PATTERN = /br[ýy]nt/i;

function scoreEntitlement(e: {
	status: string;
	notes?: string;
	description?: string;
	updatedAt?: number;
}): number {
	const urgent =
		URGENT_PATTERN.test(e.notes ?? "") ||
		URGENT_PATTERN.test(e.description ?? "");
	const statusWeight = e.status === "in_progress" ? 100 : 50;
	return statusWeight + (urgent ? 1000 : 0);
}

export function DashboardView() {
	const t = useTranslations();
	const locale = useLocale();
	const me = useQuery(api.users.me);
	const appointments = useQuery(api.appointments.upcoming, {
		limit: 5,
		includeCancelled: true,
	});
	const recentEntries = useQuery(api.logEntries.recent, { count: 1 });
	const entitlements = useQuery(api.entitlements.list);

	const [today, setToday] = useState<string | null>(null);
	useEffect(() => {
		setToday(formatAbsolute(Date.now(), locale));
	}, [locale]);

	const firstName = me?.name?.trim().split(/\s+/)[0] ?? null;
	const unassigned =
		appointments?.find((apt) => !apt.driver && apt.status === "upcoming") ??
		null;
	const latestEntry =
		recentEntries === undefined ? undefined : (recentEntries[0] ?? null);
	const attention = entitlements
		?.filter(
			(e) =>
				!e.ownerId &&
				(e.status === "in_progress" || e.status === "not_applied"),
		)
		.slice()
		.sort((a, b) => scoreEntitlement(b) - scoreEntitlement(a))
		.map((e) => ({
			_id: e._id,
			title: e.title,
			appliedTo: e.appliedTo,
			description: e.description,
		}));

	return (
		<StackLayout xlMaxWidth="xl:max-w-[1400px]" className="pt-8 pb-10 gap-8">
			<header className="flex flex-col gap-3">
				<div
					className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
					suppressHydrationWarning
				>
					{today ?? "\u00A0"}
				</div>
				<h1 className="font-serif text-[2.5rem] leading-[1.08] tracking-tight text-balance text-foreground">
					{firstName
						? t.rich("dashboard.greeting", {
								name: firstName,
								em: (chunks) => (
									<em className="italic font-normal">{chunks}</em>
								),
							})
						: t("dashboard.greetingPlain")}
				</h1>
			</header>

			{/* Mobile + tablet: the shipped single-column dashboard */}
			<div className="xl:hidden flex flex-col gap-8">
				<AttentionCard items={attention} />
				{unassigned ? (
					<DrivingCta
						appointment={{
							_id: unassigned._id,
							title: unassigned.title,
							startTime: unassigned.startTime,
							location: unassigned.location,
						}}
					/>
				) : null}
				<NextAppointments appointments={appointments?.slice(0, 3)} />
				<RecentLog entry={latestEntry} />
			</div>

			{/* Desktop xl:+ : the Command Post layout */}
			<div className="hidden xl:flex flex-col gap-8">
				<WeekStrip />
				<div className="grid grid-cols-[1fr_minmax(320px,400px)] gap-8">
					<SinceLastVisit />
					<aside
						aria-labelledby="attention-column-heading"
						className="flex flex-col gap-4"
					>
						<h2
							id="attention-column-heading"
							className="font-serif text-[1.4rem] text-ink font-normal tracking-tight"
						>
							{t("dashboard.attentionColumn.title")}
						</h2>
						<AttentionCard items={attention} />
						{unassigned ? (
							<DrivingCta
								appointment={{
									_id: unassigned._id,
									title: unassigned.title,
									startTime: unassigned.startTime,
									location: unassigned.location,
								}}
							/>
						) : null}
					</aside>
				</div>
			</div>
		</StackLayout>
	);
}
