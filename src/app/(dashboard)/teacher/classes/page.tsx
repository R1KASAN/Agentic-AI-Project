import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientClasses } from "./client-classes";

export const metadata: Metadata = { title: "Manage Classrooms | Climate Agent" };

export default async function TeacherClassesPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch active classes for the teacher
    const { data: classes, error: classesError } = await supabase
        .from("classes")
        .select("id, name, invite_code, created_at")
        .eq("teacher_id", user.id)
        .is("archived_at", null)
        .order("name");

    if (classesError) {
        throw new Error(`Failed to fetch classes: ${classesError.message}`);
    }

    // We fetch enrollment counts separately to ensure robustness and aggregate properly
    const classIds = (classes || []).map((c) => c.id);
    const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .in("class_id", classIds.length > 0 ? classIds : ["none"]);

    const enrollmentCounts: Record<string, number> = {};
    (enrollments || []).forEach((e) => {
        enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1;
    });

    const mappedClasses = (classes || []).map((cls) => ({
        id: cls.id,
        name: cls.name,
        invite_code: cls.invite_code || "",
        created_at: cls.created_at,
        student_count: enrollmentCounts[cls.id] || 0,
    }));

    return (
        <ClientClasses classes={mappedClasses} />
    );
}
