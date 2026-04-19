"use client";

import { useMutation, useQuery } from "convex/react";
import { FileText, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingLine } from "@/components/shared/LoadingLine";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

type FilterKey =
	| "active"
	| "in_progress"
	| "not_applied"
	| "approved"
	| "denied";

const STATUS_ORDER: EntitlementStatus[] = [
	"in_progress",
	"not_applied",
	"approved",
	"denied",
];

const FILTER_TO_STATUSES: Record<FilterKey, EntitlementStatus[]> = {
	active: ["in_progress", "not_applied"],
	in_progress: ["in_progress"],
	not_applied: ["not_applied"],
	approved: ["approved"],
	denied: ["denied"],
};

// Segment color for the progress bar, in display order.
const SEGMENT_COLOR: Record<EntitlementStatus, string> = {
	approved: "bg-sage-shadow",
	in_progress: "bg-sage",
	not_applied: "bg-wheat",
	denied: "bg-divider-strong",
};

const DOT_COLOR: Record<EntitlementStatus, string> = {
	in_progress: "bg-sage-deep",
	not_applied: "bg-wheat-deep",
	approved: "bg-sage-shadow",
	denied: "bg-ink-faint",
};

function isUrgent(notes: string | undefined): boolean {
	if (!notes) return false;
	return /brýnt/i.test(notes);
}

function firstName(name: string | null | undefined, email?: string | null) {
	const source = name?.trim() || email?.trim() || "";
	if (!source) return "";
	return source.split(/\s+/)[0];
}

function EntitlementCard({
	entitlement,
	onEdit,
	onClaim,
}: {
	entitlement: EntitlementWithUsers;
	onEdit: (e: EntitlementWithUsers) => void;
	onClaim: (e: EntitlementWithUsers) => void;
}) {
	const t = useTranslations("entitlements");
	const tCommon = useTranslations("common");
	const urgent = isUrgent(entitlement.notes);
	const owner = entitlement.ownerUser;

	return (
		<article
			className={cn(
				"relative overflow-hidden rounded-2xl bg-paper ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/15 focus-within:ring-3 focus-within:ring-ring",
				urgent &&
					"before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-amber-ink/70",
			)}
		>
			<button
				type="button"
				onClick={() => onEdit(entitlement)}
				aria-label={`${tCommon("edit")} — ${entitlement.title}`}
				className="absolute inset-0 rounded-2xl outline-none"
			/>
			<div className="pointer-events-none relative flex flex-col gap-3 px-5 py-4">
				<div className="flex flex-wrap items-center gap-2">
					{urgent ? (
						<span className="inline-flex items-center rounded-md bg-amber-bg-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-ink-deep">
							{t("urgent")}
						</span>
					) : null}
					<span className="inline-flex items-center gap-1.5 text-sm italic text-ink-soft">
						{t(`statuses.${entitlement.status}`)}
					</span>
				</div>

				<div className="flex flex-col gap-1">
					<h4 className="font-serif text-xl leading-snug font-semibold text-ink">
						{entitlement.title}
					</h4>
					{entitlement.appliedTo ? (
						<p className="text-base text-sage-shadow">
							{entitlement.appliedTo}
						</p>
					) : null}
				</div>

				{entitlement.description ? (
					<p className="text-base italic text-ink-soft">
						{entitlement.description}
					</p>
				) : null}

				{owner ? (
					<div className="flex items-center gap-2 pt-1">
						<UserAvatar
							name={owner.name}
							email={owner.email}
							imageUrl={owner.image}
							className="size-7"
						/>
						<span className="text-sm text-ink-soft">
							{firstName(owner.name, owner.email)} {t("ownerSuffix")}
						</span>
					</div>
				) : (
					<div className="pt-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onClaim(entitlement);
							}}
							className="pointer-events-auto relative inline-flex min-h-12 items-center rounded-full border border-dashed border-divider-strong bg-paper px-4 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
						>
							{t("claim.cta")}
						</button>
					</div>
				)}
			</div>
		</article>
	);
}

