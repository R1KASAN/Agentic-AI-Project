import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_MOODS = new Set([1, 2, 3, 4, 5]);

export async function POST(
    request: Request,
    { params }: { params: Promise<{ classId: string }> }
) {
    const { classId } = await params;

    try {
        const body = await request.json();
        const { mood, session_token } = body;

        // Validate mood
        if (!VALID_MOODS.has(mood)) {
            return NextResponse.json(
                { error: "mood must be an integer between 1 and 5" },
                { status: 400 }
            );
        }

        // Use service role to bypass RLS for class validation and insert
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Validate class exists and is not archived
        const { data: cls, error: classError } = await supabase
            .from("classes")
            .select("id, archived_at")
            .eq("id", classId)
            .maybeSingle();

        if (classError || !cls) {
            return NextResponse.json(
                { error: "Class not found" },
                { status: 404 }
            );
        }

        if (cls.archived_at) {
            return NextResponse.json(
                { error: "This class is no longer accepting check-ins" },
                { status: 410 }
            );
        }

        // Insert anonymous check-in
        const { error: insertError } = await supabase
            .from("qr_checkins")
            .insert({
                class_id: classId,
                mood,
                session_token: session_token || null,
            });

        if (insertError) {
            console.error("QR check-in insert error:", insertError);
            return NextResponse.json(
                { error: "Failed to submit check-in" },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err) {
        console.error("QR check-in API error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
