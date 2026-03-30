import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * GET /api/student/classes?ids=uuid1,uuid2,...
 *
 * Returns class details (name, teacher name) for the given class IDs, or all
 * enrolled classes when ids is omitted.
 * Uses service role to bypass teacher_owns_class RLS on the classes table.
 * Auth: student must be authenticated and enrolled in the requested classes.
 */
export async function GET(request: Request) {
    // Auth check
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const idsParam = url.searchParams.get("ids");
    const requestedIds = idsParam ? idsParam.split(",").filter(Boolean) : null;

    // Server-side enrollment lookup avoids browser-side auth refresh issues.
    let enrollmentQuery = supabase
        .from("class_enrollments")
        .select(`
            class_id,
            classes (
                name
            )
        `)
        .eq("student_id", user.id);

    if (requestedIds && requestedIds.length > 0) {
        enrollmentQuery = enrollmentQuery.in("class_id", requestedIds);
    }

    const { data: enrollments } = await enrollmentQuery;

    const enrolledIds = (enrollments || []).map((e) => e.class_id);

    if (enrolledIds.length === 0) {
        return NextResponse.json({ classes: [] });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceRoleKey && publicSupabaseUrl) {
        const serviceSupabase = createServiceClient(
            publicSupabaseUrl,
            serviceRoleKey
        );

        const { data: classData, error: classError } = await serviceSupabase
            .from("classes")
            .select("id, name, teacher_id, users!classes_teacher_id_fkey(full_name)")
            .in("id", enrolledIds);

        if (!classError && classData) {
            const classes = classData.map((c) => {
                const teacher = c.users as unknown as { full_name: string } | null;
                return {
                    class_id: c.id,
                    class_name: c.name,
                    teacher_name: teacher?.full_name || null,
                    last_check_in: null,
                };
            });

            return NextResponse.json({ classes });
        }

        if (classError) {
            console.warn(
                "Falling back to enrollment-based class names:",
                classError.message
            );
        }
    }

    return NextResponse.json({
        classes: (enrollments || []).map((enrollment) => {
            const cls = enrollment.classes as unknown as { name: string } | null;
            return {
                class_id: enrollment.class_id,
                class_name: cls?.name || "Class",
                teacher_name: null,
                last_check_in: null,
            };
        }),
    });
}
