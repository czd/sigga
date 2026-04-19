"use client";

import { useQuery } from "convex/react";
import { ChevronRight, FileText, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DocumentDetail } from "./DocumentDetail";
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
	const locale = useLocale();
	const [uploadOpen, setUploadOpen] = useState(false);
	const [detailId, setDetailId] = useState<Id<"documents"> | null>(null);
	const [sort, setSort] = useState<SortKey>("recent");

	const documents = useQuery(api.documents.list, {});
	const loading = documents === undefined;

	const sections = useMemo(
		() => buildSections(documents ?? [], sort, t("uncategorized"), locale),
		[documents, sort, t, locale],
	);

	const totalDocs = documents?.length ?? 0;
	const sortOptions: Array<{ key: SortKey; label: string }> = [
		{ key: "recent", label: t("sort.recent") },
		{ key: "category", label: t("sort.byCategory") },
	];

	return (
		<>
			<div className="flex flex-col gap-5">
				{loading ? (
					<LoadingLine />
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
													else setDetailId(doc._id);
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

			<Sheet
				open={detailId !== null}
				onOpenChange={(open) => {
					if (!open) setDetailId(null);
				}}
			>
				<SheetContent
					side="bottom"
					className="max-h-[85vh] overflow-y-auto rounded-t-2xl"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>{t("detailTitle")}</SheetTitle>
						<SheetDescription>{t("detailTitle")}</SheetDescription>
					</SheetHeader>
					<div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
						{detailId ? (
							<DocumentDetail
								id={detailId}
								onAfterDelete={() => setDetailId(null)}
							/>
						) : null}
					</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
