"use client";

import { useQuery } from "convex/react";
import { Mail, Pencil, Phone, Plus, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ContactForm } from "./ContactForm";

type ContactDoc = Doc<"contacts">;
type ContactCategory = ContactDoc["category"];
type FilterKey = "all" | "medical" | "service" | "family";

const FILTER_ORDER: FilterKey[] = ["all", "medical", "service", "family"];

const FILTER_TO_CATEGORIES: Record<FilterKey, ContactCategory[]> = {
	all: ["medical", "municipal", "family", "other"],
	medical: ["medical"],
	service: ["municipal", "other"],
	family: ["family"],
};

const SECTION_ORDER: ContactCategory[] = [
	"medical",
	"municipal",
	"family",
	"other",
];

function telHref(raw: string): string {
	const digits = raw.replace(/[^\d+]/g, "");
	if (digits.length === 0) return "tel:";
	if (digits.startsWith("+")) return `tel:${digits}`;
	if (digits.length <= 4) return `tel:${digits}`;
	if (digits.startsWith("354")) return `tel:+${digits}`;
	return `tel:+354${digits}`;
}

function firstLetter(name: string): string {
	const ch = name.trim().charAt(0);
	return ch ? ch.toUpperCase() : "?";
}

function normalise(s: string): string {
	return s
		.toLowerCase()
		.normalize("NFKD")
		.replace(/\p{Diacritic}/gu, "");
}

function matchesSearch(c: ContactDoc, q: string): boolean {
	if (!q) return true;
	const needle = normalise(q);
	const hay = [
		c.name,
		c.role ?? "",
		c.phone ?? "",
		c.email ?? "",
		c.notes ?? "",
	]
		.map(normalise)
		.join(" ");
	const phoneDigits = (c.phone ?? "").replace(/[^\d]/g, "");
	return hay.includes(needle) || phoneDigits.includes(q.replace(/[^\d]/g, ""));
}

