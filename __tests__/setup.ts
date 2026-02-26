/**
 * Vitest global setup
 * - Configures mock Supabase client factory
 * - Loads environment variables from .env.local
 */

import { vi } from "vitest";
import { config } from "dotenv";

// Load .env.local for test environment (Supabase keys etc.)
config({ path: ".env.local" });

// ============================================================
// Mock Supabase Client Factory
// ============================================================

export interface MockSupabaseResponse<T = unknown> {
    data: T | null;
    error: { message: string; code?: string } | null;
}

/**
 * Creates a configurable mock Supabase client.
 * Usage:
 *   const mock = createMockSupabaseClient({ data: [...], error: null });
 *   vi.mocked(createClient).mockReturnValue(mock);
 */
export function createMockSupabaseClient<T = unknown>(
    response: MockSupabaseResponse<T> = { data: null, error: null }
) {
    const chainable = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(response),
        maybeSingle: vi.fn().mockResolvedValue(response),
        then: vi.fn((resolve: (v: MockSupabaseResponse<T>) => void) => resolve(response)),
    };

    return {
        from: vi.fn().mockReturnValue(chainable),
        rpc: vi.fn().mockResolvedValue(response),
        auth: {
            getUser: vi.fn().mockResolvedValue({
                data: { user: { id: "test-user-id", email: "test@example.com" } },
                error: null,
            }),
            getSession: vi.fn().mockResolvedValue({
                data: { session: { access_token: "test-token" } },
                error: null,
            }),
        },
    };
}

// ============================================================
// Real Supabase Client (for integration tests)
// ============================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a real Supabase client with the specified role for integration tests.
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
export function createTestSupabaseClient(role: "service_role" | "anon" = "service_role") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
        role === "service_role"
            ? process.env.SUPABASE_SERVICE_ROLE_KEY
            : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        throw new Error(
            `Missing Supabase env vars for ${role} client. ` +
            `Set NEXT_PUBLIC_SUPABASE_URL and ${role === "service_role" ? "SUPABASE_SERVICE_ROLE_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY"} in .env.local`
        );
    }

    return createSupabaseClient(url, key);
}