function ProgressTracker({
	items,
	done,
	total,
	onReset,
}: {
	items: EntitlementWithUsers[];
	done: number;
	total: number;
	onReset: () => void;
}) {
	const t = useTranslations("entitlements.progress");
	const remaining = total - done;
	const label =
		total === 0
			? ""
			: remaining === 0
				? t("allDone")
				: t("inProgress", { done: remaining, total });

	// Order items so the bar progresses from done (left) to not started (right).
	const ordered = useMemo(() => {
		const priority: Record<EntitlementStatus, number> = {
			approved: 0,
			in_progress: 1,
			not_applied: 2,
			denied: 3,
		};
		return [...items].sort((a, b) => priority[a.status] - priority[b.status]);
	}, [items]);

	if (total === 0) return null;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between gap-3">
				<span className="text-sm text-ink-soft">{label}</span>
				<button
					type="button"
					onClick={onReset}
					className="-mx-2 -my-1.5 inline-flex min-h-12 items-center rounded-md px-2 py-1.5 text-sm text-sage-shadow underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring"
				>
					{t("reset")}
				</button>
			</div>
			<div
				className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-paper-deep"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={total}
				aria-valuenow={done}
				aria-label={label}
			>
				{ordered.map((e) => (
					<span
						key={e._id}
						className={cn("block flex-1", SEGMENT_COLOR[e.status])}
					/>
				))}
			</div>
		</div>
	);
}

