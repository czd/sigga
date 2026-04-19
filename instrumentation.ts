import * as Sentry from "@sentry/nextjs";

export async function register() {
	const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
	if (!dsn) return;

	const environment =
		process.env.SENTRY_ENVIRONMENT ??
		process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
		"production";

	if (process.env.NEXT_RUNTIME === "nodejs") {
		Sentry.init({
			dsn,
			environment,
			tracesSampleRate: 0.2,
		});
	}

	if (process.env.NEXT_RUNTIME === "edge") {
		Sentry.init({
			dsn,
			environment,
			tracesSampleRate: 0.2,
		});
	}
}

export const onRequestError = Sentry.captureRequestError;
