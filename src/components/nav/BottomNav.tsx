"use client";

import { useTranslations } from "next-intl";
import { BookIcon } from "@/components/shared/BookIcon";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isActiveRoute, PRIMARY_ITEMS } from "./navItems";

export function BottomNav() {
	const t = useTranslations("nav");
	const pathname = usePathname();

	return (
		<nav
			className="fixed bottom-0 inset-x-0 z-30 pt-6 pb-5 pointer-events-none lg:hidden"
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
					return (
						<li key={href} className="flex-1">
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex flex-col items-center justify-center gap-1.5 min-h-16 px-2 py-2 transition-colors",
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
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
