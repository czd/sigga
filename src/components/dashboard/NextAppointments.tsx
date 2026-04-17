"use client";

import { useMutation, useQuery } from "convex/react";
import { CalendarClock, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

export function NextAppointments() {
	const t = useTranslations("dashboard.nextAppointments");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const appointments = useQuery(api.appointments.upcoming, { limit: 3 });
	const volunteer = useMutation(api.appointments.volunteerToDrive);
	const [pendingId, setPendingId] = useState<Id<"appointments"> | null>(null);

	async function handleVolunteer(id: Id<"appointments">) {
		setPendingId(id);
		try {
			await volunteer({ id });
		} finally {
			setPendingId((current) => (current === id ? null : current));
		}
	}

	return (
		<section aria-labelledby="next-appointments-heading">
			<h2 id="next-appointments-heading" className="text-xl font-semibold mb-3">
				{t("title")}
			</h2>
			{appointments === undefined ? (
				<Card>
					<CardContent className="text-muted-foreground py-2">
						{tCommon("loading")}
					</CardContent>
				</Card>
			) : appointments.length === 0 ? (
				<EmptyState
					icon={<CalendarClock size={36} aria-hidden />}
					title={t("empty")}
				/>
			) : (
				<ul className="flex flex-col gap-3">
					{appointments.map((apt) => (
						<li key={apt._id}>
							<Card>
								<CardContent className="flex flex-col gap-3">
									<div className="flex flex-col">
										<div className="text-sm text-muted-foreground">
											{formatAbsoluteWithTime(apt.startTime, locale)}
										</div>
										<h3 className="text-lg font-semibold mt-0.5 leading-snug">
											{apt.title}
										</h3>
										{apt.location ? (
											<div className="mt-1 flex items-center gap-1.5 text-base text-muted-foreground">
												<MapPin size={18} aria-hidden />
												<span>{apt.location}</span>
											</div>
										) : null}
									</div>
									<div className="pt-3 border-t border-border flex items-center justify-between gap-3 min-h-12">
										{apt.driver ? (
											<div className="flex items-center gap-2 min-w-0">
												<UserAvatar
													name={apt.driver.name}
													email={apt.driver.email}
													imageUrl={apt.driver.image}
													className="size-8"
												/>
												<span className="text-base truncate">
													{apt.driver.name ?? apt.driver.email ?? t("driver")}
												</span>
											</div>
										) : (
											<>
												<span className="text-base text-muted-foreground">
													{t("noDriver")}
												</span>
												<Button
													size="touch"
													onClick={() => handleVolunteer(apt._id)}
													disabled={pendingId === apt._id}
												>
													{t("volunteer")}
												</Button>
											</>
										)}
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
