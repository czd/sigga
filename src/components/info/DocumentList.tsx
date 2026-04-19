"use client";

import { useMutation, useQuery } from "convex/react";
import { ChevronRight, Download, FileText, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
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

type SortKey = "recent" | "category";

type ThumbKind = "pdf" | "img" | "doc";

function thumbKindOf(fileType: string): ThumbKind {
	if (fileType === "application/pdf") return "pdf";
	if (fileType.startsWith("image/")) return "img";
	return "doc";
}

const THUMB_STYLE: Record<ThumbKind, { bg: string; label: string }> = {
	pdf: { bg: "bg-[#e9d0cb] text-[#8a4e48]", label: "PDF" },
	img: { bg: "bg-sage/25 text-sage-shadow", label: "IMG" },
	doc: { bg: "bg-paper-deep text-ink-soft", label: "DOC" },
};

function formatShortDate(ts: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
	}).format(new Date(ts));
}

function formatFullDate(ts: number, locale: string): string {
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

function firstName(name: string | null | undefined, email?: string | null) {
	const source = name?.trim() || email?.trim() || "";
	if (!source) return "";
	return source.split(/\s+/)[0];
}

function DocRow({
	doc,
	onOpen,
	isLast,
	active,
}: {
	doc: DocumentWithMeta;
	onOpen: (d: DocumentWithMeta) => void;
	isLast: boolean;
	active?: boolean;
}) {
	const locale = useLocale();
	const kind = thumbKindOf(doc.fileType);
	const thumb = THUMB_STYLE[kind];
	const uploader = firstName(doc.addedByUser?.name, doc.addedByUser?.email);
	const dateShort = formatShortDate(doc._creationTime, locale);
	const metaParts = [doc.category, dateShort, uploader].filter(
		(p): p is string => Boolean(p && p.length > 0),
	);

	return (
		<li className={cn(!isLast && "border-b border-divider")}>
			<button
				type="button"
				onClick={() => onOpen(doc)}
				className={cn(
					"flex w-full items-center gap-4 px-4 py-3 text-left outline-none focus-visible:bg-paper-deep/60",
					active && "bg-paper-deep/60",
				)}
			>
				<span
					aria-hidden
					className={cn(
						"flex size-14 shrink-0 items-center justify-center rounded-xl font-semibold tracking-wide",
						thumb.bg,
					)}
				>
					<span className="text-[0.7rem]">{thumb.label}</span>
				</span>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="font-serif text-lg leading-tight font-semibold text-ink truncate">
						{doc.title}
					</span>
					{metaParts.length > 0 ? (
						<span className="truncate text-sm text-ink-soft">
							{metaParts.join(" · ")}
						</span>
					) : null}
				</span>
				<ChevronRight
					aria-hidden
					className="size-5 shrink-0 text-ink-soft"
					strokeWidth={1.8}
				/>
			</button>
		</li>
	);
}

type Section = { label: string; rows: DocumentWithMeta[] };

function buildSections(
	documents: DocumentWithMeta[],
	sort: SortKey,
	uncategorizedLabel: string,
	locale: string,
): Section[] {
	if (sort === "recent") {
		const rows = [...documents].sort(
			(a, b) => b._creationTime - a._creationTime,
		);
		return [{ label: "", rows }];
	}
	const map = new Map<string, DocumentWithMeta[]>();
	for (const d of documents) {
		const key = d.category?.trim() || uncategorizedLabel;
		const bucket = map.get(key) ?? [];
		bucket.push(d);
		map.set(key, bucket);
	}
	const entries = [...map.entries()];
	entries.sort(([a], [b]) => {
		if (a === uncategorizedLabel) return 1;
		if (b === uncategorizedLabel) return -1;
		return a.localeCompare(b, locale);
	});
	return entries.map(([label, rows]) => ({
		label,
		rows: rows.sort((x, y) => y._creationTime - x._creationTime),
	}));
}

function DocumentDetail({
	doc,
	open,
	onOpenChange,
	onRequestDelete,
}: {
	doc: DocumentWithMeta | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRequestDelete: (d: DocumentWithMeta) => void;
}) {
	const t = useTranslations("documents");
	const tCommon = useTranslations("common");
	const locale = useLocale();

	if (!doc) return null;

	const kind = thumbKindOf(doc.fileType);
	const thumb = THUMB_STYLE[kind];
	const uploader = doc.addedByUser;
	const createdStr = formatFullDate(doc._creationTime, locale);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="max-h-[85vh] overflow-y-auto rounded-t-2xl"
				showCloseButton
			>
				<div className="flex flex-col gap-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					<SheetHeader className="p-0">
						<SheetTitle className="font-serif text-2xl leading-snug font-semibold text-ink">
							{doc.title}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{t("detailTitle")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex items-center gap-4">
						<span
							aria-hidden
							className={cn(
								"flex size-16 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tracking-wide",
								thumb.bg,
							)}
						>
							{thumb.label}
						</span>
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-base text-ink">
								{doc.fileName}
							</span>
							<span className="text-sm text-ink-soft">
								{formatSize(doc.fileSize)}
							</span>
						</div>
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

					<div className="flex items-center gap-2 text-sm text-ink-soft">
						{uploader ? (
							<UserAvatar
								name={uploader.name}
								email={uploader.email}
								imageUrl={uploader.image}
								className="size-6"
							/>
						) : null}
						<span>
							{createdStr}
							{uploader ? ` · ${uploader.name ?? uploader.email ?? ""}` : ""}
						</span>
					</div>

					<div className="flex flex-col gap-2 pt-1">
						{doc.url ? (
							<Button asChild size="touch">
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
							size="touch"
							onClick={() => onRequestDelete(doc)}
						>
							<Trash2 aria-hidden />
							<span>{tCommon("delete")}</span>
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

type DocumentListProps = {
	/**
	 * When provided, clicking a row calls this handler with the document id
	 * instead of opening the internal detail Sheet. Used by the desktop
	 * PaneLayout which renders a detail pane separately.
	 */
	onRowClick?: (id: Id<"documents">) => void;
	activeId?: Id<"documents"> | null;
};

export function DocumentList({ onRowClick, activeId }: DocumentListProps = {}) {
	const t = useTranslations("documents");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const [uploadOpen, setUploadOpen] = useState(false);
	const [detailTarget, setDetailTarget] = useState<DocumentWithMeta | null>(
		null,
	);
	const [deleteTarget, setDeleteTarget] = useState<DocumentWithMeta | null>(
		null,
	);
	const [sort, setSort] = useState<SortKey>("recent");

	const documents = useQuery(api.documents.list, {});
	const remove = useMutation(api.documents.remove);
	const loading = documents === undefined;

	const sections = useMemo(
		() => buildSections(documents ?? [], sort, t("uncategorized"), locale),
		[documents, sort, t, locale],
	);

	async function handleDelete() {
		if (!deleteTarget) return;
		await remove({ id: deleteTarget._id });
		setDetailTarget(null);
	}

	const totalDocs = documents?.length ?? 0;
	const sortOptions: Array<{ key: SortKey; label: string }> = [
		{ key: "recent", label: t("sort.recent") },
		{ key: "category", label: t("sort.byCategory") },
	];

	return (
		<>
			<div className="flex flex-col gap-5">
				{loading ? (
					<div className="rounded-2xl bg-paper px-4 py-6 ring-1 ring-foreground/10 text-muted-foreground">
						{tCommon("loading")}
					</div>
				) : totalDocs === 0 ? (
					<EmptyState
						icon={<FileText size={40} aria-hidden />}
						title={t("empty")}
						description={t("emptyHint")}
						action={
							<Button size="touch" onClick={() => setUploadOpen(true)}>
								<Upload aria-hidden />
								<span>{t("upload")}</span>
							</Button>
						}
					/>
				) : (
					<>
						<div
							role="tablist"
							aria-label={t("title")}
							className="grid grid-cols-2 rounded-xl border border-border bg-muted p-1"
						>
							{sortOptions.map(({ key, label }) => {
								const active = sort === key;
								return (
									<button
										key={key}
										type="button"
										role="tab"
										aria-selected={active}
										onClick={() => setSort(key)}
										className={cn(
											"min-h-12 rounded-lg text-base font-medium transition-colors",
											active
												? "bg-card text-foreground shadow-sm"
												: "text-muted-foreground hover:text-foreground",
										)}
									>
										{label}
									</button>
								);
							})}
						</div>

						<button
							type="button"
							onClick={() => setUploadOpen(true)}
							className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-divider-strong bg-paper/50 px-4 text-base font-medium text-ink-soft transition-colors hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
						>
							<Upload aria-hidden className="size-5" strokeWidth={1.8} />
							<span>{t("uploadCta")}</span>
						</button>

						<div className="flex flex-col gap-6">
							{sections.map(({ label, rows }) => (
								<section
									key={label || "all"}
									className="flex flex-col gap-2"
									aria-label={label || t("title")}
								>
									{label ? (
										<h4 className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
											{label}
										</h4>
									) : null}
									<ul className="overflow-hidden rounded-2xl bg-paper ring-1 ring-foreground/10">
										{rows.map((d, i) => (
											<DocRow
												key={d._id}
												doc={d}
												onOpen={(doc) => {
													if (onRowClick) onRowClick(doc._id);
													else setDetailTarget(doc);
												}}
												isLast={i === rows.length - 1}
												active={activeId === d._id}
											/>
										))}
									</ul>
								</section>
							))}
						</div>
					</>
				)}
			</div>

			<DocumentUpload open={uploadOpen} onOpenChange={setUploadOpen} />

			<DocumentDetail
				doc={detailTarget}
				open={detailTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDetailTarget(null);
				}}
				onRequestDelete={(d) => setDeleteTarget(d)}
			/>

			<ConfirmDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
				title={t("deleteConfirm.title", {
					title: deleteTarget?.title ?? deleteTarget?.fileName ?? "",
				})}
				body={t("deleteConfirm.body")}
				confirmLabel={tCommon("delete")}
				confirmVariant="destructive"
				onConfirm={handleDelete}
			/>
		</>
	);
}
