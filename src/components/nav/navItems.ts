export type IconKind = "today" | "care" | "people" | "docs";

export type NavItem = {
	href: "/" | "/umonnun" | "/folk" | "/pappirar";
	labelKey: "dashboard" | "care" | "people" | "paperwork";
	icon: IconKind;
};

export const PRIMARY_ITEMS: NavItem[] = [
	{ href: "/", labelKey: "dashboard", icon: "today" },
	{ href: "/umonnun", labelKey: "care", icon: "care" },
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
