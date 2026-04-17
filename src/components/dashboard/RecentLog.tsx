"use client";

import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { api } from "@/../convex/_generated/api";
import { LogEntryForm } from "@/components/log/LogEntryForm";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { classifyRelative, formatAbsolute } from "@/lib/formatDate";

type LogEntry = FunctionReturnType<typeof api.logEntries.recent>[number];

function useRelativeLabel(timestamp: number): string {
	const locale = useLocale();
	const tCommon = useTranslations("common");
	const classification = classifyRelative(timestamp);
	switch (classification.kind) {
		case "justNow":
			return tCommon("justNow");
		case "minutesAgo":
			return tCommon("minutesAgo", { count: classification.count });
		case "hoursAgo":
			return tCommon("hoursAgo", { count: classification.count });
		case "today":
			return tCommon("today");
		case "yesterday":
			return tCommon("yesterday");
		case "daysAgo":
			return tCommon("daysAgo", { count: classification.count });
		case "absolute":
			return formatAbsolute(timestamp, locale);
	}
}

function LogPreviewInner({ entry }: { entry: LogEntry }) {
	const t = useTranslations("dashboard.recentLog");
	const when = useRelativeLabel(entry._creationTime);
	const authorName = entry.author?.name ?? entry.author?.email ?? null;

	return (
		<>
			<div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">
				{t("eyebrow")}
				<span aria-hidden> · </span>
				<span className="font-normal normal-case tracking-normal text-ink-faint italic">
					{when.toLowerCase()}
				</span>
			</div>
			<blockquote className="font-serif text-[1.3rem] leading-[1.45] text-ink text-balance whitespace-pre-wrap line-clamp-4">
				{"„"}
				{entry.content}
				{"”"}
			</blockquote>
			{authorName ? (
				<div className="flex items-center gap-2.5 text-sm text-ink-faint">
					<UserAvatar
						name={entry.author?.name}
						email={entry.author?.email}
						imageUrl={entry.author?.image}
						className="size-6 text-xs"
					/>
					<span>{t("author", { name: authorName })}</span>
				</div>
			) : null}
		</>
	);
}

export function RecentLog({ entry }: { entry: LogEntry | null | undefined }) {
	const t = useTranslations("dashboard.recentLog");
	const [createOpen, setCreateOpen] = useState(false);

	return (
		<section
			aria-labelledby="recent-log-heading"
			className="flex flex-col gap-4"
		>
			<span id="recent-log-heading" className="sr-only">
				{t("eyebrow")}
			</span>
			{entry === undefined ? null : entry === null ? (
				<p className="text-ink-faint">{t("empty")}</p>
			) : (
				<LogPreviewInner entry={entry} />
			)}
			<button
				type="button"
				onClick={() => setCreateOpen(true)}
				className="w-full rounded-full border bg-transparent px-5 py-4 text-left font-serif text-base italic text-sage-deep transition-colors hover:bg-paper"
				style={{ borderColor: "var(--divider-strong)" }}
			>
				{t("write")}
			</button>
			<LogEntryForm open={createOpen} onOpenChange={setCreateOpen} />
		</section>
	);
}
