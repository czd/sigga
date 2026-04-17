import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
	locales: ["is", "en"],
	defaultLocale: "is",
	localePrefix: "as-needed",
	localeDetection: false,
});
