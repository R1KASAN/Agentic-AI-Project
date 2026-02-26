import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { RiskIndicator } from "@/components/domain/teacher/RiskIndicator";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, ChevronRight, Plus } from "lucide-react";
import { MICROCOPY, BiText } from "@/lib/microcopy";

export const metadata: Metadata = { title: "Teacher Dashboard" };

export default async function TeacherDashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Get classes where this teacher is the owner
    const { data: classes } = await supabase
        .from("classes")
        .select("id, name, risk_score, created_at")
        .eq("teacher_id", user.id)
        .order("name");

    // Get enrollment counts per class
    const classIds = (classes || []).map((c) => c.id);
    const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("class_id")
        .in("class_id", classIds.length > 0 ? classIds : ["none"]);

    const enrollmentCounts: Record<string, number> = {};
    (enrollments || []).forEach((e) => {
        enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1;
    });

    // Get pending recommendation counts per class
    const { data: pendingRecs } = await supabase
        .from("recommendations")
        .select("class_id")
        .in("class_id", classIds.length > 0 ? classIds : ["none"])
        .eq("status", "pending");

    const pendingCounts: Record<string, number> = {};
    (pendingRecs || []).forEach((r) => {
        pendingCounts[r.class_id] = (pendingCounts[r.class_id] || 0) + 1;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-sky-500" />
                        <BiText entry={MICROCOPY.teacher.dashboardTitle} />
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {MICROCOPY.teacher.dashboardSubtitle.th}
                        <span className="block text-sm">{MICROCOPY.teacher.dashboardSubtitle.en}</span>
                    </p>
                </div>
                <Link href="/teacher/class/new" className="shrink-0">
                    <Button className="w-full sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        <BiText entry={MICROCOPY.teacher.createClass} />
                    </Button>
                </Link>
            </div>

            {(!classes || classes.length === 0) ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                        <Users className="w-10 h-10 text-muted-foreground/40" />
                        <p className="text-muted-foreground">
                            <BiText entry={MICROCOPY.teacher.emptyState} />
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {classes.map((cls) => (
                        <Link
                            key={cls.id}
                            href={`/teacher/class/${cls.id}`}
                            className="group"
                        >
                            <Card className="h-full hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800 transition-all cursor-pointer">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                                    {cls.name}
                                                </h3>
                                                <RiskIndicator score={cls.risk_score} />
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {enrollmentCounts[cls.id] || 0} students
                                                </span>
                                                {(pendingCounts[cls.id] || 0) > 0 && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                                        {pendingCounts[cls.id]} pending action
                                                        {pendingCounts[cls.id] > 1 ? "s" : ""}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-sky-500 transition-colors flex-shrink-0 mt-1" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
