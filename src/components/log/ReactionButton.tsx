"use client";

import { useMutation } from "convex/react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useLiveRegion } from "@/components/shared/LiveRegion";
import { cn } from "@/lib/utils";

type ReactionButtonProps = {
	logEntryId: Id<"logEntries">;
	count: number;
	reactedByMe: boolean;
	reactorNames: string[];
};

/**
 * The single ❤️ on a journal entry (Pattern 7 tap floor, Pattern 14 no
 * optimistic UI — the live subscription re-renders). Tap toggles; the
 * accessible label names the reactors so screen-reader users hear who liked.
 */
export function ReactionButton({
	logEntryId,
	count,
	reactedByMe,
	reactorNames,
}: ReactionButtonProps) {
	const t = useTranslations("reactions");
	const tCommon = useTranslations("common");
	const { announce } = useLiveRegion();
	const toggle = useMutation(api.reactions.toggle);

	const base = reactedByMe ? t("unlike") : t("like");
	const label =
		count > 0
			? `${base} · ${t("names", { names: reactorNames.join(", ") })}`
			: base;

	async function handleClick() {
		try {
			await toggle({ logEntryId });
		} catch (err) {
			console.error(err);
			announce(tCommon("genericError"));
		}
	}

	return (
		<button
			type="button"
			onClick={handleClick}
			aria-pressed={reactedByMe}
			aria-label={label}
			className={cn(
				"inline-flex min-h-12 items-center gap-1 rounded-md px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
				reactedByMe
					? "text-sage-shadow"
					: "text-ink-soft hover:bg-paper-deep/40",
			)}
		>
			<Heart
				aria-hidden
				size={18}
				className={cn(reactedByMe && "fill-current")}
			/>
			{count > 0 ? <span className="tabular-nums">{count}</span> : null}
		</button>
	);
}
