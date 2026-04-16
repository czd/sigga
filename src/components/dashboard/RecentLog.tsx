"use client";

import { useQuery } from "convex/react";
import { BookOpen, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Link } from "@/i18n/navigation";
import { classifyRelative, formatAbsolute } from "@/lib/formatDate";

function RelativeDate({ timestamp }: { timestamp: number }) {
	const locale = useLocale();
	const tCommon = useTranslations("common");
	const classification = classifyRelative(timestamp);

	switch (classification.kind) {
		case "justNow":
			return <span>{tCommon("justNow")}</span>;
		case "minutesAgo":
			return (
				<span>{tCommon("minutesAgo", { count: classification.count })}</span>
			);
		case "hoursAgo":
			return (
				<span>{tCommon("hoursAgo", { count: classification.count })}</span>
			);
		case "today":
			return <span>{tCommon("today")}</span>;
		case "yesterday":
			return <span>{tCommon("yesterday")}</span>;
		case "daysAgo":
			return <span>{tCommon("daysAgo", { count: classification.count })}</span>;
		case "absolute":
			return <span>{formatAbsolute(timestamp, locale)}</span>;
	}
}

export function RecentLog() {
	const t = useTranslations("dashboard.recentLog");
	const tCommon = useTranslations("common");
	const entries = useQuery(api.logEntries.recent, { count: 3 });

	return (
		<section aria-labelledby="recent-log-heading">
			<h2 id="recent-log-heading" className="text-xl font-semibold mb-3">
				{t("title")}
			</h2>
			{entries === undefined ? (
				<div className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
					{tCommon("loading")}
				</div>
			) : entries.length === 0 ? (
				<EmptyState
					icon={<BookOpen size={36} aria-hidden />}
					title={t("empty")}
					action={
						<Link
							href="/dagbok"
							className="mt-2 inline-flex items-center gap-2 min-h-12 px-5 rounded-xl bg-accent text-accent-foreground font-semibold text-base"
						>
							<Pencil size={18} aria-hidden />
							<span>{t("write")}</span>
						</Link>
					}
				/>
			) : (
				<>
					<ul className="flex flex-col gap-3">
						{entries.map((entry) => (
							<li
								key={entry._id}
								className="rounded-2xl border border-border bg-card p-4 shadow-sm"
							>
								<div className="flex items-center gap-3 mb-2">
									<UserAvatar
										name={entry.author?.name}
										email={entry.author?.email}
										imageUrl={entry.author?.image}
										size={36}
									/>
									<div className="flex-1 min-w-0">
										<div className="text-base font-medium leading-tight truncate">
											{entry.author?.name ?? entry.author?.email ?? "—"}
										</div>
										<div className="text-sm text-muted-foreground">
											<RelativeDate timestamp={entry._creationTime} />
											{entry.editedAt ? (
												<>
													<span aria-hidden> · </span>
													<span>{tCommon("edited")}</span>
												</>
											) : null}
										</div>
									</div>
								</div>
								<p className="text-base whitespace-pre-wrap line-clamp-3">
									{entry.content}
								</p>
								{entry.content.length > 160 ? (
									<Link
										href="/dagbok"
										className="mt-2 inline-block text-base font-medium text-accent"
									>
										{tCommon("readMore")}
									</Link>
								) : null}
							</li>
						))}
					</ul>
					<div className="mt-4 flex justify-center">
						<Link
							href="/dagbok"
							className="inline-flex items-center gap-2 min-h-12 px-5 rounded-xl border border-border bg-card font-semibold text-base hover:bg-muted"
						>
							<Pencil size={18} aria-hidden />
							<span>{t("write")}</span>
						</Link>
					</div>
				</>
			)}
		</section>
	);
}
