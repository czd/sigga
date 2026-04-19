"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Doc, Id } from "@/../convex/_generated/dataModel";
import { UserAvatar } from "@/components/shared/UserAvatar";
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

const COLUMN_ORDER: EntitlementStatus[] = [
	"not_applied",
	"in_progress",
	"approved",
	"denied",
];

function isUrgent(notes: string | undefined): boolean {
	return notes ? /brýnt/i.test(notes) : false;
}

function firstName(name: string | null | undefined, email?: string | null) {
	const source = name?.trim() || email?.trim() || "";
	if (!source) return "";
	return source.split(/\s+/)[0];
}

function KanbanCard({
	entitlement,
	onEdit,
	isOverlay,
}: {
	entitlement: EntitlementWithUsers;
	onEdit: (e: EntitlementWithUsers) => void;
	isOverlay?: boolean;
}) {
	const t = useTranslations("entitlements");
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: entitlement._id,
	});
	const urgent = isUrgent(entitlement.notes);
	const owner = entitlement.ownerUser;

	return (
		<button
			type="button"
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			onClick={() => onEdit(entitlement)}
			className={cn(
				"text-left relative overflow-hidden rounded-2xl bg-paper ring-1 ring-foreground/10 p-4 flex flex-col gap-2 cursor-grab active:cursor-grabbing hover:ring-foreground/20 transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-sage-deep",
				isDragging && !isOverlay && "opacity-30",
				isOverlay && "shadow-lg ring-2 ring-sage-deep",
				urgent &&
					"before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-amber-ink/70",
			)}
		>
			{urgent ? (
				<span className="inline-flex self-start items-center rounded-md bg-amber-bg-1 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-amber-ink-deep">
					{t("urgent")}
				</span>
			) : null}
			<h4 className="font-serif text-base leading-snug font-semibold text-ink">
				{entitlement.title}
			</h4>
			{entitlement.appliedTo ? (
				<p className="text-sm text-sage-shadow">{entitlement.appliedTo}</p>
			) : null}
			{entitlement.description ? (
				<p className="text-sm italic text-ink-soft line-clamp-2">
					{entitlement.description}
				</p>
			) : null}
			{owner ? (
				<div className="flex items-center gap-2 pt-1">
					<UserAvatar
						name={owner.name}
						email={owner.email}
						imageUrl={owner.image}
						className="size-6"
					/>
					<span className="text-xs text-ink-soft">
						{firstName(owner.name, owner.email)}
					</span>
				</div>
			) : null}
		</button>
	);
}

function KanbanColumn({
	status,
	items,
	onCreate,
	onEdit,
}: {
	status: EntitlementStatus;
	items: EntitlementWithUsers[];
	onCreate: () => void;
	onEdit: (e: EntitlementWithUsers) => void;
}) {
	const t = useTranslations("entitlements");
	const { isOver, setNodeRef } = useDroppable({ id: status });
	return (
		<section
			ref={setNodeRef}
			aria-labelledby={`kanban-col-${status}`}
			className={cn(
				"flex flex-col gap-3 rounded-2xl p-3 transition-colors min-h-64",
				isOver ? "bg-paper-deep" : "bg-paper/40",
			)}
		>
			<header className="flex items-center justify-between gap-2 px-1">
				<h3
					id={`kanban-col-${status}`}
					className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft"
				>
					{t(`statuses.${status}`)}
				</h3>
				<div className="flex items-center gap-2">
					<span className="text-xs text-ink-soft tabular-nums">
						{items.length}
					</span>
					<button
						type="button"
						onClick={onCreate}
						aria-label={t("add")}
						className="flex size-12 items-center justify-center rounded-full text-ink-soft outline-none transition-colors hover:bg-paper hover:text-ink focus-visible:ring-3 focus-visible:ring-ring"
					>
						<Plus aria-hidden className="size-5" />
					</button>
				</div>
			</header>
			<div className="flex flex-col gap-2">
				{items.map((e) => (
					<KanbanCard key={e._id} entitlement={e} onEdit={onEdit} />
				))}
			</div>
		</section>
	);
}

export function EntitlementKanban() {
	const entitlements = useQuery(api.entitlements.list);
	const update = useMutation(api.entitlements.update);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor),
	);
	const [activeId, setActiveId] = useState<Id<"entitlements"> | null>(null);
	const [editTarget, setEditTarget] = useState<EntitlementWithUsers | null>(
		null,
	);
	const [createOpen, setCreateOpen] = useState(false);

	const byStatus = useMemo(() => {
		const map = new Map<EntitlementStatus, EntitlementWithUsers[]>();
		for (const s of COLUMN_ORDER) map.set(s, []);
		for (const e of (entitlements as EntitlementWithUsers[] | undefined) ??
			[]) {
			const list = map.get(e.status);
			if (list) list.push(e);
		}
		// Urgent items (BRÝNT in notes) sort to the top of each column;
		// within the urgent and non-urgent groups, preserve insertion order
		// (stable sort — newest entitlements keep their relative position).
		for (const s of COLUMN_ORDER) {
			const list = map.get(s);
			if (!list) continue;
			list.sort((a, b) => {
				const aUrgent = isUrgent(a.notes) ? 1 : 0;
				const bUrgent = isUrgent(b.notes) ? 1 : 0;
				return bUrgent - aUrgent;
			});
		}
		return map;
	}, [entitlements]);

	const activeCard = activeId
		? ((entitlements as EntitlementWithUsers[] | undefined)?.find(
				(e) => e._id === activeId,
			) ?? null)
		: null;

	function handleDragStart(ev: DragStartEvent) {
		setActiveId(ev.active.id as Id<"entitlements">);
	}

	async function handleDragEnd(ev: DragEndEvent) {
		const id = ev.active.id as Id<"entitlements">;
		const target = ev.over?.id as EntitlementStatus | undefined;
		setActiveId(null);
		if (!target || !COLUMN_ORDER.includes(target)) return;
		const current = (entitlements as EntitlementWithUsers[] | undefined)?.find(
			(e) => e._id === id,
		);
		if (!current || current.status === target) return;
		try {
			await update({ id, status: target });
		} catch (err) {
			console.error(err);
		}
	}

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="grid gap-3 xl:grid-cols-4">
					{COLUMN_ORDER.map((status) => (
						<KanbanColumn
							key={status}
							status={status}
							items={byStatus.get(status) ?? []}
							onCreate={() => setCreateOpen(true)}
							onEdit={setEditTarget}
						/>
					))}
				</div>
				<DragOverlay>
					{activeCard ? (
						<KanbanCard entitlement={activeCard} onEdit={() => {}} isOverlay />
					) : null}
				</DragOverlay>
			</DndContext>

			<EntitlementForm
				open={editTarget !== null}
				onOpenChange={(open) => {
					if (!open) setEditTarget(null);
				}}
				editEntitlement={editTarget}
			/>
			<EntitlementForm open={createOpen} onOpenChange={setCreateOpen} />
		</>
	);
}
