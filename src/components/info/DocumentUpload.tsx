"use client";

import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type DocumentUploadProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function stripExtension(name: string): string {
	const dot = name.lastIndexOf(".");
	if (dot <= 0) return name;
	return name.slice(0, dot);
}

export function DocumentUpload({ open, onOpenChange }: DocumentUploadProps) {
	const t = useTranslations("documents");
	const tCommon = useTranslations("common");
	const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
	const save = useMutation(api.documents.save);
	const datalistId = useId();

	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [titleDirty, setTitleDirty] = useState(false);
	const [category, setCategory] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (open) return;
		setFile(null);
		setTitle("");
		setTitleDirty(false);
		setCategory("");
		setNotes("");
		setSaving(false);
		setError(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, [open]);

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const next = event.target.files?.[0] ?? null;
		setFile(next);
		if (next && !titleDirty) {
			setTitle(stripExtension(next.name));
		}
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!file) {
			setError(t("errors.fileRequired"));
			return;
		}
		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) {
			setError(t("errors.titleRequired"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const uploadUrl = await generateUploadUrl();
			const res = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": file.type || "application/octet-stream" },
				body: file,
			});
			if (!res.ok) {
				throw new Error(`Upload failed: ${res.status}`);
			}
			const { storageId } = (await res.json()) as {
				storageId: Id<"_storage">;
			};
			await save({
				storageId,
				title: trimmedTitle,
				fileName: file.name,
				fileType: file.type || "application/octet-stream",
				fileSize: file.size,
				category: category.trim() || undefined,
				notes: notes.trim() || undefined,
			});
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
		} finally {
			setSaving(false);
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				className="max-h-[95vh] overflow-y-auto rounded-t-2xl"
				showCloseButton={false}
			>
				<form
					onSubmit={handleSubmit}
					className="flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
				>
					<SheetHeader className="p-0">
						<SheetTitle className="text-xl font-semibold">
							{t("uploadTitle")}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{t("uploadTitle")}
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-2">
						<Label htmlFor="document-file" className="text-base font-medium">
							{t("fields.file")}
						</Label>
						<div className="flex items-center gap-3">
							<Button
								type="button"
								variant="secondary"
								size="touch"
								onClick={() => fileInputRef.current?.click()}
								disabled={saving}
							>
								{t("fields.chooseFile")}
							</Button>
							<span className="flex-1 min-w-0 truncate text-base text-muted-foreground">
								{file ? file.name : t("fields.noFile")}
							</span>
						</div>
						<input
							ref={fileInputRef}
							id="document-file"
							type="file"
							onChange={handleFileChange}
							className="sr-only"
							required
						/>
						{file ? (
							<p className="text-sm text-muted-foreground">
								{file.size < 1024 * 1024
									? `${(file.size / 1024).toFixed(0)} KB`
									: `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
							</p>
						) : null}
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="document-title" className="text-base font-medium">
							{t("fields.docTitle")}
						</Label>
						<Input
							id="document-title"
							value={title}
							onChange={(e) => {
								setTitle(e.target.value);
								setTitleDirty(true);
							}}
							className="h-12 text-base"
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							htmlFor="document-category"
							className="text-base font-medium"
						>
							{t("fields.category")}
						</Label>
						<Input
							id="document-category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							list={datalistId}
							className="h-12 text-base"
							placeholder={t("placeholders.category")}
						/>
						<datalist id={datalistId}>
							<option value="Lyfseðill" />
							<option value="Blóðprufa" />
							<option value="Bréf frá lækni" />
							<option value="Umsókn" />
							<option value="Vottorð" />
						</datalist>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="document-notes" className="text-base font-medium">
							{t("fields.notes")}
						</Label>
						<Textarea
							id="document-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="text-base min-h-24 resize-none"
						/>
					</div>

					{error ? (
						<p className="text-base text-destructive" role="alert">
							{error}
						</p>
					) : null}

					<div className="flex gap-3 pt-2">
						<Button
							type="button"
							variant="outline"
							size="touch"
							onClick={() => onOpenChange(false)}
							disabled={saving}
							className="flex-1"
						>
							{tCommon("cancel")}
						</Button>
						<Button
							type="submit"
							size="touch"
							disabled={saving || !file || title.trim().length === 0}
							className="flex-1"
						>
							{saving ? t("uploading") : t("upload")}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}
