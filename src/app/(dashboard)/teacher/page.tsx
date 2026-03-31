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
            <div className="flex flex-col justify-between gap-5 rounded-[30px] border border-[color:var(--teacher-dashboard-border)] bg-[radial-gradient(circle_at_top_left,rgba(147,197,253,0.14),transparent_34%),linear-gradient(180deg,rgba(15,27,45,0.98),rgba(8,17,33,0.96))] p-6 shadow-[0_22px_56px_rgba(2,8,23,0.42)] sm:flex-row sm:items-end">
                <div className="max-w-3xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--teacher-dashboard-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--teacher-dashboard-primary)]">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Weekly classroom briefing
                    </div>
                    <h1 data-display="true" className="flex items-center gap-2 text-4xl font-semibold tracking-tight text-[var(--teacher-dashboard-text)]">
                        <LayoutDashboard className="h-7 w-7 text-[var(--teacher-dashboard-primary)]" />
                        <BiText entry={MICROCOPY.teacher.dashboardTitle} />
                    </h1>
                    <p className="mt-3 text-[15px] leading-7 teacher-text-muted">
                        {MICROCOPY.teacher.dashboardSubtitle.th}
                        <span className="mt-1 block text-sm">{MICROCOPY.teacher.dashboardSubtitle.en}</span>
                    </p>
                </div>
                <Link href="/teacher/class/new" className="shrink-0">
                    <Button className="h-12 w-full rounded-2xl bg-[var(--teacher-dashboard-primary)] px-5 text-slate-950 shadow-[0_16px_32px_rgba(147,197,253,0.18)] hover:bg-[#bfdbfe] sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" />
                        <BiText entry={MICROCOPY.teacher.createClass} />
                    </Button>
                </Link>
            </div>

            {(!classes || classes.length === 0) ? (
                <Card className="teacher-surface flex h-56 items-center justify-center rounded-[28px] border-dashed bg-[linear-gradient(180deg,rgba(15,27,45,0.96),rgba(10,19,33,0.92))] shadow-[0_18px_42px_rgba(2,8,23,0.26)]">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-3 p-6">
                        <div className="rounded-full bg-[var(--teacher-dashboard-surface-soft)] p-3">
                            <Users className="h-8 w-8 teacher-text-muted" />
                        </div>
                        <p className="font-medium teacher-text-muted">
                            <BiText entry={MICROCOPY.teacher.emptyState} />
                        </p>
                        <Link href="/teacher/class/new">
                            <Button variant="outline" size="sm" className="mt-2 rounded-xl border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-primary)] hover:bg-[var(--teacher-dashboard-primary-soft)]">
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
