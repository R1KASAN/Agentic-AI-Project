"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createClass(formData: FormData) {
    const supabase = await createClient()

    // Actually, we must fetch the current user's ID
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const name = formData.get("name") as string
    const description = formData.get("description") as string

    if (!name || name.trim() === "") {
        return { success: false, error: "Class name is required" }
    }

    const { data, error } = await supabase
        .from("classes")
        .insert([
            {
                name: name.trim(),
                description: description?.trim() || null,
                teacher_id: user.id,
            }
        ])
        .select("id")
        .single()

    if (error || !data) {
        console.error("Error creating class:", error)
        return { success: false, error: "Failed to create class. Please try again." }
    }

    revalidatePath("/teacher")
    redirect(`/teacher/class/${data.id}`)
}
