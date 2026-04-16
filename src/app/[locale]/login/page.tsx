"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function LoginPage() {
	const { signIn } = useAuthActions();
	const t = useTranslations();
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function handleSignIn() {
		setError(null);
		setPending(true);
		try {
			await signIn("google");
		} catch (err) {
			const message =
				err instanceof ConvexError
					? String(err.data)
					: err instanceof Error
						? err.message
						: t("auth.signInFailed");
			setError(message);
			setPending(false);
		}
	}

	return (
		<main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-3xl font-semibold">{t("app.name")}</h1>
				<p className="text-lg text-muted-foreground">{t("app.tagline")}</p>
			</div>
			<button
				type="button"
				onClick={handleSignIn}
				disabled={pending}
				className="min-h-14 w-full max-w-sm rounded-xl bg-foreground text-background text-lg font-medium px-6 py-3 disabled:opacity-60"
			>
				{pending ? t("common.loading") : t("auth.signInWithGoogle")}
			</button>
			{error && (
				<p className="text-base text-red-600 max-w-sm text-center">{error}</p>
			)}
		</main>
	);
}
