import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Clock, User, ShieldCheck } from "lucide-react"

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    approved: { label: "Approved", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
    dismissed: { label: "Dismissed", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
    edited: { label: "Edited", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    pending: { label: "Pending", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
}

export default async function AdminAuditPage() {
    const supabase = await createClient()

    // Fetch recommendation actions as audit entries.
    // We join recommendations → classes → users (teacher) to get teacher name and class name.
    // We NEVER select student text fields.
    const { data: auditEntries, error } = await supabase
        .from("recommendations")
        .select(`
      id,
      status,
      category,
      priority,
      ai_generated,
      created_at,
      updated_at,
      classes!inner (
        name,
        teacher_id,
        users!inner (
          full_name,
          role
        )
      )
    `)
        .order("updated_at", { ascending: false })
        .limit(50)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                    <ClipboardList className="w-8 h-8 text-indigo-600" />
                    บันทึกการใช้งานของครู
                </h1>
                <p className="text-muted-foreground mt-2">
                    ดูการ approve/dismiss และการใช้งานระบบย้อนหลัง — ไม่แสดงข้อความนักเรียน
                </p>
            </div>

            {/* Privacy Notice */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-700 dark:text-indigo-300">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>This view only shows teacher actions and aggregate data. No raw student text is ever displayed.</span>
            </div>

            {error ? (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    Failed to load audit log: {error.message}
                </div>
            ) : (!auditEntries || auditEntries.length === 0) ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                        <ClipboardList className="w-12 h-12 text-muted-foreground/40" />
                        <p className="text-lg font-semibold text-foreground">ยังไม่มีการใช้งานในช่วงเวลาที่เลือก</p>
                        <p className="text-sm text-muted-foreground">Actions will appear as teachers review AI recommendations.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Teacher Actions</CardTitle>
                        <CardDescription>Showing the latest {auditEntries.length} actions across all classes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 pr-4 font-semibold text-muted-foreground">Date/Time</th>
                                        <th className="pb-3 pr-4 font-semibold text-muted-foreground">Teacher</th>
                                        <th className="pb-3 pr-4 font-semibold text-muted-foreground">Class</th>
                                        <th className="pb-3 pr-4 font-semibold text-muted-foreground">Action</th>
                                        <th className="pb-3 font-semibold text-muted-foreground">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditEntries.map((entry) => {
                                        const cls = entry.classes as any
                                        const teacher = cls?.users
                                        const actionCfg = ACTION_LABELS[entry.status] || ACTION_LABELS.pending

                                        return (
                                            <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(entry.updated_at || entry.created_at).toLocaleDateString("th-TH", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                            <User className="w-3 h-3 text-muted-foreground" />
                                                        </div>
                                                        <span className="font-medium truncate max-w-[120px]">
                                                            {teacher?.full_name || "Unknown"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 pr-4 truncate max-w-[140px]">
                                                    {cls?.name || "—"}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${actionCfg.color}`}>
                                                        {actionCfg.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-xs text-muted-foreground">
                                                    {entry.status === "approved"
                                                        ? `Approved AI recommendation (${entry.category || "general"})`
                                                        : entry.status === "dismissed"
                                                            ? `Dismissed AI recommendation (${entry.category || "general"})`
                                                            : entry.status === "edited"
                                                                ? `Edited AI recommendation (${entry.category || "general"})`
                                                                : `Pending review (${entry.category || "general"})`}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
