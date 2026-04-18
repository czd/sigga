"use client";

import { useMutation, useQuery } from "convex/react";
import { Download, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentDetail({
	id,
	onAfterDelete,
}: {
	id: Id<"documents">;
	onAfterDelete?: () => void;
}) {
	const t = useTranslations("documents");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const doc = useQuery(api.documents.get, { id });
	const remove = useMutation(api.documents.remove);
	const [deleting, setDeleting] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	if (doc === undefined) {
		return <p className="text-ink-faint">{tCommon("loading")}</p>;
	}
	if (doc === null) {
		return null;
	}

	const isPdf = doc.fileType === "application/pdf";
	const isImage = doc.fileType.startsWith("image/");
	const createdStr = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(doc._creationTime));

	async function handleDelete() {
		setDeleting(true);
		try {
			await remove({ id });
			setConfirmOpen(false);
			onAfterDelete?.();
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<header className="flex flex-col gap-1">
				<h2 className="font-serif text-[1.6rem] leading-tight text-ink">
					{doc.title}
				</h2>
				<div className="text-sm text-ink-faint">
					{doc.fileName} · {formatSize(doc.fileSize)}
				</div>
			</header>

			<div className="flex items-center gap-2 text-sm text-ink-soft">
				{doc.addedByUser ? (
					<UserAvatar
						name={doc.addedByUser.name}
						email={doc.addedByUser.email}
						imageUrl={doc.addedByUser.image}
						className="size-6"
					/>
				) : null}
				<span>
					{createdStr}
					{doc.addedByUser
						? ` · ${doc.addedByUser.name ?? doc.addedByUser.email ?? ""}`
						: ""}
				</span>
			</div>

			{doc.category ? (
				<div>
					<span className="inline-flex items-center rounded-full bg-paper-deep px-3 py-1 text-sm font-medium text-ink">
						{doc.category}
					</span>
				</div>
			) : null}

			{doc.notes ? (
				<p className="whitespace-pre-wrap text-base text-foreground/90">
					{doc.notes}
				</p>
			) : null}

			<div className="rounded-xl bg-paper-deep/50 overflow-hidden border border-divider">
				{doc.url && isPdf ? (
					<iframe
						title={doc.title}
						src={doc.url}
						className="w-full h-[60vh] bg-page"
					/>
				) : doc.url && isImage ? (
					// biome-ignore lint/performance/noImgElement: server-side transform not configured for user-uploaded blobs
					<img
						src={doc.url}
						alt={doc.title}
						className="w-full max-h-[60vh] object-contain bg-page"
					/>
				) : (
					<p className="p-6 text-ink-faint text-center">{t("unavailable")}</p>
				)}
			</div>

			<div className="flex items-center gap-2">
				{doc.url ? (
					<Button asChild size="touch">
						<a href={doc.url} target="_blank" rel="noreferrer">
							<Download aria-hidden />
							<span>{t("download")}</span>
						</a>
					</Button>
				) : null}
				<Button
					variant="ghost"
					size="touch"
					onClick={() => setConfirmOpen(true)}
					className="text-destructive"
				>
					<Trash2 aria-hidden />
					<span>{tCommon("delete")}</span>
				</Button>
			</div>

			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent className="max-w-sm" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle className="text-xl">{tCommon("delete")}?</DialogTitle>
						<DialogDescription className="text-base">
							{t("deleteConfirm")}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							variant="destructive"
							size="touch"
							onClick={handleDelete}
							disabled={deleting}
						>
							{tCommon("delete")}
						</Button>
						<Button
							variant="outline"
							size="touch"
							onClick={() => setConfirmOpen(false)}
							disabled={deleting}
						>
							{tCommon("cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
