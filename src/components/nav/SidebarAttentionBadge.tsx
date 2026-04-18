"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Props = {
	count: number;
	compact?: boolean;
	className?: string;
};

export function SidebarAttentionBadge({ count, compact, className }: Props) {
	const t = useTranslations();
	if (count <= 0) return null;
	const label = t("nav.attention.badge", { count });
	if (compact) {
		return (
			<span
				role="status"
				aria-label={label}
				className={cn(
					"absolute top-1.5 right-4 inline-block size-2 rounded-full bg-amber-ink",
					className,
				)}
			/>
		);
	}
	return (
		<span
			role="status"
			aria-label={label}
			className={cn(
				"inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-semibold",
				"bg-amber-bg-1 text-amber-ink",
				className,
			)}
		>
			{count}
		</span>
	);
}
