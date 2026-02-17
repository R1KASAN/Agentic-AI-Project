import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Read role and name from JWT user_metadata (set by handle_new_user trigger)
    // This avoids querying public.users which may have RLS issues
    const role = (user.user_metadata?.role as UserRole) || "student";
    const fullName = (user.user_metadata?.full_name as string) || user.email || "User";

    // Try to get avatar_url from profile (non-blocking, fallback to null)
    let avatarUrl: string | null = null;
    try {
        const { data: profile } = await supabase
            .from("users")
            .select("avatar_url")
            .eq("id", user.id)
            .single();
        avatarUrl = profile?.avatar_url || null;
    } catch {
        // Profile query failed (e.g. RLS issue) — not a blocker
    }

    return (
        <DashboardShell
            role={role}
            userName={fullName}
            avatarUrl={avatarUrl}
        >
            {children}
        </DashboardShell>
    );
}