function FilterChips({
	counts,
	activeCount,
	filter,
	onFilterChange,
}: {
	counts: Record<EntitlementStatus, number>;
	activeCount: number;
	filter: FilterKey;
	onFilterChange: (next: FilterKey) => void;
}) {
	const t = useTranslations("entitlements.filters");

	// Only show status chips with >0. "active" always visible so user can reset.
	const chips: Array<{ key: FilterKey; label: string; count: number }> = [
		{ key: "active", label: t("active"), count: activeCount },
	];
	if (counts.in_progress > 0) {
		chips.push({
			key: "in_progress",
			label: t("in_progress"),
			count: counts.in_progress,
		});
	}
	if (counts.not_applied > 0) {
		chips.push({
			key: "not_applied",
			label: t("not_applied"),
			count: counts.not_applied,
		});
	}
	if (counts.approved > 0) {
		chips.push({
			key: "approved",
			label: t("approved"),
			count: counts.approved,
		});
	}
	if (counts.denied > 0) {
		chips.push({
			key: "denied",
			label: t("denied"),
			count: counts.denied,
		});
	}

	return (
		<div className="flex flex-wrap items-center gap-2">
			{chips.map(({ key, label, count }) => {
				const active = filter === key;
				return (
					<button
						key={key}
						type="button"
						onClick={() => onFilterChange(key)}
						aria-pressed={active}
						className={cn(
							"inline-flex min-h-12 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring",
							active
								? "bg-sage-shadow text-paper"
								: "border border-divider-strong bg-paper text-ink hover:bg-paper-deep",
						)}
					>
						<span>{label}</span>
						<span
							className={cn(
								"tabular-nums",
								active ? "text-paper/75" : "text-ink-soft",
							)}
						>
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
}

export function EntitlementList() {
	const t = useTranslations("entitlements");
	const tCommon = useTranslations("common");
	const locale = useLocale();

	const [createOpen, setCreateOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<EntitlementWithUsers | null>(
		null,
	);
	const [claimTarget, setClaimTarget] = useState<EntitlementWithUsers | null>(
		null,
	);
	const [claiming, setClaiming] = useState(false);
	const [claimError, setClaimError] = useState<string | null>(null);
	const [filter, setFilter] = useState<FilterKey>("active");

	const entitlements = useQuery(api.entitlements.list, {});
	const claim = useMutation(api.entitlements.claim);
	const loading = entitlements === undefined;
	const list = entitlements ?? [];

	const counts: Record<EntitlementStatus, number> = useMemo(() => {
		const c = { in_progress: 0, not_applied: 0, approved: 0, denied: 0 };
		for (const e of list) c[e.status] += 1;
		return c;
	}, [list]);
	const total = list.length;
	const done = counts.approved;
	const activeCount = counts.in_progress + counts.not_applied;

	const filtered = useMemo(() => {
		const allowed = new Set<EntitlementStatus>(FILTER_TO_STATUSES[filter]);
		return list.filter((e) => allowed.has(e.status));
	}, [list, filter]);

	const grouped = useMemo(() => {
		const map = new Map<EntitlementStatus, EntitlementWithUsers[]>();
		for (const e of filtered) {
			const bucket = map.get(e.status) ?? [];
			bucket.push(e);
			map.set(e.status, bucket);
		}
		// Sort each bucket: urgent first, then alphabetical (per locale)
		for (const [, rows] of map) {
			rows.sort((a, b) => {
				const ua = isUrgent(a.notes) ? 0 : 1;
				const ub = isUrgent(b.notes) ? 0 : 1;
				if (ua !== ub) return ua - ub;
				return a.title.localeCompare(b.title, locale);
			});
		}
		return STATUS_ORDER.filter((s) => (map.get(s)?.length ?? 0) > 0).map(
			(s) => ({ status: s, rows: map.get(s) ?? [] }),
		);
	}, [filtered, locale]);

	async function handleClaimConfirm() {
		if (!claimTarget) return;
		setClaiming(true);
		setClaimError(null);
		try {
			await claim({ id: claimTarget._id });
			setClaimTarget(null);
		} catch (err) {
			console.error(err);
			setClaimError(t("claim.error"));
		} finally {
			setClaiming(false);
		}
	}

	return (
		<>
			<div className="flex flex-col gap-5">
				{loading ? (
					<LoadingLine />
				) : total === 0 ? (
					<EmptyState
						icon={<FileText size={40} aria-hidden />}
						title={t("empty")}
						action={
							<Button size="touch" onClick={() => setCreateOpen(true)}>
								<Plus aria-hidden />
								<span>{t("add")}</span>
							</Button>
						}
					/>
				) : (
					<>
						<ProgressTracker
							items={list}
							done={done}
							total={total}
							onReset={() => setFilter("active")}
						/>

						<FilterChips
							counts={counts}
							activeCount={activeCount}
							filter={filter}
							onFilterChange={setFilter}
						/>

						{grouped.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-divider-strong bg-paper/50 px-4 py-8 text-center text-base text-ink-soft">
								{t("emptyFilter")}
							</div>
						) : (
							<div className="flex flex-col gap-6">
								{grouped.map(({ status, rows }) => (
									<section
										key={status}
										className="flex flex-col gap-3"
										aria-labelledby={`entitlements-${status}`}
									>
										<h4
											id={`entitlements-${status}`}
											className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft"
										>
											<span
												aria-hidden
												className={cn(
													"inline-block size-1.5 rounded-full",
													DOT_COLOR[status],
												)}
											/>
											<span>{t(`filters.${status}`)}</span>
											<span aria-hidden>·</span>
											<span className="tabular-nums">{rows.length}</span>
										</h4>
										<ul className="flex flex-col gap-3">
											{rows.map((e) => (
												<li key={e._id}>
													<EntitlementCard
														entitlement={e}
														onEdit={setEditTarget}
														onClaim={setClaimTarget}
													/>
												</li>
											))}
										</ul>
									</section>
								))}
							</div>
						)}

						<Button
							variant="outline"
							size="touch"
							onClick={() => setCreateOpen(true)}
							className="self-start"
						>
							<Plus aria-hidden />
							<span>{t("add")}</span>
						</Button>
					</>
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

			<Dialog
				open={claimTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setClaimTarget(null);
						setClaimError(null);
					}
				}}
			>
				<DialogContent className="max-w-sm" showCloseButton={false}>
					<DialogHeader>
						<DialogTitle className="text-xl">
							{t("claim.confirmTitle")}
						</DialogTitle>
						<DialogDescription className="text-base">
							{claimTarget
								? t("claim.confirmBody", { title: claimTarget.title })
								: ""}
						</DialogDescription>
					</DialogHeader>
					{claimError ? (
						<p className="text-base text-destructive" role="alert">
							{claimError}
						</p>
					) : null}
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button
							size="touch"
							onClick={handleClaimConfirm}
							disabled={claiming}
						>
							{t("claim.confirmAction")}
						</Button>
						<Button
							variant="outline"
							size="touch"
							onClick={() => setClaimTarget(null)}
							disabled={claiming}
						>
							{tCommon("cancel")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
