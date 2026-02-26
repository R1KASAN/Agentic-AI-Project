import { createClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "admin") {
            return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch adoption metrics via SECURITY DEFINER RPC
        const { data: metrics, error: rpcError } = await supabase.rpc(
            "get_adoption_metrics"
        );

        if (rpcError) {
            console.error("Adoption metrics RPC error:", rpcError);
            return Response.json(
                { error: "Failed to fetch metrics" },
                { status: 500 }
            );
        }

        // Fetch recent action logs (no raw student content)
        const { data: logs } = await supabase
            .from("action_logs")
            .select(
                "id, actor_id, action_type, target_type, target_id, created_at, users!action_logs_actor_id_fkey(full_name, role)"
            )
            .order("created_at", { ascending: false })
            .limit(50);

        // Fetch counts for dashboard stats — parallel to avoid waterfall
        const [
            { count: totalUsers },
            { count: totalClasses },
            { count: totalStudents },
            { count: totalTeachers },
        ] = await Promise.all([
            supabase.from("users").select("*", { count: "exact", head: true }),
            supabase.from("classes").select("*", { count: "exact", head: true }),
            supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "student"),
            supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "teacher"),
        ]);

        return Response.json({
            metrics: metrics || [],
            logs: logs || [],
            stats: {
                total_users: totalUsers || 0,
                total_classes: totalClasses || 0,
                total_students: totalStudents || 0,
                total_teachers: totalTeachers || 0,
            },
        });
    } catch (error) {
        console.error("Admin metrics API error:", error);
        return Response.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
