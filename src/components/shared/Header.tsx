"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";

export function Header() {
	const t = useTranslations();
	const { signOut } = useAuthActions();
	const me = useQuery(api.users.me);

	return (
		<header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
			<div className="flex items-center justify-between px-6 pt-5 pb-2">
				<h1 className="font-serif italic text-base font-normal text-ink-faint tracking-wide">
					{t("app.name").toLowerCase()}
				</h1>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
							aria-label={me?.name ?? me?.email ?? ""}
						>
							<UserAvatar
								name={me?.name}
								email={me?.email}
								imageUrl={me?.image}
								className="size-9 text-sm"
							/>
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-56">
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
		</header>
	);
}
