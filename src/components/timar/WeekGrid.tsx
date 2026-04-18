"use client";

import {
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfWeek(now: Date): Date {
	const d = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
	const dow = d.getUTCDay();
	const offset = dow === 0 ? -6 : 1 - dow;
	d.setUTCDate(d.getUTCDate() + offset);
	return d;
}

function isSameUTCDay(a: Date, b: Date): boolean {
	return (
		a.getUTCFullYear() === b.getUTCFullYear() &&
		a.getUTCMonth() === b.getUTCMonth() &&
		a.getUTCDate() === b.getUTCDate()
	);
}

type DriverSummary = {
	_id: Id<"users">;
	name: string | null;
	email: string | null;
	image: string | null;
};

function DraggableAvatar({ user }: { user: DriverSummary }) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: `user-${user._id}`,
		data: { userId: user._id },
	});
	return (
		<button
			ref={setNodeRef}
			type="button"
			{...attributes}
			{...listeners}
			className={cn(
				"flex items-center gap-2 rounded-full bg-paper px-2 py-1 ring-1 ring-foreground/10 cursor-grab active:cursor-grabbing transition-opacity",
				isDragging && "opacity-30",
			)}
			aria-label={user.name ?? user.email ?? ""}
		>
			<UserAvatar
				name={user.name}
				email={user.email}
				imageUrl={user.image}
				className="size-6 text-[0.6rem]"
			/>
			<span className="text-xs text-ink-soft pr-1">
				{user.name?.split(/\s+/)[0] ?? user.email}
			</span>
		</button>
	);
}

type AppointmentSummary = {
	_id: Id<"appointments">;
	title: string;
	startTime: number;
	driver: DriverSummary | null;
};

function DroppableAppointment({
	appointment,
	active,
	onSelect,
	timeFmt,
}: {
	appointment: AppointmentSummary;
	active: boolean;
	onSelect: (id: Id<"appointments">) => void;
	timeFmt: Intl.DateTimeFormat;
}) {
	const { isOver, setNodeRef } = useDroppable({
		id: `appt-${appointment._id}`,
		data: { appointmentId: appointment._id },
	});
	return (
		<button
			ref={setNodeRef}
			type="button"
			onClick={() => onSelect(appointment._id)}
			className={cn(
				"text-left rounded-lg p-2 bg-paper transition-colors",
				isOver
					? "ring-2 ring-sage"
					: active
						? "ring-2 ring-sage-deep"
						: "ring-1 ring-foreground/10 hover:ring-foreground/20",
			)}
		>
			<div className="text-xs text-ink-soft font-medium">
				{timeFmt.format(new Date(appointment.startTime))}
			</div>
			<div className="text-sm text-ink truncate mt-0.5">
				{appointment.title}
			</div>
			<div className="mt-1">
				{appointment.driver ? (
					<UserAvatar
						name={appointment.driver.name}
						email={appointment.driver.email}
						imageUrl={appointment.driver.image}
						className="size-5 text-[0.55rem]"
					/>
				) : (
					<span
						className="inline-block size-2 rounded-full bg-amber-ink"
						aria-hidden
					/>
				)}
			</div>
		</button>
	);
}

type Props = {
	weekStartMs: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	activeId?: Id<"appointments"> | null;
	onSelect: (id: Id<"appointments">) => void;
};

export function WeekGrid(props: Props) {
	return (
		<ClientOnly
			fallback={<div className="flex flex-col gap-4 min-h-96" aria-hidden />}
		>
			<WeekGridContent {...props} />
		</ClientOnly>
	);
}

