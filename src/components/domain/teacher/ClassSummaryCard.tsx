import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ChevronRight, Activity, Bell, HelpCircle, PauseCircle, ShieldCheck } from 'lucide-react';
import type { ClassSummaryResponse } from '@/lib/data/teacher-mock';
import { RiskIndicator } from '@/components/domain/teacher/RiskIndicator';
import { Badge } from '@/components/ui/badge';

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
        <Link href={`/teacher/class/${class_id}`} className="group block h-full">
            <Card className="h-full hover:shadow-lg hover:border-sky-200 dark:hover:border-sky-800 transition-all cursor-pointer">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="space-y-3">
                        <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-lg text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                                {name}
                            </h3>
                            {risk_level !== 'NO_DATA' && (
                                <RiskIndicator score={numericScore} />
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {inquiry_mode_suggested && (
                                <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
                                    <HelpCircle className="mr-1 h-3 w-3" />
                                    Inquiry Mode
                                </Badge>
                            )}
                            {blocked_reason === "frequency_limit_exceeded" && (
                                <Badge variant="outline" className="border-slate-300 text-slate-600">
                                    <PauseCircle className="mr-1 h-3 w-3" />
                                    No new draft this cycle
                                </Badge>
                            )}
                            {blocked_reason === "k_anonymity" && (
                                <Badge variant="outline" className="border-sky-300 text-sky-700">
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    Waiting for safe aggregate signal
                                </Badge>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                                <Users className="w-4 h-4 text-sky-500" />
                                <span className="font-medium text-foreground">{student_count}</span>
                                <span>Students</span>
                            </div>

                            {pending_recommendations > 0 ? (
                                <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-1 rounded-md">
                                    <Bell className="w-4 h-4 animate-pulse" />
                                    <span className="font-semibold">{pending_recommendations} Actions required</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-500 px-2 py-1 rounded-md">
                                    <Activity className="w-4 h-4" />
                                    <span>
                                      {blocked_reason === "k_anonymity"
                                        ? "Waiting for safe signal"
                                        : "All caught up"}
                                    </span>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            ตัดสินแล้ว {total_decided ?? 0} รายการ, ข้าม {Math.round((dismissal_rate ?? 0) * 100)}%
                        </p>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm text-muted-foreground">
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4 group-hover:text-sky-500 group-hover:translate-x-1 transition-all" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