function ContactRow({
	contact,
	expanded,
	onToggle,
	onEdit,
	isLast,
	active,
}: {
	contact: ContactDoc;
	expanded: boolean;
	onToggle: (id: Id<"contacts">) => void;
	onEdit: (c: ContactDoc) => void;
	isLast: boolean;
	active?: boolean;
}) {
	const t = useTranslations("contacts");
	const tCommon = useTranslations("common");
	const hasPhone = Boolean(contact.phone);
	const detailsId = `contact-details-${contact._id}`;

	return (
		<li
			className={cn(
				!isLast && "border-b border-divider",
				active && "bg-paper-deep/60",
			)}
		>
			<div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
				<button
					type="button"
					onClick={() => onToggle(contact._id)}
					className="contents text-left outline-none"
					aria-expanded={expanded}
					aria-controls={detailsId}
				>
					<span
						aria-hidden
						className="flex size-11 items-center justify-center rounded-full bg-sage-deep/85 font-serif text-lg font-medium text-paper"
					>
						{firstLetter(contact.name)}
					</span>
					<span className="flex min-w-0 flex-col gap-0.5">
						<span className="font-serif text-lg leading-tight font-semibold text-ink truncate">
							{contact.name}
						</span>
						{contact.role ? (
							<span className="text-sm text-ink-soft truncate">
								{contact.role}
							</span>
						) : null}
					</span>
				</button>
				{hasPhone ? (
					<a
						href={telHref(contact.phone ?? "")}
						aria-label={t("call", { name: contact.name })}
						className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage/30 text-sage-shadow transition-colors hover:bg-sage/45 active:bg-sage/55"
					>
						<Phone aria-hidden className="size-5" strokeWidth={1.8} />
					</a>
				) : (
					<span aria-hidden className="size-11 shrink-0" />
				)}
			</div>
			{expanded ? (
				<div
					id={detailsId}
					className="flex flex-col gap-3 px-4 pt-1 pb-4 pl-[4.25rem]"
				>
					{contact.phone ? (
						<a
							href={telHref(contact.phone)}
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
					<Button
						variant="outline"
						size="touch"
						onClick={() => onEdit(contact)}
						className="self-start"
					>
						<Pencil aria-hidden />
						<span>{tCommon("edit")}</span>
					</Button>
				</div>
			) : null}
		</li>
	);
}

type ContactListProps = {
	/**
	 * When provided, clicking a contact calls this instead of toggling the
	 * inline expanded details. Used by the desktop Fólk PaneLayout.
	 */
	onRowClick?: (id: Id<"contacts">) => void;
	activeId?: Id<"contacts"> | null;
};

export function ContactList({ onRowClick, activeId }: ContactListProps = {}) {
	const t = useTranslations("contacts");
	const tCommon = useTranslations("common");
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<ContactDoc | null>(null);
	const [filter, setFilter] = useState<FilterKey>("all");
	const [search, setSearch] = useState("");
	const [expandedId, setExpandedId] = useState<Id<"contacts"> | null>(null);

	const toggleExpanded = (id: Id<"contacts">) =>
		setExpandedId((curr) => (curr === id ? null : id));

	const contacts = useQuery(api.contacts.list, {});
	const loading = contacts === undefined;

	const { sections, totalMatches } = useMemo(() => {
		const allowed = new Set<ContactCategory>(FILTER_TO_CATEGORIES[filter]);
		const trimmed = search.trim();
		const grouped = new Map<ContactCategory, ContactDoc[]>();
		let total = 0;
		for (const c of contacts ?? []) {
			if (!allowed.has(c.category)) continue;
			if (!matchesSearch(c, trimmed)) continue;
			const list = grouped.get(c.category) ?? [];
			list.push(c);
			grouped.set(c.category, list);
			total += 1;
		}
		const sections = SECTION_ORDER.filter(
			(cat) => (grouped.get(cat)?.length ?? 0) > 0,
		).map((cat) => ({ category: cat, rows: grouped.get(cat) ?? [] }));
		return { sections, totalMatches: total };
	}, [contacts, filter, search]);

	return (
		<>
			<div className="flex flex-col gap-5">
				<div className="relative">
					<Search
						aria-hidden
						className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft"
					/>
					<Input
						id="contacts-search"
						type="search"
						inputMode="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={t("searchPlaceholder")}
						aria-label={t("searchPlaceholder")}
						className="h-12 rounded-full border-divider-strong bg-paper pl-11 pr-4 text-base"
					/>
				</div>

				<Button
					size="touch"
					onClick={() => setCreateOpen(true)}
					className="w-full"
				>
					<Plus aria-hidden />
					<span>{t("add")}</span>
				</Button>

				<div className="flex flex-wrap items-center gap-2">
					{FILTER_ORDER.map((key) => {
						const active = filter === key;
						return (
							<button
								key={key}
								type="button"
								onClick={() => setFilter(key)}
								aria-pressed={active}
								className={cn(
									"rounded-full px-4 h-10 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
									active
										? "bg-sage-shadow text-paper"
										: "border border-divider-strong bg-paper text-ink",
								)}
							>
								{t(`filters.${key}`)}
							</button>
						);
					})}
				</div>

				{loading ? (
					<div className="rounded-2xl bg-paper px-4 py-6 ring-1 ring-foreground/10 text-muted-foreground">
						{tCommon("loading")}
					</div>
				) : totalMatches === 0 ? (
					<EmptyState
						icon={<Users size={40} aria-hidden />}
						title={search.trim() ? t("noMatches") : t("empty")}
					/>
				) : (
					<div className="flex flex-col gap-6">
						{sections.map(({ category, rows }) => (
							<section
								key={category}
								aria-labelledby={`contacts-${category}`}
								className="flex flex-col gap-2"
							>
								<h4
									id={`contacts-${category}`}
									className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft"
								>
									{t(`categories.${category}`)}
								</h4>
								<ul className="overflow-hidden rounded-2xl bg-paper ring-1 ring-foreground/10">
									{rows.map((c, i) => (
										<ContactRow
											key={c._id}
											contact={c}
											expanded={!onRowClick && expandedId === c._id}
											onToggle={(id) => {
												if (onRowClick) onRowClick(id);
												else toggleExpanded(id);
											}}
											onEdit={setEditTarget}
											isLast={i === rows.length - 1}
											active={activeId === c._id}
										/>
									))}
								</ul>
							</section>
						))}
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
