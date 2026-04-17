const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeOfDay(timeOfDay: string): boolean {
	return TIME_RE.test(timeOfDay);
}

export function normaliseDaysOfWeek(days: readonly number[]): number[] {
	const unique = Array.from(new Set(days));
	for (const d of unique) {
		if (!Number.isInteger(d) || d < 0 || d > 6) {
			throw new Error(`Invalid day-of-week: ${d}`);
		}
	}
	return unique.sort((a, b) => a - b);
}

/**
 * Given a pattern and a reference timestamp (ms), return the next moment
 * strictly after `now` that matches. Iceland is UTC+0 year-round, so we can
 * do the math purely in UTC without DST concerns.
 *
 * Mirror of `computeNextStartTime` in `convex/recurringSeries.ts` (kept
 * duplicated so Convex bundles cleanly without reaching across repo). If
 * you change the algorithm here, change it there too.
 */
export function computeNextStartTime(params: {
	daysOfWeek: readonly number[];
	timeOfDay: string;
	now: number;
}): number {
	if (!isValidTimeOfDay(params.timeOfDay)) {
		throw new Error(`Invalid timeOfDay: ${params.timeOfDay}`);
	}
	const days = normaliseDaysOfWeek(params.daysOfWeek);
	if (days.length === 0) {
		throw new Error("daysOfWeek must not be empty");
	}
	const [hh, mm] = params.timeOfDay.split(":").map(Number);

	const nowDate = new Date(params.now);
	for (let i = 0; i < 8; i++) {
		const candidate = Date.UTC(
			nowDate.getUTCFullYear(),
			nowDate.getUTCMonth(),
			nowDate.getUTCDate() + i,
			hh,
			mm,
			0,
			0,
		);
		const dow = new Date(candidate).getUTCDay();
		if (days.includes(dow) && candidate > params.now) {
			return candidate;
		}
	}
	// Unreachable in practice: any non-empty days array matches within 7 days.
	throw new Error("Could not compute next occurrence within 7 days");
}

export type FormatDaysLabels = Record<number, string>; // 0..6 -> localised long day name

/**
 * Format a list of day indices as a localised joined string like
 * "þriðjudaga og föstudaga". Consumers pass in the long-day labels from i18n.
 */
export function formatDays(
	days: readonly number[],
	longLabels: FormatDaysLabels,
	locale: string,
): string {
	const sorted = normaliseDaysOfWeek(days);
	const parts = sorted.map((d) => longLabels[d] ?? "");
	if (parts.length === 0) return "";
	if (typeof Intl !== "undefined" && "ListFormat" in Intl) {
		return new Intl.ListFormat(locale, { type: "conjunction" }).format(parts);
	}
	if (parts.length === 1) return parts[0];
	return `${parts.slice(0, -1).join(", ")} og ${parts[parts.length - 1]}`;
}
