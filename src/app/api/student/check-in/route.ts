import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Maps integer mood values from the CheckInForm emoji picker to TEXT enum
// for the student_pulses table (canonical schema per T036).
const MOOD_MAP: Record<number, string> = {
    1: "very_low",
    2: "low",
    3: "neutral",
    4: "good",
    5: "great",
};

const VALID_MOODS = new Set(Object.keys(MOOD_MAP).map(Number));

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Verify authenticated user
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is a student
        const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "student") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Parse request body
        const body = await request.json();
        const { class_id, mood, pace, fairness, content } = body;

        // Validate required fields
        if (!class_id || mood === undefined || !pace || !fairness) {
            return NextResponse.json(
                { error: "Missing required fields: class_id, mood, pace, fairness" },
                { status: 400 }
            );
        }

        // Validate mood (integer 1-5, mapped to TEXT enum)
        if (!VALID_MOODS.has(mood)) {
            return NextResponse.json(
                { error: "mood must be an integer between 1 and 5" },
                { status: 400 }
            );
        }

        // Validate pace and fairness ranges (1-5 integers)
        if (
            ![pace, fairness].every(
                (v) => Number.isInteger(v) && v >= 1 && v <= 5
            )
        ) {
            return NextResponse.json(
                { error: "pace, fairness must be integers between 1 and 5" },
                { status: 400 }
            );
        }

        // Verify student is enrolled in the class
        const { data: enrollment } = await supabase
            .from("class_enrollments")
            .select("class_id")
            .eq("class_id", class_id)
            .eq("student_id", user.id)
            .single();

        if (!enrollment) {
            return NextResponse.json(
                { error: "You are not enrolled in this class" },
                { status: 403 }
            );
        }

        // ── M01: Duplicate check-in guard ─────────────────────────────
        // Pre-check: has this student already checked in for this class
        // this week? (Monday-based ISO week via week_start generated column)
        const weekStart = getISOWeekStart(new Date());

        const { data: existing } = await supabase
            .from("student_pulses")
            .select("id, created_at")
            .eq("student_id", user.id)
            .eq("class_id", class_id)
            .eq("week_start", weekStart)
            .maybeSingle();

        if (existing) {
            // Already checked in this week — return friendly response (not error)
            return NextResponse.json(
                {
                    success: true,
                    alreadyCheckedIn: true,
                    data: { id: existing.id, created_at: existing.created_at },
                },
                { status: 200 }
            );
        }

        // Insert into student_pulses (canonical table per C3/T035)
        // student_id is derived from auth session — NEVER from form body
        const { data: pulse, error: insertError } = await supabase
            .from("student_pulses")
            .insert({
                class_id,
                mood: MOOD_MAP[mood],        // TEXT enum
                pace,                         // SMALLINT 1-5
                fairness,                     // SMALLINT 1-5
                optional_text: content?.trim() || null,
            })
            .select("id, created_at")
            .single();

        if (insertError) {
            // Handle UNIQUE violation race condition (23505 = unique_violation)
            if (insertError.code === "23505") {
                return NextResponse.json(
                    {
                        success: true,
                        alreadyCheckedIn: true,
                    },
                    { status: 200 }
                );
            }

            console.error("Check-in insert error:", insertError);
            return NextResponse.json(
                { error: "Failed to submit check-in" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                alreadyCheckedIn: false,
                data: { id: pulse.id, created_at: pulse.created_at },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Check-in API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Get ISO week start (Monday) as YYYY-MM-DD string.
 * Matches PostgreSQL's date_trunc('week', ...) which returns Monday.
 */
function getISOWeekStart(date: Date): string {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
}
