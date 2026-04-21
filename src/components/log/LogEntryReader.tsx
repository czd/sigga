"use client";

import { useQuery } from "convex/react";
import { CalendarClock, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
	APP_TIME_ZONE,
	classifyRelative,
	formatAbsolute,
	formatAbsoluteWithTime,
} from "@/lib/formatDate";
import { LogEntryForm } from "./LogEntryForm";

function formatEntryDate(timestamp: number, locale: string): string {
	const c = classifyRelative(timestamp);
	const time = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone: APP_TIME_ZONE,
	}).format(new Date(timestamp));
	if (c.kind === "today" || c.kind === "yesterday") {
		return `${formatAbsolute(timestamp, locale)} · ${time}`;
	}
	return `${formatAbsolute(timestamp, locale)} · ${time}`;
}

type Props = {
	id: Id<"logEntries">;
};

export function LogEntryReader({ id }: Props) {
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const entry = useQuery(api.logEntries.get, { id });
	const me = useQuery(api.users.me);
	const [editOpen, setEditOpen] = useState(false);

	if (entry === undefined) {
		return <LoadingLine />;
	}
	if (entry === null) {
		return null;
	}
	const isAuthor = me?._id === entry.author?._id;

	return (
		<div className="flex flex-col gap-4 pt-2 border-t border-divider">
			<div className="flex items-start gap-3">
				<UserAvatar
					name={entry.author?.name}
					email={entry.author?.email}
					imageUrl={entry.author?.image}
					className="size-10"
				/>
				<div className="flex-1 min-w-0">
					<div className="text-base font-medium text-ink leading-tight">
						{entry.author?.name ?? entry.author?.email ?? "—"}
					</div>
					<div className="text-sm text-ink-soft">
						{formatEntryDate(entry._creationTime, locale)}
						{entry.editedAt ? (
							<>
								<span aria-hidden> · </span>
								<span className="italic">{tCommon("edited")}</span>
							</>
						) : null}
					</div>
				</div>
				{isAuthor ? (
					<Button
						variant="ghost"
						size="touch-icon"
						onClick={() => setEditOpen(true)}
						aria-label={tCommon("editItem", {
							title: entry.content.slice(0, 60),
						})}
					>
						<Pencil aria-hidden />
					</Button>
				) : null}
			</div>

			<p className="text-base text-ink whitespace-pre-wrap leading-relaxed">
				{entry.content}
			</p>

			{entry.appointment ? (
				<div className="inline-flex self-start items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1 text-sm text-ink-soft">
					<CalendarClock size={14} aria-hidden />
					<span>
						{entry.appointment.title} ·{" "}
						{formatAbsoluteWithTime(entry.appointment.startTime, locale)}
					</span>
				</div>
			) : null}

			<LogEntryForm
				open={editOpen}
				onOpenChange={setEditOpen}
				editEntry={
					isAuthor
						? {
								id: entry._id,
								content: entry.content,
								relatedAppointmentId: entry.relatedAppointmentId,
							}
						: null
				}
			/>
		</div>
	);
}
