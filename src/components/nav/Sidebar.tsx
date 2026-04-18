"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { ChevronUp, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { BookIcon } from "@/components/shared/BookIcon";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { isActiveRoute, PRIMARY_ITEMS } from "./navItems";

export function Sidebar() {
	const t = useTranslations();
	const navT = useTranslations("nav");
	const pathname = usePathname();
	const { signOut } = useAuthActions();
	const me = useQuery(api.users.me);

	const displayName = me?.name?.trim() || me?.email || "";

	return (
		<aside
			className="hidden md:flex fixed inset-y-0 left-0 z-30 w-[248px] flex-col bg-page border-r border-divider"
			aria-label={t("app.name")}
		>
			<div className="px-6 pt-7 pb-6">
				<span className="font-serif italic text-base font-normal text-ink-faint tracking-wide">
					{t("app.name").toLowerCase()}
				</span>
			</div>

			<nav className="flex-1 flex flex-col gap-1 px-3 font-sans">
				<ul className="flex flex-col gap-1">
					{PRIMARY_ITEMS.map(({ href, labelKey, icon }) => {
						const active = isActiveRoute(pathname, href);
						return (
							<li key={href}>
								<Link
									href={href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"flex items-center gap-3 px-3 min-h-12 rounded-2xl text-base transition-colors",
										active
											? "bg-paper text-sage-shadow font-semibold"
											: "text-ink-soft hover:bg-paper/80",
									)}
								>
									<BookIcon
										kind={icon}
										size={22}
										strokeWidth={active ? 2 : 1.6}
										filled={active && icon === "today"}
									/>
									<span>{navT(labelKey)}</span>
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			<div className="mt-auto px-3 pb-6">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="w-full flex items-center gap-3 px-3 min-h-12 rounded-2xl text-left text-ink-soft hover:bg-paper/80 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							aria-label={displayName}
						>
							<UserAvatar
								name={me?.name}
								email={me?.email}
								imageUrl={me?.image}
								className="size-8 text-xs"
							/>
							<span className="flex-1 truncate text-sm">{displayName}</span>
							<ChevronUp aria-hidden className="size-4 text-ink-faint" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" side="top" className="min-w-56">
						<DropdownMenuLabel className="flex flex-col gap-0.5">
							<span className="text-base font-medium leading-tight">
								{me?.name ?? "—"}
							</span>
							{me?.email ? (
								<span className="text-sm font-normal text-muted-foreground break-all">
									{me.email}
								</span>
							) : null}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Button
								variant="ghost"
								size="touch"
								onClick={() => signOut()}
								className="w-full justify-start"
							>
								<LogOut aria-hidden />
								<span>{t("auth.signOut")}</span>
							</Button>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</aside>
	);
}
