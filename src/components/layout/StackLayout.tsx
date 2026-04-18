import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StackLayoutProps = {
	children: ReactNode;
	/**
	 * Override the xl: max-width utility. Default `xl:max-w-[960px]`.
	 * Dashboard uses `xl:max-w-[1400px]`.
	 */
	xlMaxWidth?: string;
	className?: string;
};

/**
 * Single-column responsive layout for surfaces that don't benefit from
 * multi-pane (Dashboard, Umönnun). Centers content within the post-sidebar
 * area using mx-auto; the sidebar's own border-r provides visual separation.
 */
export function StackLayout({
	children,
	xlMaxWidth = "xl:max-w-[960px]",
	className,
}: StackLayoutProps) {
	return (
		<div
			className={cn(
				"mx-auto px-6 pt-4 pb-28 md:pb-8 md:max-w-[720px]",
				xlMaxWidth,
				"flex flex-col gap-6",
				className,
			)}
		>
			{children}
		</div>
	);
}
