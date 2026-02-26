"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { SchoolNotificationSettingsInput } from "@/types/settings"

export async function updateSchoolSettings(
    school_id: string,
    data: SchoolNotificationSettingsInput
) {
    const supabase = await createClient()

    // 1. Verify user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Not authenticated" }
    }

    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (userData?.role !== "admin") {
        return { success: false, error: "Unauthorized" }
    }

    // 2. UPSERT into school_notification_settings
    const { error } = await supabase
        .from("school_notification_settings")
        .upsert(
            {
                ...data,
                school_id,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'school_id' }
        )

    if (error) {
        console.error("Error updating settings:", error)
        return { success: false, error: "Failed to update settings" }
    }

    // 3. POST to /api/n8n/webhook
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await fetch(`${appUrl}/api/n8n/webhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.N8N_WEBHOOK_SECRET}`
            },
            body: JSON.stringify({
                event: "settings_updated",
                school_id
            })
        })
    } catch (webhookError) {
        console.error("Failed to notify webhook:", webhookError)
        // Non-fatal, we continue
    }

    revalidatePath("/admin/settings")
    return { success: true }
}
