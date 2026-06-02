"use client";

import { useMutation } from "convex/react";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useLiveRegion } from "@/components/shared/LiveRegion";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ReactionButtonProps = {
	logEntryId: Id<"logEntries">;
	count: number;
	reactedByMe: boolean;
	reactorNames: string[];
};

/**
 * The single ❤️ on a journal entry. Tapping the heart toggles (Pattern 14 —
 * no optimistic UI; the live subscription re-renders). When there are likes,
 * the count beside it opens a "who liked" popover — tap on any device, hover
 * on desktop. Long-press was deliberately avoided: it's undiscoverable for
 * the 60+ audience; a tappable count is the familiar, visible affordance.
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
	const [open, setOpen] = useState(false);

	async function handleToggle() {
		try {
			await toggle({ logEntryId });
		} catch (err) {
			console.error(err);
			announce(tCommon("genericError"));
		}
	}

	return (
		<span className="inline-flex items-center">
			<button
				type="button"
				onClick={handleToggle}
				aria-pressed={reactedByMe}
				aria-label={reactedByMe ? t("unlike") : t("like")}
				className={cn(
					"inline-flex min-h-9 items-center rounded-md px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring",
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
			</button>
			{count > 0 ? (
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label={t("names", { names: reactorNames.join(", ") })}
							onPointerEnter={(e) => {
								if (e.pointerType === "mouse") setOpen(true);
							}}
							onPointerLeave={(e) => {
								if (e.pointerType === "mouse") setOpen(false);
							}}
							className="inline-flex min-h-9 items-center rounded-md px-1 text-sm tabular-nums text-ink-soft transition-colors hover:bg-paper-deep/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
						>
							{count}
						</button>
					</PopoverTrigger>
					<PopoverContent align="start" className="max-w-60">
						<p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
							{t("likedBy")}
						</p>
						<ul className="flex flex-col gap-0.5">
							{reactorNames.map((name, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static reactor list, never reordered
								<li key={`${name}-${i}`} className="text-base text-ink">
									{name}
								</li>
							))}
						</ul>
					</PopoverContent>
				</Popover>
			) : null}
		</span>
	);
}
