"use client";

import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/shared/UserAvatar";

export type SeenByUser = {
	id: string;
	name: string | null;
	image: string | null;
};

type SeenByClusterProps = {
	/** Users whose read high-water lands on this entry (current user excluded). */
	users: SeenByUser[];
};

const MAX_AVATARS = 3;

/**
 * Messenger-style "seen by" avatar cluster. Renders on the entry that is a
 * person's landing entry (the newest one they've seen). Presence only — no
 * "unseen" callouts, no pressure (read-receipt tone guardrail).
 */
export function SeenByCluster({ users }: SeenByClusterProps) {
	const t = useTranslations("dagbok.seenBy");
	if (users.length === 0) return null;

	const shown = users.slice(0, MAX_AVATARS);
	const overflow = users.length - shown.length;
	const names = users.map((u) => u.name ?? "—").join(", ");
	const srLabel =
		users.length === 1 ? t("one", { name: names }) : t("label", { names });

	return (
		<div className="ml-auto flex items-center gap-1">
			<span className="sr-only">{srLabel}</span>
			<div className="flex -space-x-2" aria-hidden>
				{shown.map((user) => (
					<UserAvatar
						key={user.id}
						name={user.name}
						imageUrl={user.image}
						className="size-6 ring-2 ring-card"
					/>
				))}
			</div>
			{overflow > 0 ? (
				<span aria-hidden className="text-xs text-ink-soft">
					+{overflow}
				</span>
			) : null}
		</div>
	);
}
