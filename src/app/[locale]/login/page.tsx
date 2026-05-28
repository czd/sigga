"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shared/Logo";

type Mode = "choose" | "code";

export default function LoginPage() {
	const { signIn } = useAuthActions();
	const t = useTranslations();
	const [mode, setMode] = useState<Mode>("choose");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const codeInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (mode === "code") codeInputRef.current?.focus();
	}, [mode]);

	function describeError(err: unknown): string {
		if (err instanceof ConvexError) return String(err.data);
		if (err instanceof Error) return err.message;
		return t("auth.signInFailed");
	}

	async function handleGoogle() {
		setError(null);
		setPending(true);
		try {
			await signIn("google");
		} catch (err) {
			setError(describeError(err));
			setPending(false);
		}
	}

	async function handleCodeSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = code.trim();
		if (!trimmed) {
			setError(t("auth.codeRequired"));
			return;
		}
		setError(null);
		setPending(true);
		try {
			await signIn("family-code", { code: trimmed });
		} catch (err) {
			setError(describeError(err));
			setPending(false);
		}
	}

	function backToChoose() {
		setMode("choose");
		setCode("");
		setError(null);
	}

	return (
		<main className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
			<div className="flex flex-col items-center gap-4 text-center">
				<Logo size={88} className="rounded-[20px] shadow-sm" />
				<div className="flex flex-col gap-2">
					<h1 className="text-3xl font-semibold">{t("app.name")}</h1>
					<p className="text-lg text-muted-foreground">{t("app.tagline")}</p>
				</div>
			</div>

			{mode === "choose" && (
				<div className="flex flex-col gap-3 w-full max-w-sm">
					<button
						type="button"
						onClick={handleGoogle}
						disabled={pending}
						className="min-h-14 w-full rounded-xl bg-foreground text-background text-lg font-medium px-6 py-3 disabled:opacity-60"
					>
						{pending ? t("common.loading") : t("auth.signInWithGoogle")}
					</button>
					<button
						type="button"
						onClick={() => {
							setError(null);
							setMode("code");
						}}
						disabled={pending}
						className="min-h-14 w-full rounded-xl border border-foreground/20 text-lg font-medium px-6 py-3 disabled:opacity-60"
					>
						{t("auth.signInWithCode")}
					</button>
				</div>
			)}

			{mode === "code" && (
				<form
					onSubmit={handleCodeSubmit}
					className="flex flex-col gap-3 w-full max-w-sm"
				>
					<label className="flex flex-col gap-2 text-base">
						<span className="font-medium">{t("auth.codeFieldLabel")}</span>
						<input
							ref={codeInputRef}
							type="text"
							inputMode="text"
							autoComplete="off"
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							required
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder={t("auth.codePlaceholder")}
							className="min-h-14 rounded-xl border border-foreground/20 bg-background text-xl tracking-wide text-center px-4 py-3"
						/>
					</label>
					<p className="text-base text-muted-foreground text-center">
						{t("auth.codeHint")}
					</p>
					<button
						type="submit"
						disabled={pending}
						className="min-h-14 w-full rounded-xl bg-foreground text-background text-lg font-medium px-6 py-3 disabled:opacity-60"
					>
						{pending ? t("auth.signingIn") : t("auth.continue")}
					</button>
					<button
						type="button"
						onClick={backToChoose}
						disabled={pending}
						className="min-h-12 text-base text-muted-foreground underline-offset-4 hover:underline px-4"
					>
						{t("common.back")}
					</button>
				</form>
			)}

			{error && (
				<p className="text-base text-red-600 max-w-sm text-center">{error}</p>
			)}
		</main>
	);
}
