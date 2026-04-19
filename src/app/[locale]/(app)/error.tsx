"use client";

import * as Sentry from "@sentry/nextjs";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { api } from "@/../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function AppError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const t = useTranslations("errors");
	const logEvent = useMutation(api.events.log);

	useEffect(() => {
		Sentry.captureException(error);
		logEvent({
			type: "error",
			path:
				typeof window !== "undefined" ? window.location.pathname : undefined,
			message: error.message,
			stack: error.stack,
			userAgent:
				typeof navigator !== "undefined" ? navigator.userAgent : undefined,
			metadata: error.digest ? `digest=${error.digest}` : undefined,
		}).catch(() => {});
	}, [error, logEvent]);

	return (
		<div className="flex flex-col items-center justify-center gap-6 px-6 py-20 text-center">
			<h1 className="font-serif text-3xl font-normal">{t("title")}</h1>
			<p className="max-w-md text-lg text-ink-faint">{t("body")}</p>
			<Button size="touch" onClick={reset}>
				{t("retry")}
			</Button>
		</div>
	);
}
