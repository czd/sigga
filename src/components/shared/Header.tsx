"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import { UserAvatar } from "./UserAvatar";

export function Header() {
	const t = useTranslations();
	const { signOut } = useAuthActions();
	const me = useQuery(api.users.me);

	return (
		<header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="flex items-center justify-between px-4 py-3">
				<h1 className="text-2xl font-semibold tracking-tight text-accent">
					{t("app.name")}
				</h1>
				<details className="relative">
					<summary className="list-none cursor-pointer select-none focus:outline-none">
						<span className="sr-only">{me?.name ?? me?.email ?? ""}</span>
						<UserAvatar
							name={me?.name}
							email={me?.email}
							imageUrl={me?.image}
							size={44}
						/>
					</summary>
					<div className="absolute right-0 mt-2 min-w-56 rounded-2xl border border-border bg-card text-card-foreground shadow-lg p-3 z-40">
						<div className="px-2 pb-3 border-b border-border">
							<div className="text-base font-medium leading-tight">
								{me?.name ?? "—"}
							</div>
							{me?.email ? (
								<div className="text-sm text-muted-foreground mt-0.5 break-all">
									{me.email}
								</div>
							) : null}
						</div>
						<button
							type="button"
							onClick={() => signOut()}
							className="mt-2 w-full min-h-12 rounded-xl flex items-center gap-3 px-3 text-base font-medium text-foreground hover:bg-muted active:bg-muted"
						>
							<LogOut size={20} aria-hidden />
							<span>{t("auth.signOut")}</span>
						</button>
					</div>
				</details>
			</div>
		</header>
	);
}
