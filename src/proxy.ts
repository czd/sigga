import {
	convexAuthNextjsMiddleware,
	createRouteMatcher,
	nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);
const isLoginPage = createRouteMatcher(["/login", "/en/login"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
	// Compute the intl (rewrite/redirect) response first so its RSC content-type
	// headers are established before we branch on auth. Wrapping this in the auth
	// middleware flipped those headers and caused a 500 on RSC prefetches:
	// "Expected RSC response, got text/html".
	const intlResponse = intlMiddleware(request);

	// RSC prefetch requests (from <Link> hover/visible) must never be redirected
	// to an HTML page — the RSC runtime can't parse HTML. If the user isn't
	// authed yet, let the prefetch through with the intl response; the real
	// navigation that follows will hit the auth redirect.
	const isPrefetch = request.headers.get("Next-Router-Prefetch") === "1";
	if (isPrefetch) return intlResponse;

	const authed = await convexAuth.isAuthenticated();
	if (isLoginPage(request) && authed) {
		return nextjsMiddlewareRedirect(request, "/");
	}
	if (!isLoginPage(request) && !authed) {
		return nextjsMiddlewareRedirect(request, "/login");
	}

	return intlResponse;
});

export const config = {
	matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
