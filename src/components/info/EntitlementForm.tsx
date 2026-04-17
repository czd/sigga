"use client";

import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type EntitlementDoc = Doc<"entitlements">;
type EntitlementStatus = EntitlementDoc["status"];

const STATUSES: EntitlementStatus[] = [
	"in_progress",
	"not_applied",
	"approved",
	"denied",
];

const NO_OWNER = "__none__";

type EntitlementFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editEntitlement?: EntitlementDoc | null;
};

export function EntitlementForm({
	open,
	onOpenChange,
	editEntitlement,
}: EntitlementFormProps) {
	const t = useTranslations("entitlements");
	const tCommon = useTranslations("common");
	const create = useMutation(api.entitlements.create);
	const update = useMutation(api.entitlements.update);
	const remove = useMutation(api.entitlements.remove);
	const users = useQuery(api.users.list);

	const [title, setTitle] = useState("");
	const [status, setStatus] = useState<EntitlementStatus>("not_applied");
	const [appliedTo, setAppliedTo] = useState("");
	const [ownerId, setOwnerId] = useState<Id<"users"> | null>(null);
	const [description, setDescription] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setConfirmDelete(false);
		if (editEntitlement) {
			setTitle(editEntitlement.title);
			setStatus(editEntitlement.status);
			setAppliedTo(editEntitlement.appliedTo ?? "");
			setOwnerId(editEntitlement.ownerId ?? null);
			setDescription(editEntitlement.description ?? "");
			setNotes(editEntitlement.notes ?? "");
		} else {
			setTitle("");
			setStatus("not_applied");
			setAppliedTo("");
			setOwnerId(null);
			setDescription("");
			setNotes("");
		}
	}, [open, editEntitlement]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedTitle = title.trim();
		if (trimmedTitle.length === 0) {
			setError(t("errors.titleRequired"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (editEntitlement) {
				await update({
					id: editEntitlement._id,
					title: trimmedTitle,
					status,
					appliedTo: appliedTo.trim() || null,
					ownerId: ownerId ?? null,
					description: description.trim() || null,
					notes: notes.trim() || null,
				});
			} else {
				await create({
					title: trimmedTitle,
					status,
					appliedTo: appliedTo.trim() || undefined,
					ownerId: ownerId ?? undefined,
					description: description.trim() || undefined,
					notes: notes.trim() || undefined,
				});
			}
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!editEntitlement) return;
		setSaving(true);
		try {
			await remove({ id: editEntitlement._id });
			setConfirmDelete(false);
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
		} finally {
			setSaving(false);
		}
	}

	const ownerValue = ownerId ?? NO_OWNER;

	return (
		<>
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
								{editEntitlement ? t("editTitle") : t("createTitle")}
							</SheetTitle>
							<SheetDescription className="sr-only">
								{editEntitlement ? t("editTitle") : t("createTitle")}
							</SheetDescription>
						</SheetHeader>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="entitlement-title"
								className="text-base font-medium"
							>
								{t("fields.title")}
							</Label>
							<Input
								id="entitlement-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								className="h-12 text-base"
								required
								autoFocus
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="entitlement-status"
								className="text-base font-medium"
							>
								{t("fields.status")}
							</Label>
							<Select
								value={status}
								onValueChange={(v) => setStatus(v as EntitlementStatus)}
							>
								<SelectTrigger
									id="entitlement-status"
									className="w-full h-12 text-base"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{STATUSES.map((s) => (
										<SelectItem key={s} value={s} className="text-base py-2">
											{t(`statuses.${s}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="entitlement-applied-to"
								className="text-base font-medium"
							>
								{t("fields.appliedTo")}
							</Label>
							<Input
								id="entitlement-applied-to"
								value={appliedTo}
								onChange={(e) => setAppliedTo(e.target.value)}
								className="h-12 text-base"
								placeholder={t("placeholders.appliedTo")}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="entitlement-owner"
								className="text-base font-medium"
							>
								{t("fields.owner")}
							</Label>
							<Select
								value={ownerValue}
								onValueChange={(next) => {
									setOwnerId(next === NO_OWNER ? null : (next as Id<"users">));
								}}
								disabled={saving}
							>
								<SelectTrigger
									id="entitlement-owner"
									className="w-full h-12 text-base"
								>
									<SelectValue placeholder={t("fields.noOwner")} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={NO_OWNER} className="text-base py-2">
										{t("fields.noOwner")}
									</SelectItem>
									{users?.map((user) => (
										<SelectItem
											key={user._id}
											value={user._id}
											className="text-base py-2"
										>
											{user.name ?? user.email ?? "—"}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="entitlement-description"
								className="text-base font-medium"
							>
								{t("fields.description")}
							</Label>
							<Textarea
								id="entitlement-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
								className="text-base min-h-20 resize-none"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="entitlement-notes"
								className="text-base font-medium"
							>
								{t("fields.notes")}
							</Label>
							<Textarea
								id="entitlement-notes"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={3}
								className="text-base min-h-24 resize-none"
								placeholder={t("placeholders.notes")}
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
								disabled={saving || title.trim().length === 0}
								className="flex-1"
							>
								{saving ? tCommon("saving") : tCommon("save")}
							</Button>
						</div>

						{editEntitlement ? (
							<Button
								type="button"
								variant="destructive"
								size="touch"
								onClick={() => setConfirmDelete(true)}
								disabled={saving}
								className="self-start"
							>
								<Trash2 aria-hidden />
								<span>{tCommon("delete")}</span>
							</Button>
						) : null}
					</form>
				</SheetContent>
			</Sheet>

			<Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
							disabled={saving}
						>
							{tCommon("delete")}
						</Button>
						<Button
							variant="outline"
							size="touch"
							onClick={() => setConfirmDelete(false)}
							disabled={saving}
						>
							{tCommon("cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
