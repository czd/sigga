"use client";

import { useMutation } from "convex/react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

type ContactDoc = Doc<"contacts">;
type ContactCategory = ContactDoc["category"];

const CATEGORIES: ContactCategory[] = [
	"emergency",
	"medical",
	"municipal",
	"family",
	"other",
];

type ContactFormProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editContact?: ContactDoc | null;
};

export function ContactForm({
	open,
	onOpenChange,
	editContact,
}: ContactFormProps) {
	const t = useTranslations("contacts");
	const tCommon = useTranslations("common");
	const create = useMutation(api.contacts.create);
	const update = useMutation(api.contacts.update);
	const remove = useMutation(api.contacts.remove);

	const [category, setCategory] = useState<ContactCategory>("medical");
	const [name, setName] = useState("");
	const [role, setRole] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setConfirmDelete(false);
		if (editContact) {
			setCategory(editContact.category);
			setName(editContact.name);
			setRole(editContact.role ?? "");
			setPhone(editContact.phone ?? "");
			setEmail(editContact.email ?? "");
			setNotes(editContact.notes ?? "");
		} else {
			setCategory("medical");
			setName("");
			setRole("");
			setPhone("");
			setEmail("");
			setNotes("");
		}
	}, [open, editContact]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		if (trimmedName.length === 0) {
			setError(t("errors.nameRequired"));
			return;
		}
		setSaving(true);
		setError(null);
		try {
			if (editContact) {
				await update({
					id: editContact._id,
					category,
					name: trimmedName,
					role: role.trim() || null,
					phone: phone.trim() || null,
					email: email.trim() || null,
					notes: notes.trim() || null,
				});
			} else {
				await create({
					category,
					name: trimmedName,
					role: role.trim() || undefined,
					phone: phone.trim() || undefined,
					email: email.trim() || undefined,
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
		if (!editContact) return;
		setSaving(true);
		try {
			await remove({ id: editContact._id });
			onOpenChange(false);
		} catch (err) {
			console.error(err);
			setError(t("errors.generic"));
			throw err;
		} finally {
			setSaving(false);
		}
	}

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
								{editContact ? t("editTitle") : t("createTitle")}
							</SheetTitle>
							<SheetDescription className="sr-only">
								{editContact ? t("editTitle") : t("createTitle")}
							</SheetDescription>
						</SheetHeader>

						<div className="flex flex-col gap-2">
							<Label
								htmlFor="contact-category"
								className="text-base font-medium"
							>
								{t("fields.category")}
							</Label>
							<Select
								value={category}
								onValueChange={(v) => setCategory(v as ContactCategory)}
							>
								<SelectTrigger
									id="contact-category"
									className="w-full h-12 text-base"
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CATEGORIES.map((cat) => (
										<SelectItem
											key={cat}
											value={cat}
											className="text-base py-2"
										>
											{t(`categories.${cat}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-name" className="text-base font-medium">
								{t("fields.name")}
							</Label>
							<Input
								id="contact-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="h-12 text-base"
								required
								autoFocus
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-role" className="text-base font-medium">
								{t("fields.role")}
							</Label>
							<Input
								id="contact-role"
								value={role}
								onChange={(e) => setRole(e.target.value)}
								className="h-12 text-base"
								placeholder={t("placeholders.role")}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-phone" className="text-base font-medium">
								{t("fields.phone")}
							</Label>
							<Input
								id="contact-phone"
								type="tel"
								inputMode="tel"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="h-12 text-base"
								placeholder={t("placeholders.phone")}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-email" className="text-base font-medium">
								{t("fields.email")}
							</Label>
							<Input
								id="contact-email"
								type="email"
								inputMode="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="h-12 text-base"
								placeholder={t("placeholders.email")}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-notes" className="text-base font-medium">
								{t("fields.notes")}
							</Label>
							<Textarea
								id="contact-notes"
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
								disabled={saving || name.trim().length === 0}
								className="flex-1"
							>
								{saving ? tCommon("saving") : tCommon("save")}
							</Button>
						</div>

						{editContact ? (
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

			<ConfirmDialog
				open={confirmDelete}
				onOpenChange={setConfirmDelete}
				title={t("deleteConfirm.title", { title: editContact?.name ?? "" })}
				body={t("deleteConfirm.body")}
				confirmLabel={tCommon("delete")}
				confirmVariant="destructive"
				onConfirm={handleDelete}
			/>
		</>
	);
}
