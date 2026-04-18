"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { api } from "@/../convex/_generated/api";
import { BookIcon } from "@/components/shared/BookIcon";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isActiveRoute, type NavItem, PRIMARY_ITEMS } from "./navItems";
import { SidebarAttentionBadge } from "./SidebarAttentionBadge";

const LABEL_TO_COUNT_KEY: Record<
	NavItem["labelKey"],
	"dashboard" | "care" | "paperwork" | null
> = {
	dashboard: "dashboard",
	care: "care",
	people: null,
	paperwork: "paperwork",
	appointments: null,
};

function lastVisitCursor(userId: string | undefined): number {
	if (!userId || typeof window === "undefined") {
		return Date.now() - 3 * 24 * 60 * 60 * 1000;
	}
	const stored = window.localStorage.getItem(`sigga.lastVisit.${userId}`);
	if (!stored) return Date.now() - 3 * 24 * 60 * 60 * 1000;
	const parsed = Number.parseInt(stored, 10);
	return Number.isFinite(parsed)
		? parsed
		: Date.now() - 3 * 24 * 60 * 60 * 1000;
}

export function BottomNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();
	const me = useQuery(api.users.me);
	const counts = useQuery(api.users.attentionCounts);
	const cursorMs = useMemo(() => lastVisitCursor(me?._id), [me?._id]);
	const careCount = useQuery(api.activity.unreadLogCount, { cursorMs });

	return (
		<nav
			className="fixed bottom-0 inset-x-0 z-30 pt-6 pb-5 pointer-events-none md:hidden"
			style={{
				paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
				background:
					"linear-gradient(to top, rgb(245 241 232 / 1) 45%, rgb(245 241 232 / 0.85) 75%, rgb(245 241 232 / 0) 100%)",
				backdropFilter: "blur(6px)",
				WebkitBackdropFilter: "blur(6px)",
			}}
		>
			<ul className="flex items-end justify-around pointer-events-auto font-sans">
				{PRIMARY_ITEMS.map(({ href, labelKey, icon }) => {
					const active = isActiveRoute(pathname, href);
					const countKey = LABEL_TO_COUNT_KEY[labelKey];
					const count =
						countKey === "care"
							? (careCount ?? 0)
							: countKey && counts
								? counts[countKey]
								: 0;
					return (
						<li key={href} className="flex-1">
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"relative flex flex-col items-center justify-center gap-1.5 min-h-16 px-2 py-2 transition-colors",
									active ? "text-sage-shadow" : "text-ink-faint",
								)}
							>
								<BookIcon
									kind={icon}
									size={26}
									strokeWidth={active ? 2 : 1.6}
									filled={active && icon === "today"}
								/>
								<span
									className={cn(
										"text-xs tracking-[0.02em]",
										active ? "font-semibold" : "font-normal",
									)}
								>
									{t(labelKey)}
								</span>
								<SidebarAttentionBadge count={count} compact />
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
