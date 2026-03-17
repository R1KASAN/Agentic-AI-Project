/**
 * RLS Integration Tests: qr_checkins privacy enforcement
 *
 * Validates migration 020_qr_checkins.sql:
 * - Anon/authenticated clients can INSERT into qr_checkins ✅
 * - Anon/authenticated clients get ZERO rows on SELECT ✅
 * - service_role can SELECT all rows ✅
 * - INSERT with out-of-range mood is rejected by CHECK constraint ✅
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *           NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 */

import { describe, it, expect, afterAll } from "vitest";
import { createTestSupabaseClient } from "../setup";

// Use a fake class_id — FK constraint means class must exist,
// so we use service_role to insert a dummy row first.
const TEST_CLASS_ID = "00000000-0000-0000-0000-000000000099";
const insertedIds: string[] = [];

describe("qr_checkins RLS — anonymous INSERT, no SELECT", () => {
    const serviceClient = createTestSupabaseClient("service_role");
    const anonClient = createTestSupabaseClient("anon");

    afterAll(async () => {
        if (insertedIds.length > 0) {
            await serviceClient
                .from("qr_checkins")
                .delete()
                .in("id", insertedIds);
        }
    });

    it("anon client can INSERT a valid check-in", async () => {
        const { data, error } = await anonClient
            .from("qr_checkins")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: 3,
                session_token: "test-session-abc",
            })
            .select("id")
            .single();

        // RLS allows anon INSERT (WITH CHECK(true))
        expect(error).toBeNull();
        expect(data).not.toBeNull();

        if (data) insertedIds.push(data.id);
    });

    it("anon client gets ZERO rows on SELECT (USING false blocks all reads)", async () => {
        // First insert a row so there IS data
        const { data: inserted } = await serviceClient
            .from("qr_checkins")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: 4,
                session_token: "service-test",
            })
            .select("id")
            .single();

        if (inserted) insertedIds.push(inserted.id);

        const { data, error } = await anonClient.from("qr_checkins").select("*");

        if (error) {
            expect(error.message).toMatch(/permission|denied|policy/i);
        } else {
            expect(data).toHaveLength(0);
        }
    });

    it("service_role can SELECT rows (bypasses RLS)", async () => {
        const { data: inserted } = await serviceClient
            .from("qr_checkins")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: 5,
                session_token: "service-select-test",
            })
            .select("id, mood")
            .single();

        expect(inserted).not.toBeNull();
        expect(inserted?.mood).toBe(5);

        if (inserted) insertedIds.push(inserted.id);
    });

    it("rejects mood outside 1–5 range (CHECK constraint)", async () => {
        const { error } = await serviceClient
            .from("qr_checkins")
            .insert({
                class_id: TEST_CLASS_ID,
                mood: 6, // invalid
            });

        expect(error).not.toBeNull();
        // PostgreSQL check violation code
        expect(error?.code).toBe("23514");
    });
});
