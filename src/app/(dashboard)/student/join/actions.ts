"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function joinClass(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const code = formData.get("inviteCode") as string
    if (!code || code.trim().length < 6 || code.trim().length > 8) {
        return { success: false, error: "รหัสเชิญไม่ถูกต้อง ต้องเป็น 6-8 ตัวอักษร / Invalid invite code (6-8 characters)." }
    }

    const inviteCode = code.trim().toUpperCase()

    // Use service role to look up class by invite code
    // (student RLS on `classes` blocks SELECT — teacher_owns_class policy)
    const serviceSupabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: cls, error: clsError } = await serviceSupabase
        .from("classes")
        .select("id, name")
        .eq("invite_code", inviteCode)
        .is("archived_at", null)
        .maybeSingle()

    if (clsError || !cls) {
        return { success: false, error: "ไม่พบห้องเรียนที่ใช้รหัสนี้ / No active class found with this invite code." }
    }

    // Insert enrollment (uses student's auth client — student_insert_enrollment policy allows this)
    const { error: enrollError } = await supabase
        .from("class_enrollments")
        .insert([
            { class_id: cls.id, student_id: user.id }
        ])

    if (enrollError) {
        if (enrollError.code === '23505') { // Unique violation
            return { success: false, error: "คุณเข้าร่วมห้องนี้แล้ว / You are already enrolled in this class." }
        }
        console.error("Error joining class:", enrollError)
        return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่ / Failed to join class. Please try again." }
    }

    revalidatePath("/student/classes")
    revalidatePath("/student/check-in")
    redirect(`/student/classes`)
}
