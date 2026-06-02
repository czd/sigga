"use client";

import { useMutation } from "convex/react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { useLiveRegion } from "@/components/shared/LiveRegion";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
			</div>
			{comment.isMine ? (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label={t("actions", { name })}
							className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-deep/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
						>
							<MoreVertical aria-hidden size={18} />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-40">
						<DropdownMenuItem
							className="min-h-12 gap-2 px-3 text-base"
							onSelect={() => onStartEdit(comment)}
						>
							<Pencil aria-hidden />
							{t("edit")}
						</DropdownMenuItem>
						<DropdownMenuItem
							variant="destructive"
							className="min-h-12 gap-2 px-3 text-base"
							onSelect={() => {
								// Defer so the menu's focus-restore finishes before the
								// confirm dialog traps focus (avoids the Radix race).
								setTimeout(() => setConfirmOpen(true), 0);
							}}
						>
							<Trash2 aria-hidden />
							{t("delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
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
