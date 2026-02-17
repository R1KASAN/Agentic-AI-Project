import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
        if (!class_id || !mood || !pace || !fairness) {
            return NextResponse.json(
                { error: "Missing required fields: class_id, mood, pace, fairness" },
                { status: 400 }
            );
        }

        // Validate ranges (1-5)
        if (
            ![mood, pace, fairness].every(
                (v) => Number.isInteger(v) && v >= 1 && v <= 5
            )
        ) {
            return NextResponse.json(
                { error: "mood, pace, fairness must be integers between 1 and 5" },
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

        // Insert check-in
        const { data: checkIn, error: insertError } = await supabase
            .from("check_ins")
            .insert({
                class_id,
                student_id: user.id,
                mood,
                pace,
                fairness,
                content: content?.trim() || null,
            })
            .select("id, created_at")
            .single();

        if (insertError) {
            console.error("Check-in insert error:", insertError);
            return NextResponse.json(
                { error: "Failed to submit check-in" },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: { id: checkIn.id, created_at: checkIn.created_at },
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
