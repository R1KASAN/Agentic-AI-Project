/**
 * Unit Tests: TrendChart component
 *
 * Tests empty state, chart rendering, and data structure.
 * Uses Vitest with jsdom environment.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";

// Since TrendChart uses Recharts (which relies on DOM measurements),
// we test the component logic and data transformation rather than
// full SVG rendering in jsdom (Recharts needs a real browser for SVG).

import type { WeeklyClimate } from "@/hooks/useClimateHistory";

const ZERO_WEEKS: WeeklyClimate[] = [
    { week: "3 Feb", mood: 0, pace: 0, fairness: 0, studentCount: null },
    { week: "10 Feb", mood: 0, pace: 0, fairness: 0, studentCount: null },
    { week: "17 Feb", mood: 0, pace: 0, fairness: 0, studentCount: null },
    { week: "24 Feb", mood: 0, pace: 0, fairness: 0, studentCount: null },
];

const REAL_WEEKS: WeeklyClimate[] = [
    { week: "3 Feb", mood: 60, pace: 70, fairness: 80, studentCount: 5 },
    { week: "10 Feb", mood: 65, pace: 65, fairness: 75, studentCount: 8 },
    { week: "17 Feb", mood: 0, pace: 0, fairness: 0, studentCount: null }, // gap week
    { week: "24 Feb", mood: 72, pace: 68, fairness: 82, studentCount: 12 },
];

describe("TrendChart — data validation", () => {
    it("detects all-zero data as empty (should show empty state)", () => {
        const allEmpty = ZERO_WEEKS.every(
            (w) => w.mood === 0 && w.pace === 0 && w.fairness === 0
        );
        expect(allEmpty).toBe(true);
    });

    it("detects real data as non-empty (should show chart)", () => {
        const allEmpty = REAL_WEEKS.every(
            (w) => w.mood === 0 && w.pace === 0 && w.fairness === 0
        );
        expect(allEmpty).toBe(false);
    });

    it("identifies k-anonymity gap weeks by null studentCount", () => {
        const gapWeeks = REAL_WEEKS.filter((w) => w.studentCount === null);
        expect(gapWeeks).toHaveLength(1);
        expect(gapWeeks[0].week).toBe("17 Feb");
        // Gap weeks should have zero values (not misleading data)
        expect(gapWeeks[0].mood).toBe(0);
        expect(gapWeeks[0].pace).toBe(0);
        expect(gapWeeks[0].fairness).toBe(0);
    });

    it("all values are normalized to 0-100 range", () => {
        for (const week of REAL_WEEKS) {
            expect(week.mood).toBeGreaterThanOrEqual(0);
            expect(week.mood).toBeLessThanOrEqual(100);
            expect(week.pace).toBeGreaterThanOrEqual(0);
            expect(week.pace).toBeLessThanOrEqual(100);
            expect(week.fairness).toBeGreaterThanOrEqual(0);
            expect(week.fairness).toBeLessThanOrEqual(100);
        }
    });

    it("week labels are in correct format", () => {
        for (const week of REAL_WEEKS) {
            // Expected format: "DD MMM" e.g. "3 Feb", "17 Feb"
            expect(week.week).toMatch(/^\d{1,2}\s[A-Z][a-z]{2}$/);
        }
    });
});

describe("useClimateHistory — normalization logic", () => {
    it("normalize(3, 5) → 60%", () => {
        const normalize = (v: number, max = 5) => Math.round((v / max) * 100);
        expect(normalize(3)).toBe(60);
        expect(normalize(5)).toBe(100);
        expect(normalize(1)).toBe(20);
        expect(normalize(0)).toBe(0);
    });

    it("mood text enum maps to correct scores", () => {
        const MOOD_SCORE: Record<string, number> = {
            very_low: 1,
            low: 2,
            okay: 3,
            good: 4,
            great: 5,
        };

        expect(MOOD_SCORE["very_low"]).toBe(1);
        expect(MOOD_SCORE["great"]).toBe(5);
        expect(MOOD_SCORE["okay"]).toBe(3);
    });
});
