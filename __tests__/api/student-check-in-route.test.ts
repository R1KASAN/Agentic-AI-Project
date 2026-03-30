/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/student/check-in/route";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
    createClient: vi.fn(),
}));

type MockResponse<T = unknown> = {
    data: T | null;
    error: { message: string; code?: string } | null;
};

function makeChain<T>(response: MockResponse<T>) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(response),
        maybeSingle: vi.fn().mockResolvedValue(response),
    };
}

function makeSupabaseMock(options?: {
    userResponse?: MockResponse<{ user: { id: string } }>;
    profileResponse?: MockResponse<{ role: string }>;
    enrollmentResponse?: MockResponse<{ class_id: string }>;
    insertResponse?: MockResponse<null>;
}) {
    const userResponse =
        options?.userResponse ?? {
            data: { user: { id: "student-123" } },
            error: null,
        };
    const profileResponse =
        options?.profileResponse ?? {
            data: { role: "student" },
            error: null,
        };
    const enrollmentResponse =
        options?.enrollmentResponse ?? {
            data: { class_id: "class-123" },
            error: null,
        };
    const insertResponse =
        options?.insertResponse ?? {
            data: null,
            error: null,
        };

    const usersChain = makeChain(profileResponse);
    const enrollmentsChain = makeChain(enrollmentResponse);
    const insert = vi.fn().mockResolvedValue(insertResponse);

    const supabase = {
        auth: {
            getUser: vi.fn().mockResolvedValue(userResponse),
        },
        from: vi.fn((table: string) => {
            if (table === "users") return usersChain;
            if (table === "class_enrollments") return enrollmentsChain;
            if (table === "student_pulses") return { insert };
            throw new Error(`Unexpected table: ${table}`);
        }),
        __mocks: {
            insert,
            usersChain,
            enrollmentsChain,
        },
    };

    return supabase;
}

function buildRequest() {
    return new Request("http://localhost/api/student/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            class_id: "class-123",
            mood: 3,
            pace: 4,
            fairness: 5,
            content: "  daily check-in note  ",
        }),
    });
}

describe("POST /api/student/check-in", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns alreadyCheckedIn when the database rejects a duplicate submission", async () => {
        const supabase = makeSupabaseMock({
            insertResponse: {
                data: null,
                error: {
                    message: "duplicate key value violates unique constraint",
                    code: "23505",
                },
            },
        });

        vi.mocked(createClient).mockResolvedValue(supabase as never);

        const response = await POST(buildRequest());
        const body = (await response.json()) as {
            success: boolean;
            alreadyCheckedIn: boolean;
        };

        expect(response.status).toBe(200);
        expect(body).toEqual({
            success: true,
            alreadyCheckedIn: true,
        });
        expect(supabase.__mocks.insert).toHaveBeenCalledWith({
            class_id: "class-123",
            mood: "okay",
            pace: 4,
            fairness: 5,
            optional_text: "daily check-in note",
            student_id: "student-123",
        });
    });

    it("returns success when the first daily check-in inserts cleanly", async () => {
        const supabase = makeSupabaseMock();
        vi.mocked(createClient).mockResolvedValue(supabase as never);

        const response = await POST(buildRequest());
        const body = (await response.json()) as {
            success: boolean;
            alreadyCheckedIn: boolean;
        };

        expect(response.status).toBe(201);
        expect(body).toEqual({
            success: true,
            alreadyCheckedIn: false,
        });
    });
});
