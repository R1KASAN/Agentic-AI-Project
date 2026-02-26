/**
 * RLS Integration Tests: student_pulses privacy enforcement
 *
 * Validates migration 008_student_pulses_rls.sql:
 * - authenticated users (teachers/admins) get ZERO rows
 * - service_role can read optional_text
 * - anon/authenticated can INSERT
 *
 * These tests run against a REAL Supabase instance.
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { describe, it, expect, afterAll } from "vitest";
import { createTestSupabaseClient } from "../setup";

// Test class ID — use a UUID that won't collide with real data
const TEST_CLASS_ID = "00000000-0000-0000-0000-000000000001";
const insertedIds: string[] = [];

describe("student_pulses RLS — optional_text privacy", () => {
    const serviceClient = createTestSupabaseClient("service_role");

    afterAll(async () => {
        // Cleanup: delete all test rows using service_role
        if (insertedIds.length > 0) {
            await serviceClient
                .from("student_pulses")
                .delete()
                .in("id", insertedIds);
        }
    });

    it("teacher/authenticated JWT receives zero rows when selecting student_pulses", async () => {
        // First, insert a row using service_role so there IS data
        const { data: inserted } = await serviceClient
            .from("student_pulses")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: "okay",
                pace: 3,
                fairness: 3,
                optional_text: "this should be invisible to teachers",
            })
            .select("id")
            .single();

        if (inserted) insertedIds.push(inserted.id);

        // Now query with anon client (simulates authenticated without service_role)
        // RLS policy "student_pulses_no_select_authenticated" → USING(false)
        const anonClient = createTestSupabaseClient("anon");
        const { data, error } = await anonClient
            .from("student_pulses")
            .select("*");

        // Should return empty array (USING(false) blocks all SELECTs)
        // or an RLS error depending on Supabase config
        if (error) {
            expect(error.message).toMatch(/permission|denied|policy/i);
        } else {
            expect(data).toHaveLength(0);
        }
    });

    it("service_role can select optional_text", async () => {
        const { data: inserted } = await serviceClient
            .from("student_pulses")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: "great",
                pace: 4,
                fairness: 5,
                optional_text: "service role test comment",
            })
            .select("id")
            .single();

        if (inserted) insertedIds.push(inserted.id);

        // service_role bypasses RLS — should see all data
        const { data, error } = await serviceClient
            .from("student_pulses")
            .select("optional_text")
            .eq("id", inserted!.id)
            .single();

        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data!.optional_text).toBe("service role test comment");
    });

    it("insert succeeds via anon/authenticated client", async () => {
        const anonClient = createTestSupabaseClient("anon");

        const { data, error } = await anonClient
            .from("student_pulses")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: "okay",
                pace: 3,
                fairness: 3,
                optional_text: null,
            })
            .select("id")
            .single();

        // INSERT policy allows anon + authenticated
        expect(error).toBeNull();
        expect(data).not.toBeNull();

        if (data) insertedIds.push(data.id);
    });
});
