"use client";

import {
	BookOpen,
	CalendarClock,
	ClipboardList,
	Home,
	type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
	href: "/" | "/dagbok" | "/timar" | "/upplysingr";
	labelKey: "dashboard" | "log" | "appointments" | "info";
	icon: LucideIcon;
};

const ITEMS: NavItem[] = [
	{ href: "/", labelKey: "dashboard", icon: Home },
	{ href: "/dagbok", labelKey: "log", icon: BookOpen },
	{ href: "/timar", labelKey: "appointments", icon: CalendarClock },
	{ href: "/upplysingr", labelKey: "info", icon: ClipboardList },
];

function isActive(pathname: string, href: NavItem["href"]): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();

	return (
		<nav
			className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card"
			style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
		>
			<ul className="flex">
				{ITEMS.map(({ href, labelKey, icon: Icon }) => {
					const active = isActive(pathname, href);
					return (
						<li key={href} className="flex-1">
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex flex-col items-center justify-center gap-1 min-h-16 px-2 py-2 text-sm transition-colors",
									active
										? "text-primary font-semibold"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								<Icon
									size={26}
									aria-hidden
									strokeWidth={active ? 2.5 : 2}
									fill={active ? "currentColor" : "none"}
									fillOpacity={active ? 0.15 : undefined}
								/>
								<span>{t(labelKey)}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
