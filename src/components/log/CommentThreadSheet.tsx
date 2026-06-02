"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useLiveRegion } from "@/components/shared/LiveRegion";
import { LoadingLine } from "@/components/shared/LoadingLine";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { CommentComposer } from "./CommentComposer";
import { CommentRow, type ThreadComment } from "./CommentRow";

type CommentThreadSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	targetType: "logEntry" | "appointment";
	targetId: Id<"logEntries"> | Id<"appointments">;
	/** Short context line shown under the title (entry preview / appt title). */
	summary: string;
};

/**
 * The shared comment thread (Pattern 4 — bottom Sheet for a focused task).
 * One component serves journal entries and appointments. Reads oldest →
 * newest like a Messenger reply chain; the composer is pinned at the bottom.
 */
export function CommentThreadSheet({
	open,
	onOpenChange,
	targetType,
	targetId,
	summary,
}: CommentThreadSheetProps) {
	const t = useTranslations("discussion");
	const { announce } = useLiveRegion();
	const comments = useQuery(
		api.comments.list,
		open ? { targetType, targetId } : "skip",
	);
	const add = useMutation(api.comments.add);
	const update = useMutation(api.comments.update);
	const [editing, setEditing] = useState<ThreadComment | null>(null);

	async function handleSubmit(content: string) {
		if (editing) {
			await update({ id: editing._id, content });
			setEditing(null);
			announce(t("announce.updated"));
		} else {
			await add({ targetType, targetId, content });
			announce(t("announce.sent"));
		}
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (!next) setEditing(null);
				onOpenChange(next);
			}}
		>
			<SheetContent
				side="bottom"
				className="flex max-h-[92vh] flex-col rounded-t-2xl"
			>
				<SheetHeader className="p-0">
					<SheetTitle className="font-serif text-[1.4rem] font-normal tracking-tight">
						{t("comments")}
					</SheetTitle>
					<SheetDescription className="line-clamp-2 text-base text-ink-soft">
						{summary}
					</SheetDescription>
				</SheetHeader>

				<div className="-mx-1 flex-1 overflow-y-auto px-1">
					{comments === undefined ? (
						<LoadingLine />
					) : comments.length === 0 ? (
						<p className="py-6 text-center text-base text-ink-soft">
							{t("empty")}
						</p>
					) : (
						<ul className="flex flex-col divide-y divide-divider">
							{comments.map((comment) => (
								<CommentRow
									key={comment._id}
									comment={comment}
									onStartEdit={setEditing}
								/>
							))}
						</ul>
					)}
				</div>

				<div className="pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
					<CommentComposer
						key={editing?._id ?? "new"}
						onSubmit={handleSubmit}
						editing={editing !== null}
						initialValue={editing?.content ?? ""}
						onCancel={() => setEditing(null)}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
