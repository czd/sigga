"use client";

import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { StackLayout } from "@/components/layout/StackLayout";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAbsoluteWithTime } from "@/lib/formatDate";

function formatLastActive(
	ts: number | null,
	locale: string,
	t: ReturnType<typeof useTranslations>,
): string {
	if (ts === null) return t("admin.usage.never");
	return formatAbsoluteWithTime(ts, locale);
}

export function UsageView() {
	const t = useTranslations();
	const locale = useLocale();
	const isAdmin = useQuery(api.events.isAdmin);
	const usage = useQuery(
		api.events.usage,
		isAdmin ? { sinceDays: 30 } : "skip",
	);
	const errors = useQuery(
		api.events.recentErrors,
		isAdmin ? { limit: 25 } : "skip",
	);

	if (isAdmin === undefined) {
		return (
			<StackLayout className="pt-8 pb-10">
				<LoadingLine />
			</StackLayout>
		);
	}

	if (!isAdmin) {
		return (
			<StackLayout className="pt-8 pb-10 gap-3">
				<h1 className="font-serif text-[2rem] leading-tight font-normal">
					{t("admin.usage.notAuthorizedTitle")}
				</h1>
				<p className="text-base text-ink-soft">
					{t("admin.usage.notAuthorizedBody")}
				</p>
			</StackLayout>
		);
	}

	return (
		<StackLayout className="pt-8 pb-10 gap-8">
			<header className="flex flex-col gap-2">
				<h1 className="font-serif text-[2rem] leading-tight font-normal">
					{t("admin.usage.title")}
				</h1>
				<p className="text-base text-ink-soft">{t("admin.usage.subtitle")}</p>
			</header>

			<section className="flex flex-col gap-3">
				<h2 className="font-serif text-xl font-normal">
					{t("admin.usage.peopleHeading")}
				</h2>
				{usage === undefined ? (
					<LoadingLine />
				) : usage.length === 0 ? (
					<p className="text-ink-soft">{t("admin.usage.empty")}</p>
				) : (
					<ul className="flex flex-col gap-2">
						{usage.map((row) => (
							<li key={row.user._id}>
								<Card size="sm">
									<CardHeader>
										<CardTitle className="flex items-center gap-3">
											<UserAvatar
												name={row.user.name}
												email={row.user.email}
												imageUrl={row.user.image}
												className="size-10"
											/>
											<div className="flex flex-col gap-0.5">
												<span className="text-base font-medium">
													{row.user.name ?? row.user.email ?? "—"}
												</span>
												{row.user.email && row.user.name ? (
													<span className="text-xs font-normal text-ink-soft">
														{row.user.email}
													</span>
												) : null}
											</div>
										</CardTitle>
									</CardHeader>
									<CardContent className="flex flex-col gap-2 text-sm">
										<div className="text-ink-soft">
											{t("admin.usage.lastActive")}:{" "}
											<span className="text-ink">
												{formatLastActive(row.lastActiveAt, locale, t)}
											</span>
										</div>
										<div className="flex flex-wrap gap-x-5 gap-y-1 text-ink-soft">
											<span>
												{t("admin.usage.appOpens")}:{" "}
												<strong className="text-ink">{row.appOpens}</strong>
											</span>
											<span>
												{t("admin.usage.pageViews")}:{" "}
												<strong className="text-ink">{row.pageViews}</strong>
											</span>
											<span>
												{t("admin.usage.errors")}:{" "}
												<strong
													className={
														row.errors > 0 ? "text-destructive" : "text-ink"
													}
												>
													{row.errors}
												</strong>
											</span>
										</div>
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="font-serif text-xl font-normal">
					{t("admin.usage.errorsHeading")}
				</h2>
				{errors === undefined ? (
					<LoadingLine />
				) : errors.length === 0 ? (
					<p className="text-ink-soft">{t("admin.usage.noErrors")}</p>
				) : (
					<ul className="flex flex-col gap-2">
						{errors.map((e) => (
							<li key={e._id}>
								<Card size="sm">
									<CardHeader>
										<CardTitle className="text-sm font-medium">
											{e.user?.name ??
												e.user?.email ??
												t("admin.usage.unknownUser")}
											<span className="ml-2 font-normal text-ink-soft">
												· {formatAbsoluteWithTime(e._creationTime, locale)}
											</span>
										</CardTitle>
									</CardHeader>
									<CardContent className="flex flex-col gap-2">
										{e.path ? (
											<div className="text-xs text-ink-soft break-all">
												{e.path}
											</div>
										) : null}
										<div className="text-sm text-destructive break-words">
											{e.message ?? "—"}
										</div>
										{e.stack ? (
											<pre className="max-h-48 overflow-auto rounded bg-muted/50 p-2 text-[11px] leading-relaxed whitespace-pre-wrap break-all">
												{e.stack}
											</pre>
										) : null}
										{e.userAgent ? (
											<div className="text-[11px] text-ink-soft break-all">
												{e.userAgent}
											</div>
										) : null}
									</CardContent>
								</Card>
							</li>
						))}
					</ul>
				)}
			</section>
		</StackLayout>
	);
}
