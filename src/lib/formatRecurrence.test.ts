import { describe, expect, it } from "vitest";
import {
	computeNextStartTime,
	isValidTimeOfDay,
	normaliseDaysOfWeek,
} from "./formatRecurrence";

// Iceland is UTC+0, so UTC timestamps match wall-clock times Sigga's family sees.
// These tests anchor on fixed UTC instants to avoid accidental local-time drift.

describe("isValidTimeOfDay", () => {
	it("accepts HH:mm", () => {
		expect(isValidTimeOfDay("00:00")).toBe(true);
		expect(isValidTimeOfDay("09:30")).toBe(true);
		expect(isValidTimeOfDay("23:59")).toBe(true);
	});

	it("rejects malformed times", () => {
		expect(isValidTimeOfDay("24:00")).toBe(false);
		expect(isValidTimeOfDay("9:30")).toBe(false);
		expect(isValidTimeOfDay("09:60")).toBe(false);
		expect(isValidTimeOfDay("noon")).toBe(false);
		expect(isValidTimeOfDay("")).toBe(false);
	});
});

describe("normaliseDaysOfWeek", () => {
	it("dedupes and sorts", () => {
		expect(normaliseDaysOfWeek([2, 4, 2, 1])).toEqual([1, 2, 4]);
	});

	it("throws on out-of-range or non-integer", () => {
		expect(() => normaliseDaysOfWeek([7])).toThrow();
		expect(() => normaliseDaysOfWeek([-1])).toThrow();
		expect(() => normaliseDaysOfWeek([1.5])).toThrow();
	});
});

describe("computeNextStartTime", () => {
	// Sunday 2026-04-19 at 08:00 UTC — we're asking "when's the next
	// appointment" on a Sunday morning.
	const NOW = Date.UTC(2026, 3, 19, 8, 0, 0, 0); // month is 0-indexed

	it("returns the next matching day later today if still upcoming", () => {
		// Sunday pattern, 10:00 — 2 hours later same day.
		const next = computeNextStartTime({
			daysOfWeek: [0],
			timeOfDay: "10:00",
			now: NOW,
		});
		expect(next).toBe(Date.UTC(2026, 3, 19, 10, 0, 0, 0));
	});

	it("skips today if the timeOfDay has already passed", () => {
		// Sunday pattern, 06:00 — already past on Sunday at 08:00, so
		// next is *next* Sunday (2026-04-26).
		const next = computeNextStartTime({
			daysOfWeek: [0],
			timeOfDay: "06:00",
			now: NOW,
		});
		expect(next).toBe(Date.UTC(2026, 3, 26, 6, 0, 0, 0));
	});

	it("finds the nearest day in a multi-day pattern", () => {
		// Tue/Fri pattern. From Sunday, Tuesday (2026-04-21) is nearest.
		const next = computeNextStartTime({
			daysOfWeek: [2, 5],
			timeOfDay: "14:30",
			now: NOW,
		});
		expect(next).toBe(Date.UTC(2026, 3, 21, 14, 30, 0, 0));
	});

	it("wraps across the week when the pattern only matches before now", () => {
		// Saturday-only pattern. From Sunday, Saturday is 6 days out.
		const next = computeNextStartTime({
			daysOfWeek: [6],
			timeOfDay: "09:00",
			now: NOW,
		});
		expect(next).toBe(Date.UTC(2026, 3, 25, 9, 0, 0, 0));
	});

	it("returns a *strictly* future timestamp (never equal to now)", () => {
		// Pattern that matches exactly now — we expect the *next* matching
		// instant (a week out), not the current one.
		const exactMatch = Date.UTC(2026, 3, 19, 8, 0, 0, 0); // Sunday 08:00
		const next = computeNextStartTime({
			daysOfWeek: [0],
			timeOfDay: "08:00",
			now: exactMatch,
		});
		expect(next).toBe(Date.UTC(2026, 3, 26, 8, 0, 0, 0));
	});

	it("throws on empty daysOfWeek", () => {
		expect(() =>
			computeNextStartTime({ daysOfWeek: [], timeOfDay: "09:00", now: NOW }),
		).toThrow();
	});

	it("throws on invalid timeOfDay", () => {
		expect(() =>
			computeNextStartTime({ daysOfWeek: [0], timeOfDay: "25:00", now: NOW }),
		).toThrow();
	});
});
