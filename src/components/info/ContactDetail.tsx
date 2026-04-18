"use client";

import { useQuery } from "convex/react";
import { Mail, Pencil, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./ContactForm";

function telHref(raw: string): string {
	const digits = raw.replace(/[^\d+]/g, "");
	if (digits.length === 0) return "tel:";
	if (digits.startsWith("+")) return `tel:${digits}`;
	if (digits.length <= 4) return `tel:${digits}`;
	if (digits.startsWith("354")) return `tel:+${digits}`;
	return `tel:+354${digits}`;
}

export function ContactDetail({ id }: { id: Id<"contacts"> }) {
	const t = useTranslations("contacts");
	const tCommon = useTranslations("common");
	const contact = useQuery(api.contacts.get, { id });
	const [editOpen, setEditOpen] = useState(false);

	if (contact === undefined) {
		return <p className="text-ink-faint">{tCommon("loading")}</p>;
	}
	if (contact === null) {
		return null;
	}

	return (
		<div className="flex flex-col gap-5">
			<header className="flex flex-col gap-1">
				<div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">
					{t(`categories.${contact.category}`)}
				</div>
				<h2 className="font-serif text-[1.75rem] leading-tight text-ink">
					{contact.name}
				</h2>
				{contact.role ? (
					<div className="text-base text-ink-soft">{contact.role}</div>
				) : null}
			</header>

			<div className="flex flex-col gap-2">
				{contact.phone ? (
					<a
						href={telHref(contact.phone)}
						className="flex items-center gap-3 min-h-14 rounded-xl bg-primary/10 px-4 py-2 text-xl font-medium text-primary hover:bg-primary/15 transition-colors"
					>
						<Phone aria-hidden className="size-5 shrink-0" />
						<span className="truncate">{contact.phone}</span>
					</a>
				) : null}
				{contact.email ? (
					<a
						href={`mailto:${contact.email}`}
						className="flex items-center gap-3 min-h-12 rounded-xl bg-muted px-4 py-2 text-base text-foreground hover:bg-muted/80 transition-colors"
					>
						<Mail aria-hidden className="size-5 shrink-0 text-ink-faint" />
						<span className="truncate">{contact.email}</span>
					</a>
				) : null}
			</div>

			{contact.notes ? (
				<p className="whitespace-pre-wrap text-base text-foreground/90">
					{contact.notes}
				</p>
			) : null}

			<div className="pt-2">
				<Button
					variant="outline"
					size="touch"
					onClick={() => setEditOpen(true)}
				>
					<Pencil aria-hidden />
					<span>{tCommon("edit")}</span>
				</Button>
			</div>

			<ContactForm
				open={editOpen}
				onOpenChange={setEditOpen}
				editContact={contact}
			/>
		</div>
	);
}
