export type IconKind = "today" | "care" | "people" | "docs" | "time";

export type NavItem = {
	href: "/" | "/umonnun" | "/folk" | "/pappirar" | "/timar";
	labelKey: "dashboard" | "care" | "people" | "paperwork" | "appointments";
	icon: IconKind;
};

export const PRIMARY_ITEMS: NavItem[] = [
	{ href: "/", labelKey: "dashboard", icon: "today" },
	{ href: "/umonnun", labelKey: "care", icon: "care" },
	{ href: "/timar", labelKey: "appointments", icon: "time" },
	{ href: "/folk", labelKey: "people", icon: "people" },
	{ href: "/pappirar", labelKey: "paperwork", icon: "docs" },
];

/**
 * BottomNav renders Í dag in the middle slot so it reads as the home anchor
 * on mobile — thumb-central, visually the biggest. Desktop Sidebar keeps the
 * logical top-down order (dashboard first) via PRIMARY_ITEMS.
 */
export const MOBILE_ITEMS: NavItem[] = [
	{ href: "/umonnun", labelKey: "care", icon: "care" },
	{ href: "/timar", labelKey: "appointments", icon: "time" },
	{ href: "/", labelKey: "dashboard", icon: "today" },
	{ href: "/folk", labelKey: "people", icon: "people" },
	{ href: "/pappirar", labelKey: "paperwork", icon: "docs" },
];

export function isActiveRoute(
	pathname: string,
	href: NavItem["href"],
): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}
