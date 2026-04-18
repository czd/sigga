export type IconKind = "today" | "care" | "people" | "docs" | "time";

export type NavItem = {
	href: "/" | "/umonnun" | "/folk" | "/pappirar" | "/timar";
	labelKey: "dashboard" | "care" | "people" | "paperwork" | "appointments";
	icon: IconKind;
};

export const PRIMARY_ITEMS: NavItem[] = [
	{ href: "/", labelKey: "dashboard", icon: "today" },
	{ href: "/umonnun", labelKey: "care", icon: "care" },
	{ href: "/folk", labelKey: "people", icon: "people" },
	{ href: "/pappirar", labelKey: "paperwork", icon: "docs" },
];

/**
 * Secondary items rendered only in the desktop Sidebar (not in BottomNav).
 * Keeps mobile parity intact (BottomNav stays 4 items — the audience depends
 * on that muscle memory) while giving desktop users faster access.
 */
export const SECONDARY_ITEMS: NavItem[] = [
	{ href: "/timar", labelKey: "appointments", icon: "time" },
];

export function isActiveRoute(
	pathname: string,
	href: NavItem["href"],
): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}
