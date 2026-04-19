"use client";

import { useQuery } from "convex/react";
import { BookOpen, CalendarPlus, FileCheck, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { classifyRelative, formatAbsolute } from "@/lib/formatDate";

function formatRelative(
	ts: number,
	locale: string,
	tCommon: ReturnType<typeof useTranslations>,
): string {
	const c = classifyRelative(ts);
	switch (c.kind) {
		case "justNow":
			return tCommon("justNow");
		case "minutesAgo":
		case "hoursAgo":
		case "daysAgo":
			return tCommon(c.kind, { count: c.count });
		case "today":
			return tCommon("today");
		case "yesterday":
			return tCommon("yesterday");
		default:
			return formatAbsolute(ts, locale);
	}
}

export function SinceLastVisit() {
	const t = useTranslations("dashboard.sinceLastVisit");
	const tCommon = useTranslations("common");
	const tStatuses = useTranslations("entitlements.statuses");
	const locale = useLocale();
	const me = useQuery(api.users.me);

	const cursorMs = useMemo(() => {
		if (!me?._id || typeof window === "undefined") {
			return Date.now() - 3 * 24 * 60 * 60 * 1000;
		}
		const stored = window.localStorage.getItem(`sigga.lastVisit.${me._id}`);
		const parsed = stored ? Number.parseInt(stored, 10) : NaN;
		return Number.isFinite(parsed)
			? parsed
			: Date.now() - 3 * 24 * 60 * 60 * 1000;
	}, [me?._id]);

	const items = useQuery(api.activity.sinceLastVisit, { cursorMs, limit: 12 });

	// Update lastVisit cursor on mount (so next load starts fresh)
	useEffect(() => {
		if (!me?._id || typeof window === "undefined") return;
		window.localStorage.setItem(
			`sigga.lastVisit.${me._id}`,
			String(Date.now()),
		);
	}, [me?._id]);

	return (
		<section
			aria-labelledby="since-last-visit-heading"
			className="flex flex-col gap-3"
		>
			<h2
				id="since-last-visit-heading"
				className="font-serif text-[1.4rem] text-ink font-normal tracking-tight"
			>
				{t("title")}
			</h2>

			{items === undefined ? (
				<LoadingLine />
			) : items.length === 0 ? (
				<p className="text-ink-soft">{t("empty")}</p>
			) : (
				<ul className="flex flex-col divide-y divide-divider">
					{items.map((item) => (
						<li
							key={`${item.kind}-${item.id}`}
							className="flex items-start gap-3 py-3"
							style={{ fontSize: "var(--text-body-dense)" }}
						>
							<div className="text-ink-soft mt-0.5">
								{item.kind === "log" ? (
									<BookOpen size={16} aria-hidden />
								) : item.kind === "appointment" ? (
									<CalendarPlus size={16} aria-hidden />
								) : item.kind === "document" ? (
									<FileText size={16} aria-hidden />
								) : (
									<FileCheck size={16} aria-hidden />
								)}
							</div>
							<div className="flex-1 min-w-0">
								<div className="text-ink">
									{item.kind === "log"
										? t("log", { name: item.authorName })
										: item.kind === "appointment"
											? t("appointment", {
													name: item.createdByName,
													title: item.title,
												})
											: item.kind === "document"
												? t("document", {
														name: item.addedByName,
														fileName: item.fileName,
													})
												: t("entitlementStatus", {
														name: item.updatedByName,
														title: item.title,
														newStatus: tStatuses(
															item.newStatus as
																| "in_progress"
																| "not_applied"
																| "approved"
																| "denied",
														),
													})}
								</div>
								{item.kind === "log" && item.preview ? (
									<div className="text-ink-soft mt-0.5 line-clamp-1 italic">
										{item.preview}
									</div>
								) : null}
							</div>
							<div className="flex-shrink-0 text-ink-soft text-xs">
								{formatRelative(item.ts, locale, tCommon)}
							</div>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
