"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home() {
	const { signOut } = useAuthActions();
	const me = useQuery(api.users.me);

	return (
		<main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-3xl font-semibold">Sigga</h1>
				{me === undefined ? (
					<p className="text-lg text-muted-foreground">Hleð...</p>
				) : me === null ? (
					<p className="text-lg text-muted-foreground">Ekki innskráður</p>
				) : (
					<p className="text-lg text-muted-foreground">
						Halló {me.name ?? me.email}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => signOut()}
				className="min-h-12 rounded-xl border border-foreground/20 text-foreground text-base font-medium px-6 py-2"
			>
				Skrá út
			</button>
		</main>
	);
}
