"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";

export default function DashboardPage() {
	const t = useTranslations();
	const me = useQuery(api.users.me);

	return (
		<div className="px-4 py-6 flex flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h2 className="text-3xl font-semibold">{t("dashboard.title")}</h2>
				{me === undefined ? (
					<p className="text-muted-foreground">{t("common.loading")}</p>
				) : me ? (
					<p className="text-muted-foreground">
						{t("auth.greetingWithName", { name: me.name ?? me.email ?? "" })}
					</p>
				) : null}
			</header>
			<section className="rounded-2xl border border-border bg-card p-6 text-card-foreground">
				<p className="text-muted-foreground">{t("common.comingSoon")}</p>
			</section>
		</div>
	);
}
