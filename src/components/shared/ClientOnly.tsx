"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

/**
 * Renders `fallback` until after client mount, then `children`. Use to wrap
 * components that produce locale-dependent output from APIs where server and
 * client can disagree (e.g. `Intl.DateTimeFormat`, which has tripped our
 * hydration check three times now in WeekStrip / WeekGrid / SidebarWeekCalendar).
 */
export function ClientOnly({
	children,
	fallback = null,
}: {
	children: ReactNode;
	fallback?: ReactNode;
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);
	if (!mounted) return <>{fallback}</>;
	return <>{children}</>;
}
