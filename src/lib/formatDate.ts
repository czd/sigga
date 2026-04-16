const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function startOfDay(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export type RelativeDate =
	| { kind: "justNow" }
	| { kind: "minutesAgo"; count: number }
	| { kind: "hoursAgo"; count: number }
	| { kind: "today" }
	| { kind: "yesterday" }
	| { kind: "daysAgo"; count: number }
	| { kind: "absolute" };

export function classifyRelative(
	timestamp: number,
	now: number = Date.now(),
): RelativeDate {
	const diff = now - timestamp;
	if (diff < 5 * MS_PER_MINUTE) return { kind: "justNow" };
	if (diff < MS_PER_HOUR) {
		return { kind: "minutesAgo", count: Math.round(diff / MS_PER_MINUTE) };
	}

	const today = startOfDay(new Date(now));
	const then = startOfDay(new Date(timestamp));
	const dayDelta = Math.round((today - then) / MS_PER_DAY);

	if (dayDelta <= 0) {
		const hours = Math.round(diff / MS_PER_HOUR);
		if (hours < 6) return { kind: "hoursAgo", count: Math.max(1, hours) };
		return { kind: "today" };
	}
	if (dayDelta === 1) return { kind: "yesterday" };
	if (dayDelta <= 6) return { kind: "daysAgo", count: dayDelta };
	return { kind: "absolute" };
}

export function formatAbsolute(timestamp: number, locale: string): string {
	return new Intl.DateTimeFormat(locale, {
		weekday: "short",
		day: "numeric",
		month: "long",
	}).format(new Date(timestamp));
}

export function formatAbsoluteWithTime(
	timestamp: number,
	locale: string,
): string {
	const dateFmt = new Intl.DateTimeFormat(locale, {
		weekday: "short",
		day: "numeric",
		month: "long",
	});
	const timeFmt = new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
	const date = new Date(timestamp);
	const prefix = locale.startsWith("is") ? "kl." : "at";
	return `${dateFmt.format(date)} ${prefix} ${timeFmt.format(date)}`;
}
