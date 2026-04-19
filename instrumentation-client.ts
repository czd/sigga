import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "production",
		sendDefaultPii: true,
		tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
		replaysSessionSampleRate: 0,
		replaysOnErrorSampleRate: 1.0,
		enableLogs: true,
		integrations: [Sentry.replayIntegration()],
	});
}

export const onRouterTransitionStart = dsn
	? Sentry.captureRouterTransitionStart
	: () => {};
