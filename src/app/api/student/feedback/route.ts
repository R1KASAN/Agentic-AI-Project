import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
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

        // Get student's enrolled class
        const { data: enrollments } = await supabase
            .from("class_enrollments")
            .select("class_id")
            .eq("student_id", user.id)
            .limit(1);

        if (!enrollments || enrollments.length === 0) {
            return NextResponse.json(
                { error: "Not enrolled in any class" },
                { status: 404 }
            );
        }

        const classId = enrollments[0].class_id;

        // Parse weeks param (default 4)
        const { searchParams } = new URL(request.url);
        const weeks = Math.min(
            Math.max(parseInt(searchParams.get("weeks") || "4"), 1),
            12
        );

        // Fetch aggregated climate data via SECURITY DEFINER RPC
        // This NEVER returns raw check_ins rows — only aggregated data
        // with k-anonymity (returns NULL when count < 3)
        const { data: climateSummary, error: rpcError } = await supabase.rpc(
            "get_class_climate_summary",
            { p_class_id: classId, p_weeks: weeks }
        );

        if (rpcError) {
            console.error("Climate summary RPC error:", rpcError);
            return NextResponse.json(
                { error: "Failed to fetch climate data" },
                { status: 500 }
            );
        }

        // Fetch communicated actions (approved + communicated_to_students)
        // RLS ensures students only see communicated recommendations
        const { data: actions } = await supabase
            .from("recommendations")
            .select("id, content, action_taken_note, created_at, updated_at")
            .eq("class_id", classId)
            .eq("status", "approved")
            .eq("communicated_to_students", true)
            .order("updated_at", { ascending: false })
            .limit(5);

        return NextResponse.json({
            climate: climateSummary || [],
            actions: actions || [],
            class_id: classId,
        });
    } catch (error) {
        console.error("Feedback API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
