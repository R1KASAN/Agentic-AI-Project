import { createClient } from "@/lib/supabase/server"
import { SchoolSettingsClient } from "./client"
import { SchoolNotificationSettingsInput } from "@/types/settings"
import { redirect } from "next/navigation"

export default async function AdminSchoolSettingsPage() {
    const supabase = await createClient()

    // 1. Verify admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (userData?.role !== "admin") redirect("/")

    // 2. We assume there is exactly 1 primary school for this MVP.
    // We'll just grab the first one, or insert one if missing to unblock the demo.
    let { data: school } = await supabase
        .from("schools")
        .select("id")
        .limit(1)
        .single()

    if (!school) {
        // Auto-create a demo school if none exists (for MVP testing convenience)
        const { data: newSchool } = await supabase
            .from("schools")
            .insert([{ name: "Demo High School", health_score: 100 }])
            .select("id")
            .single()
        school = newSchool
    }

    if (!school) {
        return <div className="p-8 text-destructive">Could not load or create a primary school record.</div>
    }

    // 3. Fetch Settings
    const { data: settings } = await supabase
        .from("school_notification_settings")
        .select("*")
        .eq("school_id", school.id)
        .single()

    // Default initial settings
    const defaultSettings: SchoolNotificationSettingsInput = {
        school_id: school.id,
        ai_run_enabled: true,
        ai_run_day: "monday",
        ai_run_time: "06:00",
        teacher_email_enabled: true,
        teacher_email_day: "monday",
        teacher_email_time: "07:00",
        reminder_enabled: true,
        reminder_day: "friday",
        reminder_time: "15:00",
        reminder_threshold: 50,
        health_score_enabled: true,
        health_score_day: "sunday",
        health_score_time: "09:00",
        health_score_alert_threshold: 40,
        paused_until: null,
    }

    const initialSettings = settings
        ? { ...defaultSettings, ...settings }
        : defaultSettings

    return (
        <div className="p-8 pb-20">
            <SchoolSettingsClient schoolId={school.id} initialSettings={initialSettings} />
        </div>
    )
}
