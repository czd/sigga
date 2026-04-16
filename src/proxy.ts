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
	const authed = await convexAuth.isAuthenticated();

	if (isLoginPage(request) && authed) {
		return nextjsMiddlewareRedirect(request, "/");
	}
	if (!isLoginPage(request) && !authed) {
		return nextjsMiddlewareRedirect(request, "/login");
	}

	return intlMiddleware(request);
});

export const config = {
	matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
