"use client";

import { useQuery } from "convex/react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/../convex/_generated/api";
import type { Doc } from "@/../convex/_generated/dataModel";

type ContactDoc = Doc<"contacts">;

function telHref(raw: string): string {
	const digits = raw.replace(/[^\d+]/g, "");
	if (digits.length === 0) return "tel:";
	if (digits.startsWith("+")) return `tel:${digits}`;
	if (digits.length <= 4) return `tel:${digits}`;
	if (digits.startsWith("354")) return `tel:+${digits}`;
	return `tel:+354${digits}`;
}

type Tone = "coral" | "wheat" | "sage";

const TONE_CLASSES: Record<Tone, string> = {
	coral: "bg-[#f1d9d9] text-[#9a4a4a] ring-[#9a4a4a]/12 active:bg-[#ebcccc]",
	wheat:
		"bg-[#ece1c2] text-amber-ink-deep ring-amber-ink/15 active:bg-[#e4d7b4]",
	sage: "bg-[#d7dec9] text-sage-shadow ring-sage-shadow/15 active:bg-[#cdd6bc]",
};

function EmergencyTile({
	tone,
	phone,
	label,
}: {
	tone: Tone;
	phone: string;
	label: string;
}) {
	return (
		<a
			href={telHref(phone)}
			className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl px-3 py-4 text-center ring-1 transition-colors ${TONE_CLASSES[tone]}`}
			aria-label={`${label}: ${phone}`}
		>
			<Phone aria-hidden className="size-6" strokeWidth={1.8} />
			<div className="flex flex-col items-center gap-0.5">
				<span className="font-serif text-xl leading-none font-medium tracking-tight">
					{phone}
				</span>
				<span className="text-[0.78rem] leading-tight font-medium">
					{label}
				</span>
			</div>
		</a>
	);
}

export function EmergencyTiles() {
	const t = useTranslations("folk");
	const contacts = useQuery(api.contacts.list, {});

	const emergency = (contacts ?? []).filter(
		(c: ContactDoc) => c.category === "emergency",
	);
	if (contacts === undefined) {
		return (
			<div className="flex flex-col gap-2">
				<div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">
					{t("emergencyLabel")}
				</div>
				<div className="grid grid-cols-3 gap-3">
					{[0, 1, 2].map((i) => (
						<div
							key={i}
							className="min-h-28 rounded-2xl bg-paper-deep/60 ring-1 ring-foreground/5"
						/>
					))}
				</div>
			</div>
		);
	}
	if (emergency.length === 0) return null;

	const tones: Tone[] = ["coral", "wheat", "sage"];
	const tiles = emergency.slice(0, 3);

	return (
		<section aria-labelledby="emergency-label" className="flex flex-col gap-2">
			<div
				id="emergency-label"
				className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint"
			>
				{t("emergencyLabel")}
			</div>
			<div className="grid grid-cols-3 gap-3">
				{tiles.map((c, i) => (
					<EmergencyTile
						key={c._id}
						tone={tones[i] ?? "sage"}
						phone={c.phone ?? ""}
						label={c.name}
					/>
				))}
			</div>
		</section>
	);
}
