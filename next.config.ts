import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
	skipProxyUrlNormalize: true,
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "lh3.googleusercontent.com" },
		],
	},
};

const withIntl = withNextIntl(nextConfig);

const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;
const sentryDsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryDsn && sentryOrg && sentryProject
	? withSentryConfig(withIntl, {
			org: sentryOrg,
			project: sentryProject,
			silent: !process.env.CI,
			widenClientFileUpload: true,
			disableLogger: true,
		})
	: withIntl;
