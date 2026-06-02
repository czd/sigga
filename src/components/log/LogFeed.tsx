"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { BookOpen, CalendarClock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	APP_TIME_ZONE,
	classifyRelative,
	formatAbsolute,
	formatAbsoluteWithTime,
} from "@/lib/formatDate";
import { CommentButton } from "./CommentButton";
import { LogEntryForm } from "./LogEntryForm";
import { ReactionButton } from "./ReactionButton";
import { SeenByCluster, type SeenByUser } from "./SeenByCluster";

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
		timeZone: APP_TIME_ZONE,
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

	// Read-receipt engine: opening Dagbók means "caught up" — advance my
	// high-water to *now* (not just the newest entry's timestamp) so the
	// care-tab badge, which also counts comments created after the newest
	// journal entry, actually clears on read. Then map every other family
	// member to their "landing entry" for the Messenger-style "seen by"
	// cluster. Using `now` doesn't shift the avatars: no entry exists between
	// the newest entry's time and now, so each person's landing entry is
	// unchanged.
	const markSeen = useMutation(api.journalReads.markSeen);
	const receipts = useQuery(api.journalReads.receipts);
	const newestSeen = entries[0]?._creationTime;

	useEffect(() => {
		if (newestSeen === undefined) return;
		markSeen({ seenThroughTime: Date.now() }).catch(() => {
			// Read-receipt advance is best-effort; never blocks reading.
		});
	}, [newestSeen, markSeen]);

	const landingByEntry = useMemo(() => {
		const map = new Map<Id<"logEntries">, SeenByUser[]>();
		if (!receipts || !me?._id) return map;
		for (const receipt of receipts) {
			if (receipt.userId === me._id) continue;
			// entries are newest-first → the first entry at or below the
			// high-water is this person's landing entry.
			const landing = entries.find(
				(entry) => entry._creationTime <= receipt.lastSeenTime,
			);
			if (!landing) continue;
			const list = map.get(landing._id) ?? [];
			list.push({
				id: receipt.userId,
				name: receipt.name,
				image: receipt.image,
			});
			map.set(landing._id, list);
		}
		return map;
	}, [receipts, entries, me?._id]);

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
					const seenBy = landingByEntry.get(entry._id) ?? [];
					return (
						<li key={entry._id}>
							<Card>
								{isAuthor ? (
									<button
										type="button"
										aria-label={tCommon("editItem", {
											title: entry.content.slice(0, 60),
										})}
										className="block w-full rounded-lg text-left outline-none transition-colors hover:bg-paper-deep/40 focus-visible:ring-3 focus-visible:ring-ring"
										onClick={() =>
											setEditTarget({
												id: entry._id,
												content: entry.content,
												relatedAppointmentId: entry.relatedAppointmentId,
											})
										}
									>
										{body}
									</button>
								) : (
									body
								)}
								<div className="flex flex-wrap items-center gap-1 border-t border-divider px-4 pt-3">
									<ReactionButton
										logEntryId={entry._id}
										count={entry.reactionCount}
										reactedByMe={entry.reactedByMe}
										reactorNames={entry.reactorNames}
									/>
									<CommentButton
										targetType="logEntry"
										targetId={entry._id}
										count={entry.commentCount}
										summary={entry.content.slice(0, 80)}
									/>
									<SeenByCluster users={seenBy} />
								</div>
							</Card>
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
