import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, Plus } from "lucide-react";
import { MICROCOPY, BiText } from "@/lib/microcopy";
import { ClassSummaryCard } from "@/components/domain/teacher/ClassSummaryCard";
import type { ClassSummaryResponse } from "@/lib/data/teacher-mock";
import {
    deriveTeacherDisplayRiskLevel,
    getTeacherDashboardOverviewData,
} from "@/lib/teacherDashboard";

export const metadata: Metadata = { title: "Teacher Dashboard" };

export default async function TeacherDashboardPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const teacherId = session?.user?.id;

    if (!teacherId) {
        redirect("/login");
    }

    const {
        classRows,
        enrollmentCounts,
        metricsByClassId,
        auditByClassId,
        climateByClassId,
    } = await getTeacherDashboardOverviewData(teacherId, 4, supabase);

    const classes: ClassSummaryResponse[] = classRows.map((cls) => {
        const pendingRecs = cls.recommendations?.filter((r) => r.status === 'pending') || [];
        const metrics = metricsByClassId[cls.id];
        const auditSignal = auditByClassId[cls.id];
        const riskLevel = deriveTeacherDisplayRiskLevel(
            climateByClassId[cls.id] ?? [],
            pendingRecs.map((r) => r.policy_level)
        );

        return {
            class_id: cls.id,
            name: cls.name,
            risk_level: riskLevel,
            student_count: enrollmentCounts[cls.id] ?? 0,
            pending_recommendations: pendingRecs.length,
            join_code: cls.invite_code,
            inquiry_mode_suggested: metrics?.inquiryModeSuggested ?? false,
            blocked_reason: auditSignal?.blockedReason ?? null,
            total_decided: metrics?.totalDecided ?? 0,
            dismissal_rate: metrics?.dismissalRate ?? 0,
            latest_policy_selected: auditSignal?.policySelected ?? null,
        };
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
                    <Button className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        <BiText entry={MICROCOPY.teacher.createClass} />
                    </Button>
                </Link>
            </div>

            {(!classes || classes.length === 0) ? (
                <Card className="border-dashed h-48 flex items-center justify-center bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-3 p-6">
                        <div className="p-3 bg-secondary rounded-full">
                            <Users className="w-8 h-8 text-muted-foreground/60" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                            <BiText entry={MICROCOPY.teacher.emptyState} />
                        </p>
                        <Link href="/teacher/class/new">
                            <Button variant="outline" size="sm" className="mt-2 text-sky-600">
                                Create your first class
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                        <ClassSummaryCard key={cls.class_id} data={cls} />
                    ))}
                </div>
            )}
        </div>
    );
}
