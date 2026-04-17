"use client";

import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DocumentUpload } from "./DocumentUpload";

type DocumentDoc = Doc<"documents">;
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type DocumentWithMeta = DocumentDoc & {
	url: string | null;
	addedByUser: UserSummary | null;
};

function formatDate(ts: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(ts));
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({
	doc,
	onDelete,
}: {
	doc: DocumentWithMeta;
	onDelete: (d: DocumentWithMeta) => void;
}) {
	const t = useTranslations("documents");
	const tCommon = useTranslations("common");
	const locale = useLocale();

	return (
		<Card>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-start gap-3">
					<div
						aria-hidden
						className="shrink-0 rounded-xl bg-primary/10 text-primary p-3"
					>
						<FileText className="size-6" />
					</div>
					<div className="flex-1 min-w-0 flex flex-col gap-1">
						<h4 className="text-lg font-semibold leading-snug">{doc.title}</h4>
						<p className="text-sm text-muted-foreground truncate">
							{doc.fileName} · {formatSize(doc.fileSize)}
						</p>
						{doc.category ? (
							<span className="inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium text-foreground/80 mt-1">
								{doc.category}
							</span>
						) : null}
					</div>
				</div>

				{doc.notes ? (
					<p className="whitespace-pre-wrap text-base text-foreground/90">
						{doc.notes}
					</p>
				) : null}

				<div className="flex flex-wrap items-center gap-2 pt-1">
					{doc.url ? (
						<Button
							asChild
							variant="default"
							size="touch"
							className="flex-1 min-w-[10rem]"
						>
							<a href={doc.url} target="_blank" rel="noreferrer">
								<Download aria-hidden />
								<span>{t("download")}</span>
							</a>
						</Button>
					) : (
						<Button variant="outline" size="touch" disabled>
							{t("unavailable")}
						</Button>
					)}
					<Button
						variant="destructive"
						size="touch-icon"
						onClick={() => onDelete(doc)}
						aria-label={tCommon("delete")}
					>
						<Trash2 aria-hidden />
					</Button>
				</div>

				<div className="pt-2 mt-1 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
					{doc.addedByUser ? (
						<UserAvatar
							name={doc.addedByUser.name}
							email={doc.addedByUser.email}
							imageUrl={doc.addedByUser.image}
							className="size-6"
						/>
					) : null}
					<span>
						{formatDate(doc._creationTime, locale)}
						{doc.addedByUser
							? ` · ${doc.addedByUser.name ?? doc.addedByUser.email ?? ""}`
							: ""}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

export function DocumentList() {
	const t = useTranslations("documents");
	const tCommon = useTranslations("common");
	const [uploadOpen, setUploadOpen] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<DocumentWithMeta | null>(
		null,
	);
	const [deleting, setDeleting] = useState(false);

	const documents = useQuery(api.documents.list, {});
	const remove = useMutation(api.documents.remove);
	const loading = documents === undefined;

	async function handleDelete() {
		if (!deleteTarget) return;
		setDeleting(true);
		try {
			await remove({ id: deleteTarget._id });
			setDeleteTarget(null);
		} catch (err) {
			console.error(err);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-xl font-semibold">{t("title")}</h3>
					<Button size="touch" onClick={() => setUploadOpen(true)}>
						<Upload aria-hidden />
						<span>{t("upload")}</span>
					</Button>
				</div>

				{loading ? (
					<Card>
						<CardContent className="text-muted-foreground py-2">
							{tCommon("loading")}
						</CardContent>
					</Card>
				) : (documents?.length ?? 0) === 0 ? (
					<EmptyState
						icon={<FileText size={40} aria-hidden />}
						title={t("empty")}
						description={t("emptyHint")}
					/>
				) : (
					<ul className="flex flex-col gap-3">
						{documents?.map((doc) => (
							<li key={doc._id}>
								<DocumentCard doc={doc} onDelete={setDeleteTarget} />
							</li>
						))}
					</ul>
				)}
			</div>

			<DocumentUpload open={uploadOpen} onOpenChange={setUploadOpen} />

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
			>
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
							onClick={() => setDeleteTarget(null)}
							disabled={deleting}
						>
							{tCommon("cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
