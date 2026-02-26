import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Shield, Search } from "lucide-react"

export default async function AdminUsersPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect("/login")

    // Fetch all users (admin has service_role access via server component)
    const { data: users, error } = await supabase
        .from("users")
        .select("id, email, role, full_name, created_at")
        .order("created_at", { ascending: false })

    const roleBadgeColor: Record<string, string> = {
        admin: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
        teacher: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
        student: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="w-6 h-6 text-violet-500" />
                    จัดการผู้ใช้ / User Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    รายชื่อผู้ใช้ทั้งหมดในระบบ / All registered users
                </p>
            </div>

            {error ? (
                <Card className="border-destructive">
                    <CardContent className="pt-6 text-destructive text-sm">
                        ไม่สามารถโหลดข้อมูลผู้ใช้ได้ / Failed to load users: {error.message}
                    </CardContent>
                </Card>
            ) : !users || users.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                        <Search className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">
                            ยังไม่มีผู้ใช้ในระบบ / No users found
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-medium flex items-center justify-between">
                            <span>ผู้ใช้ทั้งหมด {users.length} คน / {users.length} users</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">ชื่อ / Name</th>
                                        <th className="pb-3 font-medium">อีเมล / Email</th>
                                        <th className="pb-3 font-medium">บทบาท / Role</th>
                                        <th className="pb-3 font-medium">วันที่สมัคร / Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="py-3 font-medium">
                                                {u.full_name || "—"}
                                            </td>
                                            <td className="py-3 text-muted-foreground">
                                                {u.email || "—"}
                                            </td>
                                            <td className="py-3">
                                                <Badge
                                                    variant="secondary"
                                                    className={`capitalize text-xs ${roleBadgeColor[u.role] || ""}`}
                                                >
                                                    {u.role}
                                                </Badge>
                                            </td>
                                            <td className="py-3 text-muted-foreground text-xs">
                                                {new Date(u.created_at).toLocaleDateString("th-TH", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
