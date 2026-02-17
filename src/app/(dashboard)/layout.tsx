import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";

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

    const { data: profile } = await supabase
        .from("users")
        .select("role, full_name, avatar_url")
        .eq("id", user.id)
        .single();

    if (!profile) {
        redirect("/login");
    }

    return (
        <DashboardShell
            role={profile.role}
            userName={profile.full_name || user.email || "User"}
            avatarUrl={profile.avatar_url}
        >
            {children}
        </DashboardShell>
    );
}