function WeekGridContent({
	weekStartMs,
	onPrevWeek,
	onNextWeek,
	activeId,
	onSelect,
}: Props) {
	const locale = useLocale();
	const t = useTranslations("timar.weekGrid");
	const appointments = useQuery(api.appointments.byWeek, { weekStartMs });
	const users = useQuery(api.users.list);
	const update = useMutation(api.appointments.update);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor),
	);
	const [draggingUserId, setDraggingUserId] = useState<Id<"users"> | null>(
		null,
	);
	const now = new Date();

	const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
	const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric" });
	const monthFmt = new Intl.DateTimeFormat(locale, { month: "short" });
	const timeFmt = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});

	const weekStart = new Date(weekStartMs);
	const weekEnd = new Date(weekStartMs + 6 * DAY_MS);
	const dateRange = `${dayFmt.format(weekStart)}.–${dayFmt.format(weekEnd)}. ${monthFmt.format(weekEnd).replace(/\.$/, "")}`;

	function handleDragStart(ev: DragStartEvent) {
		const userId = ev.active.data.current?.userId as Id<"users"> | undefined;
		if (userId) setDraggingUserId(userId);
	}

	async function handleDragEnd(ev: DragEndEvent) {
		const userId = ev.active.data.current?.userId as Id<"users"> | undefined;
		const appointmentId = ev.over?.data.current?.appointmentId as
			| Id<"appointments">
			| undefined;
		setDraggingUserId(null);
		if (!userId || !appointmentId) return;
		try {
			await update({ id: appointmentId, driverId: userId });
		} catch (err) {
			console.error(err);
		}
	}

	const draggingUser = draggingUserId
		? (users?.find((u) => u._id === draggingUserId) ?? null)
		: null;

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<Button
						variant="ghost"
						size="touch-icon"
						onClick={onPrevWeek}
						aria-label={t("prev")}
					>
						<ChevronLeft aria-hidden />
					</Button>
					<div className="font-serif text-lg text-ink">{dateRange}</div>
					<Button
						variant="ghost"
						size="touch-icon"
						onClick={onNextWeek}
						aria-label={t("next")}
					>
						<ChevronRight aria-hidden />
					</Button>
				</div>

				<div className="grid grid-cols-7 gap-2">
					{Array.from({ length: 7 }).map((_, i) => {
						const cellDate = new Date(weekStartMs + i * DAY_MS);
						const isToday = isSameUTCDay(cellDate, now);
						const dayAppts = (appointments ?? [])
							.filter((a) => isSameUTCDay(new Date(a.startTime), cellDate))
							.sort((a, b) => a.startTime - b.startTime);
						return (
							<div
								key={cellDate.toISOString()}
								className={cn(
									"flex flex-col gap-2 p-3 rounded-xl min-h-48",
									isToday ? "bg-paper ring-1 ring-sage/30" : "bg-paper/60",
								)}
							>
								<div className="flex items-baseline gap-2">
									<div
										className={cn(
											"text-[0.7rem] font-semibold uppercase tracking-[0.1em]",
											isToday ? "text-sage-shadow" : "text-ink-faint",
										)}
									>
										{weekdayFmt.format(cellDate).replace(/\.$/, "")}
									</div>
									<div
										className={cn(
											"font-serif text-xl leading-none",
											isToday ? "text-ink" : "text-ink-soft",
										)}
									>
										{cellDate.getUTCDate()}
									</div>
								</div>
								<div className="flex flex-col gap-2 text-sm">
									{dayAppts.map((a) => (
										<DroppableAppointment
											key={a._id}
											appointment={a}
											active={a._id === activeId}
											onSelect={onSelect}
											timeFmt={timeFmt}
										/>
									))}
								</div>
							</div>
						);
					})}
				</div>

				{appointments && appointments.length === 0 ? (
					<p className="text-ink-faint text-center py-6">
						{t("noAppointments")}
					</p>
				) : null}

				{users && users.length > 0 ? (
					<div className="flex flex-col gap-2 pt-2 border-t border-divider">
						<div className="flex items-baseline justify-between gap-2">
							<span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
								{t("drivers")}
							</span>
							<span className="text-xs text-ink-faint">{t("dragHint")}</span>
						</div>
						<div className="flex flex-wrap gap-2">
							{users.map((u) => (
								<DraggableAvatar key={u._id} user={u} />
							))}
						</div>
					</div>
				) : null}
			</div>
			<DragOverlay>
				{draggingUser ? (
					<div className="flex items-center gap-2 rounded-full bg-paper px-2 py-1 ring-2 ring-sage-deep shadow-lg">
						<UserAvatar
							name={draggingUser.name}
							email={draggingUser.email}
							imageUrl={draggingUser.image}
							className="size-6 text-[0.6rem]"
						/>
						<span className="text-xs text-ink-soft pr-1">
							{draggingUser.name?.split(/\s+/)[0] ?? draggingUser.email}
						</span>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
