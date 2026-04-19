"use client";

import * as Sentry from "@sentry/nextjs";
import { useMutation, useQuery } from "convex/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/../convex/_generated/api";

function describeError(value: unknown): { message: string; stack?: string } {
	if (value instanceof Error) {
		return { message: value.message, stack: value.stack };
	}
	if (typeof value === "string") return { message: value };
	try {
		return { message: JSON.stringify(value) };
	} catch {
		return { message: String(value) };
	}
}

export function Tracking() {
	const me = useQuery(api.users.me);
	const logEvent = useMutation(api.events.log);
	const pathname = usePathname();

	const lastPathRef = useRef<string | null>(null);
	const appOpenLoggedRef = useRef(false);
	const identifiedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!me?._id) {
			if (identifiedRef.current) {
				Sentry.setUser(null);
				identifiedRef.current = null;
			}
			return;
		}
		if (identifiedRef.current === me._id) return;
		identifiedRef.current = me._id;
		Sentry.setUser({
			id: me._id,
			email: me.email ?? undefined,
			username: me.name ?? undefined,
		});
	}, [me?._id, me?.email, me?.name]);

	useEffect(() => {
		if (!me?._id) return;
		if (appOpenLoggedRef.current) return;
		appOpenLoggedRef.current = true;
		logEvent({
			type: "app_open",
			path: pathname ?? undefined,
			userAgent:
				typeof navigator !== "undefined" ? navigator.userAgent : undefined,
		}).catch(() => {});
	}, [me?._id, pathname, logEvent]);

	useEffect(() => {
		if (!me?._id) return;
		if (!pathname) return;
		if (lastPathRef.current === pathname) return;
		lastPathRef.current = pathname;
		logEvent({ type: "page_view", path: pathname }).catch(() => {});
	}, [me?._id, pathname, logEvent]);

	useEffect(() => {
		if (!me?._id) return;

		const onError = (event: ErrorEvent) => {
			const { message, stack } = describeError(event.error ?? event.message);
			logEvent({
				type: "error",
				path: pathname ?? undefined,
				message,
				stack,
				userAgent:
					typeof navigator !== "undefined" ? navigator.userAgent : undefined,
			}).catch(() => {});
		};
		const onRejection = (event: PromiseRejectionEvent) => {
			const { message, stack } = describeError(event.reason);
			logEvent({
				type: "unhandled_rejection",
				path: pathname ?? undefined,
				message,
				stack,
				userAgent:
					typeof navigator !== "undefined" ? navigator.userAgent : undefined,
			}).catch(() => {});
		};

		window.addEventListener("error", onError);
		window.addEventListener("unhandledrejection", onRejection);
		return () => {
			window.removeEventListener("error", onError);
			window.removeEventListener("unhandledrejection", onRejection);
		};
	}, [me?._id, pathname, logEvent]);

	return null;
}
