import { describe, expect, it } from "vitest";
import { classifyRelative } from "./formatDate";

const NOON = new Date("2026-04-19T12:00:00Z").getTime();
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("classifyRelative", () => {
	it("treats anything within the last 5 minutes as justNow", () => {
		expect(classifyRelative(NOON - 30_000, NOON)).toEqual({ kind: "justNow" });
		expect(classifyRelative(NOON - 4 * MIN - 59_000, NOON)).toEqual({
			kind: "justNow",
		});
	});

	it("crosses from justNow to minutesAgo at exactly 5 minutes", () => {
		expect(classifyRelative(NOON - 5 * MIN, NOON)).toEqual({
			kind: "minutesAgo",
			count: 5,
		});
	});

	it("rounds to the nearest minute inside the first hour", () => {
		expect(classifyRelative(NOON - 30 * MIN, NOON)).toEqual({
			kind: "minutesAgo",
			count: 30,
		});
	});

	it("uses hoursAgo for the first 6 hours on the same day", () => {
		expect(classifyRelative(NOON - 2 * HOUR, NOON)).toEqual({
			kind: "hoursAgo",
			count: 2,
		});
	});

	it("switches to 'today' once more than 6 hours have passed on the same day", () => {
		// Use local-midnight math to match startOfDay's implementation.
		const sameDayMorning = new Date("2026-04-19T02:00:00").getTime();
		const lateEvening = new Date("2026-04-19T23:00:00").getTime();
		expect(classifyRelative(sameDayMorning, lateEvening).kind).toBe("today");
	});

	it("classifies the previous calendar day as yesterday", () => {
		const yesterday = new Date("2026-04-18T12:00:00").getTime();
		const today = new Date("2026-04-19T12:00:00").getTime();
		expect(classifyRelative(yesterday, today)).toEqual({ kind: "yesterday" });
	});

	it("uses daysAgo for 2–6 day deltas", () => {
		const past = new Date("2026-04-15T12:00:00").getTime();
		const ref = new Date("2026-04-19T12:00:00").getTime();
		expect(classifyRelative(past, ref)).toEqual({
			kind: "daysAgo",
			count: 4,
		});
	});

	it("falls back to absolute beyond 6 days", () => {
		expect(classifyRelative(NOON - 7 * DAY, NOON)).toEqual({
			kind: "absolute",
		});
		expect(classifyRelative(NOON - 30 * DAY, NOON)).toEqual({
			kind: "absolute",
		});
	});
});
