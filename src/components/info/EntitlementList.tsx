"use client";

import { useQuery } from "convex/react";
import {
	CheckCircle2,
	CircleAlert,
	CircleDashed,
	Clock3,
	FileText,
	Pencil,
	Plus,
	XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EntitlementForm } from "./EntitlementForm";

type EntitlementDoc = Doc<"entitlements">;
type EntitlementStatus = EntitlementDoc["status"];
type UserSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};
type EntitlementWithUsers = EntitlementDoc & {
	ownerUser: UserSummary | null;
	updatedByUser: UserSummary | null;
};

const STATUS_ORDER: EntitlementStatus[] = [
	"in_progress",
	"not_applied",
	"approved",
	"denied",
];

const STATUS_STYLE: Record<
	EntitlementStatus,
	{ badge: string; card: string; icon: ReactNode }
> = {
	in_progress: {
		badge: "bg-primary/15 text-primary",
		card: "border-primary/30 shadow-[0_0_0_1px_var(--primary)]/5",
		icon: <Clock3 aria-hidden className="size-4" />,
	},
	not_applied: {
		badge: "bg-warning/15 text-warning",
		card: "",
		icon: <CircleDashed aria-hidden className="size-4" />,
	},
	approved: {
		badge: "bg-emerald-100 text-emerald-800",
		card: "",
		icon: <CheckCircle2 aria-hidden className="size-4" />,
	},
	denied: {
		badge: "bg-muted text-muted-foreground",
		card: "opacity-70",
		icon: <XCircle aria-hidden className="size-4" />,
	},
};

function formatUpdatedAt(ts: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(new Date(ts));
}

function isUrgent(notes: string | undefined): boolean {
	if (!notes) return false;
	return /brýnt/i.test(notes);
}

function EntitlementCard({
	entitlement,
	onEdit,
}: {
	entitlement: EntitlementWithUsers;
	onEdit: (e: EntitlementWithUsers) => void;
}) {
	const t = useTranslations("entitlements");
	const tCommon = useTranslations("common");
	const locale = useLocale();
	const style = STATUS_STYLE[entitlement.status];
	const urgent = isUrgent(entitlement.notes);

	return (
		<Card className={cn(style.card, urgent && "border-warning/60")}>
			<CardContent className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex-1 min-w-0 flex flex-col gap-1.5">
						<div className="flex flex-wrap items-center gap-2">
							<span
								className={cn(
									"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium",
									style.badge,
								)}
							>
								{style.icon}
								<span>{t(`statuses.${entitlement.status}`)}</span>
							</span>
							{urgent ? (
								<span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 text-warning px-2.5 py-1 text-sm font-semibold uppercase tracking-wide">
									<CircleAlert aria-hidden className="size-4" />
									<span>{t("urgent")}</span>
								</span>
							) : null}
						</div>
						<h4 className="text-lg font-semibold leading-snug">
							{entitlement.title}
						</h4>
						{entitlement.appliedTo ? (
							<p className="text-base text-muted-foreground">
								{entitlement.appliedTo}
							</p>
						) : null}
					</div>
					<Button
						variant="ghost"
						size="touch-icon"
						onClick={() => onEdit(entitlement)}
						aria-label={tCommon("edit")}
						className="shrink-0"
					>
						<Pencil aria-hidden />
					</Button>
				</div>

				{entitlement.description ? (
					<p className="text-base text-foreground/90">
						{entitlement.description}
					</p>
				) : null}

				{entitlement.notes ? (
					<p className="whitespace-pre-wrap text-base text-foreground/90">
						{entitlement.notes}
					</p>
				) : null}

				{entitlement.ownerUser || entitlement.updatedByUser ? (
					<div className="pt-2 mt-1 border-t border-border flex flex-col gap-2 text-sm text-muted-foreground">
						{entitlement.ownerUser ? (
							<div className="flex items-center gap-2">
								<UserAvatar
									name={entitlement.ownerUser.name}
									email={entitlement.ownerUser.email}
									imageUrl={entitlement.ownerUser.image}
									className="size-6"
								/>
								<span>
									{t("owner")}:{" "}
									{entitlement.ownerUser.name ??
										entitlement.ownerUser.email ??
										""}
								</span>
							</div>
						) : null}
						{entitlement.updatedByUser ? (
							<div className="flex items-center gap-2">
								<UserAvatar
									name={entitlement.updatedByUser.name}
									email={entitlement.updatedByUser.email}
									imageUrl={entitlement.updatedByUser.image}
									className="size-6"
								/>
								<span>
									{tCommon("lastUpdated")}{" "}
									{formatUpdatedAt(entitlement.updatedAt, locale)}{" "}
									{tCommon("by")}{" "}
									{entitlement.updatedByUser.name ??
										entitlement.updatedByUser.email ??
										""}
								</span>
							</div>
						) : null}
					</div>
				) : null}
			</CardContent>
		</Card>
	);
}

export function EntitlementList() {
	const t = useTranslations("entitlements");
	const tCommon = useTranslations("common");
	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<EntitlementWithUsers | null>(
		null,
	);

	const entitlements = useQuery(api.entitlements.list, {});
	const loading = entitlements === undefined;

	const grouped = new Map<EntitlementStatus, EntitlementWithUsers[]>();
	for (const e of entitlements ?? []) {
		const list = grouped.get(e.status) ?? [];
		list.push(e);
		grouped.set(e.status, list);
	}

	const populated = STATUS_ORDER.filter(
		(s) => (grouped.get(s)?.length ?? 0) > 0,
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
						icon={<FileText size={40} aria-hidden />}
						title={t("empty")}
					/>
				) : (
					<div className="flex flex-col gap-6">
						{populated.map((status) => {
							const rows = grouped.get(status) ?? [];
							return (
								<section
									key={status}
									className="flex flex-col gap-3"
									aria-labelledby={`entitlements-${status}`}
								>
									<h4
										id={`entitlements-${status}`}
										className="text-base font-semibold uppercase tracking-wide text-muted-foreground"
									>
										{t(`statuses.${status}`)}
									</h4>
									<ul className="flex flex-col gap-3">
										{rows.map((e) => (
											<li key={e._id}>
												<EntitlementCard
													entitlement={e}
													onEdit={setEditTarget}
												/>
											</li>
										))}
									</ul>
								</section>
							);
						})}
					</div>
				)}
			</div>

			<EntitlementForm open={createOpen} onOpenChange={setCreateOpen} />
			<EntitlementForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editEntitlement={editTarget}
			/>
		</>
	);
}
