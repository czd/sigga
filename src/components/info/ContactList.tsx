"use client";

import { useQuery } from "convex/react";
import { Mail, Pencil, Phone, Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "./ContactForm";

type ContactDoc = Doc<"contacts">;
type ContactCategory = ContactDoc["category"];

const CATEGORY_ORDER: ContactCategory[] = [
	"emergency",
	"medical",
	"municipal",
	"family",
	"other",
];

function normalisePhoneHref(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.startsWith("+")) {
		return `tel:+${trimmed.slice(1).replace(/[^\d]/g, "")}`;
	}
	const digits = trimmed.replace(/[^\d]/g, "");
	if (digits.length === 0) return "tel:";
	if (digits.length <= 4) return `tel:${digits}`;
	if (digits.startsWith("354")) return `tel:+${digits}`;
	return `tel:+354${digits}`;
}

function ContactCard({
	contact,
	onEdit,
}: {
	contact: ContactDoc;
	onEdit: (c: ContactDoc) => void;
}) {
	const tCommon = useTranslations("common");

	return (
		<Card>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0">
						<h4 className="text-lg font-semibold leading-snug">
							{contact.name}
						</h4>
						{contact.role ? (
							<p className="text-base text-muted-foreground mt-0.5">
								{contact.role}
							</p>
						) : null}
					</div>
					<Button
						variant="ghost"
						size="touch-icon"
						onClick={() => onEdit(contact)}
						aria-label={tCommon("edit")}
						className="shrink-0"
					>
						<Pencil aria-hidden />
					</Button>
				</div>

				{contact.phone ? (
					<a
						href={normalisePhoneHref(contact.phone)}
						className="flex items-center gap-3 min-h-12 rounded-xl bg-primary/10 px-3 py-2 text-lg font-medium text-primary hover:bg-primary/15 active:bg-primary/20 transition-colors"
					>
						<Phone aria-hidden className="size-5 shrink-0" />
						<span className="truncate">{contact.phone}</span>
					</a>
				) : null}

				{contact.email ? (
					<a
						href={`mailto:${contact.email}`}
						className="flex items-center gap-3 min-h-12 rounded-xl bg-muted px-3 py-2 text-base text-foreground hover:bg-muted/80 active:bg-muted/60 transition-colors"
					>
						<Mail
							aria-hidden
							className="size-5 shrink-0 text-muted-foreground"
						/>
						<span className="truncate">{contact.email}</span>
					</a>
				) : null}

				{contact.notes ? (
					<p className="whitespace-pre-wrap text-base text-foreground/90">
						{contact.notes}
					</p>
				) : null}
			</CardContent>
		</Card>
	);
}

export function ContactList() {
	const t = useTranslations("contacts");
	const tCommon = useTranslations("common");
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<ContactDoc | null>(null);

	const contacts = useQuery(api.contacts.list, {});
	const loading = contacts === undefined;

	const grouped = new Map<ContactCategory, ContactDoc[]>();
	for (const c of contacts ?? []) {
		const list = grouped.get(c.category) ?? [];
		list.push(c);
		grouped.set(c.category, list);
	}

	const populated = CATEGORY_ORDER.filter(
		(cat) => (grouped.get(cat)?.length ?? 0) > 0,
	);

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-xl font-semibold">{t("title")}</h3>
					<Button size="touch" onClick={() => setCreateOpen(true)}>
						<Plus aria-hidden />
						<span>{t("add")}</span>
					</Button>
				</div>

				{loading ? (
					<Card>
						<CardContent className="text-muted-foreground py-2">
							{tCommon("loading")}
						</CardContent>
					</Card>
				) : populated.length === 0 ? (
					<EmptyState
						icon={<Users size={40} aria-hidden />}
						title={t("empty")}
					/>
				) : (
					<div className="flex flex-col gap-6">
						{populated.map((category) => {
							const rows = grouped.get(category) ?? [];
							return (
								<section
									key={category}
									className="flex flex-col gap-3"
									aria-labelledby={`contacts-${category}`}
								>
									<h4
										id={`contacts-${category}`}
										className="text-base font-semibold uppercase tracking-wide text-muted-foreground"
									>
										{t(`categories.${category}`)}
									</h4>
									<ul className="flex flex-col gap-3">
										{rows.map((c) => (
											<li key={c._id}>
												<ContactCard contact={c} onEdit={setEditTarget} />
											</li>
										))}
									</ul>
								</section>
							);
						})}
					</div>
				)}
			</div>

			<ContactForm open={createOpen} onOpenChange={setCreateOpen} />
			<ContactForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editContact={editTarget}
			/>
		</>
	);
}
