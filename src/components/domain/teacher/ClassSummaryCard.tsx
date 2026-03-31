import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ChevronRight, Activity, Bell, HelpCircle, PauseCircle, ShieldCheck } from 'lucide-react';
import type { ClassSummaryResponse } from '@/lib/data/teacher-mock';
import { RiskIndicator } from '@/components/domain/teacher/RiskIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ClassSummaryCardProps {
    data: ClassSummaryResponse;
}

export function ClassSummaryCard({ data }: ClassSummaryCardProps) {
    const {
        class_id,
        name,
        risk_level,
        student_count,
        pending_recommendations,
        inquiry_mode_suggested,
        blocked_reason,
        total_decided,
        dismissal_rate,
    } = data;

    // Map risk string back to a numeric score to reuse existing RiskIndicator component
    // If NO_DATA, we can hide the indicator or set it to 0
    let numericScore = 0;
    if (risk_level === 'CRITICAL') numericScore = 100;
    else if (risk_level === 'WARNING') numericScore = 50;
    else if (risk_level === 'ROUTINE') numericScore = 20;

    return (
        <Card className="teacher-surface h-full overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(15,27,45,0.98),rgba(10,19,33,0.94))] shadow-[0_18px_48px_rgba(2,8,23,0.42)] transition-all hover:-translate-y-1 hover:shadow-[0_26px_62px_rgba(2,8,23,0.56)]">
            <CardContent className="flex h-full flex-col justify-between p-6">
                <div className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                        <Link
                            href={`/teacher/class/${class_id}`}
                            className="min-w-0 flex-1"
                        >
                            <h3
                                data-display="true"
                                className="line-clamp-2 text-[2rem] font-semibold leading-[1.15] text-[var(--teacher-dashboard-text)] transition-colors hover:text-[var(--teacher-dashboard-primary)]"
                            >
                                {name}
                            </h3>
                        </Link>
                        {risk_level !== 'NO_DATA' && (
                            <RiskIndicator score={numericScore} />
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {inquiry_mode_suggested && (
                            <Badge variant="secondary" className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)]">
                                <HelpCircle className="mr-1 h-3 w-3" />
                                Inquiry Mode
                            </Badge>
                        )}
                        {blocked_reason === "frequency_limit_exceeded" && (
                            <Badge variant="outline" className="border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text-muted)]">
                                <PauseCircle className="mr-1 h-3 w-3" />
                                No new draft this cycle
                            </Badge>
                        )}
                        {blocked_reason === "k_anonymity" && (
                            <Badge variant="outline" className="border-[color:var(--teacher-dashboard-border)] bg-[rgba(147,197,253,0.12)] text-[var(--teacher-dashboard-primary)]">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Waiting for safe aggregate signal
                            </Badge>
                        )}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm teacher-text-muted">
                        <div className="teacher-surface-soft flex items-center gap-2 rounded-full border px-3 py-1.5">
                            <Users className="h-4 w-4 text-[var(--teacher-dashboard-primary)]" />
                            <span className="font-semibold text-[var(--teacher-dashboard-text)]">{student_count}</span>
                            <span>Students</span>
                        </div>

                        {pending_recommendations > 0 ? (
                            <div className="flex items-center gap-2 rounded-full bg-[rgba(253,230,138,0.12)] px-3 py-1.5 text-[var(--teacher-dashboard-warning)]">
                                <Bell className="h-4 w-4 animate-pulse" />
                                <span className="font-semibold">{pending_recommendations} Actions required</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 rounded-full bg-[rgba(147,197,253,0.12)] px-3 py-1.5 text-[var(--teacher-dashboard-primary)]">
                                <Activity className="h-4 w-4" />
                                <span>
                                  {blocked_reason === "k_anonymity"
                                    ? "Waiting for safe signal"
                                    : "All caught up"}
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="border-t border-[color:var(--teacher-dashboard-border)] pt-4 text-xs teacher-text-muted">
                        ตัดสินแล้ว {total_decided ?? 0} รายการ, ข้าม {Math.round((dismissal_rate ?? 0) * 100)}%
                    </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-[color:var(--teacher-dashboard-border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <Link href={`/teacher/climate?classId=${class_id}`} className="sm:flex-1">
                        <Button variant="outline" className="h-12 w-full justify-between rounded-2xl border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)] hover:text-[var(--teacher-dashboard-primary)]">
                            <span>Class Climate</span>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </Link>
                    <Link
                        href={`/teacher/class/${class_id}`}
                        className="text-sm font-medium teacher-text-muted transition-colors hover:text-[var(--teacher-dashboard-primary)]"
                    >
                        View Details
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
