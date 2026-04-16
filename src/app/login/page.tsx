"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { useState } from "react";

export default function LoginPage() {
	const { signIn } = useAuthActions();
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
						: "Innskráning tókst ekki. Reyndu aftur.";
			setError(message);
			setPending(false);
		}
	}

	return (
		<main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-3xl font-semibold">Sigga</h1>
				<p className="text-lg text-muted-foreground">
					Fjölskyldusamráð um umönnun Siggu
				</p>
			</div>
			<button
				type="button"
				onClick={handleSignIn}
				disabled={pending}
				className="min-h-14 w-full max-w-sm rounded-xl bg-foreground text-background text-lg font-medium px-6 py-3 disabled:opacity-60"
			>
				{pending ? "Hleð..." : "Skrá inn með Google"}
			</button>
			{error && (
				<p className="text-base text-red-600 max-w-sm text-center">{error}</p>
			)}
		</main>
	);
}
