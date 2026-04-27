"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/shared/Logo";

type Mode = "choose" | "email" | "code";

export default function LoginPage() {
	const { signIn } = useAuthActions();
	const t = useTranslations();
	const [mode, setMode] = useState<Mode>("choose");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [resent, setResent] = useState(false);
	const emailInputRef = useRef<HTMLInputElement>(null);
	const codeInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (mode === "email") emailInputRef.current?.focus();
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

	async function handleRequestCode(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = email.trim();
		if (!trimmed) {
			setError(t("auth.emailRequired"));
			return;
		}
		setError(null);
		setPending(true);
		try {
			await signIn("resend-otp", { email: trimmed });
			setEmail(trimmed);
			setMode("code");
			setResent(false);
		} catch (err) {
			setError(describeError(err));
		} finally {
			setPending(false);
		}
	}

	async function handleResendCode() {
		setError(null);
		setPending(true);
		setResent(false);
		try {
			await signIn("resend-otp", { email });
			setResent(true);
		} catch (err) {
			setError(describeError(err));
		} finally {
			setPending(false);
		}
	}

	async function handleVerifyCode(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = code.trim();
		if (!trimmed) {
			setError(t("auth.codeRequired"));
			return;
		}
		setError(null);
		setPending(true);
		try {
			await signIn("resend-otp", { email, code: trimmed });
		} catch (err) {
			setError(describeError(err));
			setPending(false);
		}
	}

	function backToChoose() {
		setMode("choose");
		setEmail("");
		setCode("");
		setError(null);
		setResent(false);
	}

	function backToEmail() {
		setMode("email");
		setCode("");
		setError(null);
		setResent(false);
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
							setMode("email");
						}}
						disabled={pending}
						className="min-h-14 w-full rounded-xl border border-foreground/20 text-lg font-medium px-6 py-3 disabled:opacity-60"
					>
						{t("auth.signInWithEmail")}
					</button>
				</div>
			)}

			{mode === "email" && (
				<form
					onSubmit={handleRequestCode}
					className="flex flex-col gap-3 w-full max-w-sm"
				>
					<label className="flex flex-col gap-2 text-base">
						<span className="font-medium">{t("auth.email")}</span>
						<input
							ref={emailInputRef}
							type="email"
							inputMode="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder={t("auth.emailPlaceholder")}
							className="min-h-14 rounded-xl border border-foreground/20 bg-background text-lg px-4 py-3"
						/>
					</label>
					<button
						type="submit"
						disabled={pending}
						className="min-h-14 w-full rounded-xl bg-foreground text-background text-lg font-medium px-6 py-3 disabled:opacity-60"
					>
						{pending ? t("auth.sendingCode") : t("auth.sendCode")}
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

			{mode === "code" && (
				<form
					onSubmit={handleVerifyCode}
					className="flex flex-col gap-3 w-full max-w-sm"
				>
					<p className="text-base text-muted-foreground text-center">
						{t("auth.codeSent", { email })}
					</p>
					<label className="flex flex-col gap-2 text-base">
						<span className="font-medium">{t("auth.codeLabel")}</span>
						<input
							ref={codeInputRef}
							type="text"
							inputMode="numeric"
							autoComplete="one-time-code"
							pattern="[0-9]*"
							required
							value={code}
							onChange={(e) => setCode(e.target.value)}
							maxLength={6}
							className="min-h-14 rounded-xl border border-foreground/20 bg-background text-2xl tracking-[0.4em] text-center px-4 py-3"
						/>
					</label>
					<button
						type="submit"
						disabled={pending}
						className="min-h-14 w-full rounded-xl bg-foreground text-background text-lg font-medium px-6 py-3 disabled:opacity-60"
					>
						{pending ? t("auth.verifying") : t("auth.verify")}
					</button>
					<div className="flex flex-col gap-1 items-center pt-1">
						<button
							type="button"
							onClick={handleResendCode}
							disabled={pending}
							className="min-h-12 text-base underline-offset-4 hover:underline px-4"
						>
							{t("auth.resendCode")}
						</button>
						<button
							type="button"
							onClick={backToEmail}
							disabled={pending}
							className="min-h-12 text-base text-muted-foreground underline-offset-4 hover:underline px-4"
						>
							{t("auth.useDifferentEmail")}
						</button>
					</div>
					{resent && !error && (
						<p className="text-base text-muted-foreground text-center">
							{t("auth.codeResent")}
						</p>
					)}
				</form>
			)}

			{error && (
				<p className="text-base text-red-600 max-w-sm text-center">{error}</p>
			)}
		</main>
	);
}
