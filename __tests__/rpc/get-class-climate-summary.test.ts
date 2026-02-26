/**
 * RPC Integration Tests: get_class_climate_summary — k-anonymity enforcement
 *
 * Validates migration 005 RPC function:
 * - Returns privacy_locked=true when response_count < 3
 * - Returns aggregated data when response_count >= 3
 * - Never exposes raw optional_text in the summary output
 *
 * Runs against a REAL Supabase instance using service_role.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestSupabaseClient } from "../setup";

const serviceClient = createTestSupabaseClient("service_role");

// Use unique class IDs per test to avoid interference
const CLASS_UNDER_THRESHOLD = "00000000-0000-0000-0000-00000000aa01";
const CLASS_OVER_THRESHOLD = "00000000-0000-0000-0000-00000000aa02";
const CLASS_TEXT_CHECK = "00000000-0000-0000-0000-00000000aa03";
const insertedIds: string[] = [];

// Helper: insert N test pulses for a given class
async function insertTestPulses(
    classId: string,
    count: number,
    moods: string[] = ["great", "okay", "good", "low", "very_low"],
    optionalText: string | null = null
) {
    const rows = Array.from({ length: count }, (_, i) => ({
        class_id: classId,
        mood: moods[i % moods.length],
        pace: (i % 5) + 1,
        fairness: (i % 5) + 1,
        optional_text: optionalText,
    }));

    const { data, error } = await serviceClient
        .from("student_pulses")
        .insert(rows)
        .select("id");

    if (error) throw new Error(`Test setup failed: ${error.message}`);
    if (data) data.forEach((row: { id: string }) => insertedIds.push(row.id));
}

describe("get_class_climate_summary — k-anonymity enforcement", () => {
    beforeAll(async () => {
        // Ensure test classes exist (service_role can bypass class FK if needed)
        // Insert test data for each scenario
        await insertTestPulses(CLASS_UNDER_THRESHOLD, 2, ["great", "okay"]);
        await insertTestPulses(CLASS_OVER_THRESHOLD, 3, ["great", "okay", "good"]);
        await insertTestPulses(CLASS_TEXT_CHECK, 5, ["great", "okay", "good", "low", "very_low"], "sensitive student text");
    });

    afterAll(async () => {
        if (insertedIds.length > 0) {
            await serviceClient
                .from("student_pulses")
                .delete()
                .in("id", insertedIds);
        }
    });

    it("returns privacy_locked=true when student count < 3", async () => {
        const { data, error } = await serviceClient.rpc("get_class_climate_summary", {
            p_class_id: CLASS_UNDER_THRESHOLD,
            p_weeks: 4,
        });

        expect(error).toBeNull();
        expect(data).not.toBeNull();

        // RPC returns { privacy_locked: true, response_count: N } when N < 3
        const result = typeof data === "string" ? JSON.parse(data) : data;
        expect(result.privacy_locked).toBe(true);
        expect(result.response_count).toBeLessThan(3);

        // Should NOT contain any mood/pace/fairness aggregates
        expect(result.avg_pace).toBeUndefined();
        expect(result.avg_fairness).toBeUndefined();
    });

    it("returns aggregate data when student count >= 3", async () => {
        const { data, error } = await serviceClient.rpc("get_class_climate_summary", {
            p_class_id: CLASS_OVER_THRESHOLD,
            p_weeks: 4,
        });

        expect(error).toBeNull();
        expect(data).not.toBeNull();

        const result = typeof data === "string" ? JSON.parse(data) : data;
        expect(result.privacy_locked).toBe(false);
        expect(result.response_count).toBeGreaterThanOrEqual(3);

        // Should contain aggregated fields
        expect(result.avg_pace).toBeDefined();
        expect(result.avg_fairness).toBeDefined();
        expect(result.main_mood).toBeDefined();
    });

    it("never returns raw optional_text in the summary", async () => {
        const { data, error } = await serviceClient.rpc("get_class_climate_summary", {
            p_class_id: CLASS_TEXT_CHECK,
            p_weeks: 4,
        });

        expect(error).toBeNull();
        expect(data).not.toBeNull();

        // Stringify the entire response and check that raw text is NOT present
        const stringified = JSON.stringify(data);
        expect(stringified).not.toContain("sensitive student text");

        // Also verify no optional_text key exists
        const result = typeof data === "string" ? JSON.parse(data) : data;
        expect(result.optional_text).toBeUndefined();
    });
});
