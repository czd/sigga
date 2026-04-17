"use client";

import { useTranslations } from "next-intl";
import type { Id } from "@/../convex/_generated/dataModel";
import { Link } from "@/i18n/navigation";

export type AttentionItem = {
	_id: Id<"entitlements">;
	title: string;
	appliedTo?: string;
	description?: string;
};

export function AttentionCard({
	items,
}: {
	items: AttentionItem[] | undefined;
}) {
	const t = useTranslations("dashboard.attention");
	if (!items || items.length === 0) return null;
	const top = items[0];
	const summary = top.description ?? top.appliedTo ?? "";
	const body = summary ? `${top.title} — ${summary}` : top.title;
	const extraCount = items.length - 1;

	const eyebrow = t("eyebrow", { count: items.length });
	return (
		<section
			aria-label={eyebrow}
			className="relative overflow-hidden rounded-[22px] px-5 py-5"
			style={{
				background:
					"linear-gradient(135deg, var(--amber-bg-1) 0%, var(--amber-bg-2) 100%)",
				color: "var(--amber-ink-deep)",
			}}
		>
			<div
				className="text-xs font-semibold uppercase tracking-[0.14em]"
				style={{ color: "var(--amber-ink)" }}
			>
				{eyebrow}
			</div>
			<p className="font-serif text-[1.2rem] leading-[1.35] mt-1.5 text-balance">
				{body}
			</p>
			<div className="mt-4 flex items-center gap-2">
				<Link
					href="/pappirar"
					className="rounded-full px-4 py-2.5 text-sm font-semibold text-paper"
					style={{ background: "var(--amber-ink-deep)" }}
				>
					{t("take")}
				</Link>
				<Link
					href="/pappirar"
					className="px-2 py-2.5 text-sm font-medium"
					style={{ color: "var(--amber-ink)" }}
				>
					{t("later")}
				</Link>
			</div>
			{extraCount > 0 ? (
				<Link
					href="/pappirar"
					className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-sm"
					style={{
						borderColor:
							"color-mix(in oklab, var(--amber-ink), transparent 70%)",
						color: "var(--amber-ink)",
					}}
				>
					<span>{t("more", { count: extraCount })}</span>
					<span className="font-medium underline-offset-2 hover:underline">
						{t("seeAll")} →
					</span>
				</Link>
			) : null}
		</section>
	);
}
