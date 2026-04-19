"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { BookOpen, CalendarClock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	classifyRelative,
	formatAbsolute,
	formatAbsoluteWithTime,
} from "@/lib/formatDate";
import { LogEntryForm } from "./LogEntryForm";

type EditTarget = {
	id: Id<"logEntries">;
	content: string;
	relatedAppointmentId: Id<"appointments"> | undefined;
};

function formatEntryDate(timestamp: number, locale: string): string {
	const classification = classifyRelative(timestamp);
	const time = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(new Date(timestamp));
	switch (classification.kind) {
		case "justNow":
		case "minutesAgo":
		case "hoursAgo":
		case "today":
		case "yesterday":
		case "daysAgo":
		case "absolute":
			return `${formatAbsolute(timestamp, locale)} · ${time}`;
	}
}

export function LogFeed() {
	const t = useTranslations("dagbok");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const me = useQuery(api.users.me);
	const {
		results: entries,
		status,
		loadMore,
	} = usePaginatedQuery(api.logEntries.list, {}, { initialNumItems: 20 });

	const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

	if (status === "LoadingFirstPage") {
		return <LoadingLine />;
	}

	if (entries.length === 0) {
		return (
			<EmptyState
				icon={<BookOpen size={40} aria-hidden />}
				title={t("empty")}
				description={t("emptyHint")}
			/>
		);
	}

	return (
		<>
			<ul className="flex flex-col gap-3">
				{entries.map((entry) => {
					const isAuthor = me?._id === entry.author?._id;
					const body = (
						<CardContent className="flex flex-col gap-3">
							<div className="flex items-start gap-3">
								<UserAvatar
									name={entry.author?.name}
									email={entry.author?.email}
									imageUrl={entry.author?.image}
									className="size-10"
								/>
								<div className="flex-1 min-w-0">
									<h3 className="text-base font-medium leading-tight truncate">
										{entry.author?.name ?? entry.author?.email ?? "—"}
									</h3>
									<div className="text-sm text-muted-foreground">
										<time
											dateTime={new Date(entry._creationTime).toISOString()}
										>
											{formatEntryDate(entry._creationTime, locale)}
										</time>
										{entry.editedAt ? (
											<>
												<span aria-hidden> · </span>
												<span className="italic">{tCommon("edited")}</span>
											</>
										) : null}
									</div>
								</div>
							</div>
							<p className="text-base whitespace-pre-wrap">{entry.content}</p>
							{entry.appointment ? (
								<div className="inline-flex self-start items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-sm text-muted-foreground">
									<CalendarClock size={14} aria-hidden />
									<span className="sr-only">{t("linkedAppointment")}: </span>
									<span>
										{entry.appointment.title} ·{" "}
										{formatAbsoluteWithTime(
											entry.appointment.startTime,
											locale,
										)}
									</span>
								</div>
							) : null}
						</CardContent>
					);
					return (
						<li key={entry._id}>
							{isAuthor ? (
								<button
									type="button"
									aria-label={tCommon("editItem", {
										title: entry.content.slice(0, 60),
									})}
									className="block w-full text-left rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring"
									onClick={() =>
										setEditTarget({
											id: entry._id,
											content: entry.content,
											relatedAppointmentId: entry.relatedAppointmentId,
										})
									}
								>
									<Card className="transition-colors hover:bg-paper-deep/40">
										{body}
									</Card>
								</button>
							) : (
								<Card>{body}</Card>
							)}
						</li>
					);
				})}
			</ul>
			{status === "CanLoadMore" ? (
				<div className="mt-4 flex justify-center">
					<Button variant="outline" size="touch" onClick={() => loadMore(20)}>
						{t("showOlder")}
					</Button>
				</div>
			) : null}
			{status === "LoadingMore" ? <LoadingLine className="mt-4" /> : null}
			<LogEntryForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editEntry={editTarget}
			/>
		</>
	);
}
