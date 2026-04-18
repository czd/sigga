import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PaneLayoutProps = {
	list: ReactNode;
	detail?: ReactNode;
	rail?: ReactNode;
	className?: string;
};

/**
 * List + optional detail (+ optional rail) multi-pane layout.
 *
 * - base / md: renders only `list` full-width (mobile/tablet experience).
 * - xl: 2-column grid (list + detail).
 * - 2xl with rail: 3-column grid (list + detail + rail).
 *
 * Background hierarchy:
 * - list pane: bg-page (flush with chrome)
 * - detail pane: bg-paper (the "open book")
 * - rail: bg-paper-deep
 *
 * No borders between panes — background steps do the work.
 */
export function PaneLayout({ list, detail, rail, className }: PaneLayoutProps) {
	return (
		<div
			className={cn(
				"w-full flex flex-col xl:grid xl:grid-cols-[minmax(340px,400px)_1fr]",
				rail
					? "2xl:grid-cols-[minmax(340px,400px)_1fr_minmax(300px,320px)]"
					: "",
				className,
			)}
		>
			<div className="bg-page">{list}</div>
			{detail !== undefined ? (
				<div className="hidden xl:block bg-paper">{detail}</div>
			) : null}
			{rail !== undefined ? (
				<div className="hidden 2xl:block bg-paper-deep">{rail}</div>
			) : null}
		</div>
	);
}
