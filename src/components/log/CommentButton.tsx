"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Id } from "@/../convex/_generated/dataModel";
import { CommentThreadSheet } from "./CommentThreadSheet";

type CommentButtonProps = {
	targetType: "logEntry" | "appointment";
	targetId: Id<"logEntries"> | Id<"appointments">;
	count: number;
	/** Context line for the thread header (entry preview / appt title). */
	summary: string;
};

/**
 * The 💬 pill that opens the comment thread. Drops onto both journal cards
 * and appointment cards (Pattern 7 tap floor).
 */
export function CommentButton({
	targetType,
	targetId,
	count,
	summary,
}: CommentButtonProps) {
	const t = useTranslations("discussion");
	const [open, setOpen] = useState(false);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				aria-label={t("openCount", { count })}
				aria-haspopup="dialog"
				className="inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 text-base text-ink-soft transition-colors hover:bg-paper-deep/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
			>
				<MessageCircle aria-hidden size={18} />
				{count > 0 ? <span className="tabular-nums">{count}</span> : null}
			</button>
			<CommentThreadSheet
				open={open}
				onOpenChange={setOpen}
				targetType={targetType}
				targetId={targetId}
				summary={summary}
			/>
		</>
	);
}
