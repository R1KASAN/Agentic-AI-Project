"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function joinClass(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const code = formData.get("inviteCode") as string
    if (!code || code.trim().length !== 8) {
        return { success: false, error: "Invalid invite code. It should be 8 characters." }
    }

    const inviteCode = code.trim().toUpperCase()

    // Find class by code
    const { data: cls, error: clsError } = await supabase
        .from("classes")
        .select("id")
        .eq("invite_code", inviteCode)
        .single()

    if (clsError || !cls) {
        return { success: false, error: "No class found with this invite code." }
    }

    // Insert enrollment
    const { error: enrollError } = await supabase
        .from("class_enrollments")
        .insert([
            { class_id: cls.id, student_id: user.id }
        ])

    if (enrollError) {
        if (enrollError.code === '23505') { // Unique violation
            return { success: false, error: "You are already enrolled in this class." }
        }
        console.error("Error joining class:", enrollError)
        return { success: false, error: "Failed to join class. Please try again." }
    }

    revalidatePath("/student/check-in")
    redirect(`/student/check-in?classId=${cls.id}`)
}
