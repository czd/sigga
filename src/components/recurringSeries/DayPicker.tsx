"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type DayPickerProps = {
	value: number[];
	onChange: (next: number[]) => void;
	disabled?: boolean;
};

export function DayPicker({ value, onChange, disabled }: DayPickerProps) {
	const t = useTranslations("recurring.form.daysShort");
	const tFields = useTranslations("recurring.form.fields");
	const selected = new Set(value);

	function toggle(day: number) {
		const next = new Set(selected);
		if (next.has(day)) next.delete(day);
		else next.add(day);
		onChange(Array.from(next).sort((a, b) => a - b));
	}

	const order = [0, 1, 2, 3, 4, 5, 6];
	return (
		<fieldset
			className="grid grid-cols-7 gap-1.5 border-0 p-0 m-0"
			aria-label={tFields("days")}
		>
			{order.map((day) => {
				const active = selected.has(day);
				return (
					<button
						key={day}
						type="button"
						aria-pressed={active}
						disabled={disabled}
						onClick={() => toggle(day)}
						className={cn(
							"h-12 rounded-full text-sm font-medium transition-colors",
							active
								? "bg-sage-deep text-paper"
								: "bg-paper-deep text-ink-soft hover:text-ink",
							disabled && "opacity-50",
						)}
					>
						{t(String(day))}
					</button>
				);
			})}
		</fieldset>
	);
}
