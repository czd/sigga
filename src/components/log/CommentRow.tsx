"use client";

import { useMutation } from "convex/react";
import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useLiveRegion } from "@/components/shared/LiveRegion";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { classifyRelative, formatAbsoluteWithTime } from "@/lib/formatDate";

export type ThreadComment = {
	_id: Id<"comments">;
	_creationTime: number;
	content: string;
	editedAt?: number;
	author: { name: string | null; image: string | null } | null;
	isMine: boolean;
};

function relativeLabel(
	ts: number,
	tCommon: ReturnType<typeof useTranslations>,
	locale: string,
): string {
	const c = classifyRelative(ts);
	switch (c.kind) {
		case "justNow":
			return tCommon("justNow");
		case "minutesAgo":
		case "hoursAgo":
		case "daysAgo":
			return tCommon(c.kind, { count: c.count });
		case "today":
			return tCommon("today");
		case "yesterday":
			return tCommon("yesterday");
		default:
			return formatAbsoluteWithTime(ts, locale);
	}
}

type CommentRowProps = {
	comment: ThreadComment;
	onStartEdit: (comment: ThreadComment) => void;
};

export function CommentRow({ comment, onStartEdit }: CommentRowProps) {
	const t = useTranslations("discussion");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const { announce } = useLiveRegion();
	const remove = useMutation(api.comments.remove);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const name = comment.author?.name ?? "—";

	return (
		<li className="flex items-start gap-3 py-3">
			<UserAvatar
				name={comment.author?.name}
				imageUrl={comment.author?.image}
				className="size-9"
			/>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-baseline gap-x-2">
					<span className="font-medium text-ink">{name}</span>
					<span className="text-sm text-ink-soft">
						<time dateTime={new Date(comment._creationTime).toISOString()}>
							{relativeLabel(comment._creationTime, tCommon, locale)}
						</time>
						<span className="sr-only">
							{" "}
							{formatAbsoluteWithTime(comment._creationTime, locale)}
						</span>
						{comment.editedAt ? (
							<>
								<span aria-hidden> · </span>
								<span className="italic">{t("edited")}</span>
							</>
						) : null}
					</span>
				</div>
				<p className="mt-0.5 whitespace-pre-wrap text-base text-ink">
					{comment.content}
				</p>
				{comment.isMine ? (
					<div className="mt-1 flex gap-1">
						<button
							type="button"
							onClick={() => onStartEdit(comment)}
							className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 text-sm text-ink-soft transition-colors hover:bg-paper-deep/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
						>
							<Pencil aria-hidden size={15} />
							{t("edit")}
						</button>
						<button
							type="button"
							onClick={() => setConfirmOpen(true)}
							className="inline-flex min-h-12 items-center gap-1 rounded-full px-3 text-sm text-destructive transition-colors hover:bg-paper-deep/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
						>
							<Trash2 aria-hidden size={15} />
							{t("delete")}
						</button>
					</div>
				) : null}
			</div>
			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title={t("deleteConfirm.title")}
				body={t("deleteConfirm.body")}
				confirmLabel={t("delete")}
				confirmVariant="destructive"
				onConfirm={async () => {
					await remove({ id: comment._id });
					announce(t("announce.deleted"));
				}}
			/>
		</li>
	);
}
