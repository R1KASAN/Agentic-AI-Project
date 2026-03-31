"use client";

import { useState, useEffect } from "react";
import { createClient, getSessionUser } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";

interface EnrolledClass {
    class_id: string;
    class_name: string;
    teacher_name: string | null;
    last_check_in: string | null;
}

export default function StudentClassesPage() {
    const [classes, setClasses] = useState<EnrolledClass[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchClasses() {
            try {
                const user = await getSessionUser();

                if (!user) {
                    setError("Not authenticated");
                    setLoading(false);
                    return;
                }

                const supabase = createClient();

                // Step 1: Get enrolled class IDs
                const { data: enrollments, error: enrollError } = await supabase
                    .from("class_enrollments")
                    .select("class_id")
                    .eq("student_id", user.id);

                if (enrollError || !enrollments) {
                    console.error("Enrollment fetch error:", enrollError);
                    setLoading(false);
                    return;
                }

                if (enrollments.length === 0) {
                    setLoading(false);
                    return;
                }

                // Step 2: Fetch class details via API (bypasses RLS on classes table)
                const classIds = enrollments.map((e) => e.class_id);
                const res = await fetch("/api/student/classes?" + new URLSearchParams({ ids: classIds.join(",") }));

                if (res.ok) {
                    const data = await res.json();
                    setClasses(data.classes || []);
                } else {
                    // Fallback: just show class IDs
                    setClasses(
                        enrollments.map((e) => ({
                            class_id: e.class_id,
                            class_name: "Class",
                            teacher_name: null,
                            last_check_in: null,
                        }))
                    );
                }
            } catch (err) {
                console.error("Error fetching classes:", err);
                setError("Failed to load classes");
            } finally {
                setLoading(false);
            }
        }

        fetchClasses();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="max-w-2xl">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--student-dashboard-primary)]">
                        <Users className="h-3.5 w-3.5" />
                        Student hub
                    </div>
                    <h1 data-display="true" className="flex items-center gap-3 text-4xl font-semibold tracking-tight text-[var(--student-dashboard-text)]">
                        <Users className="h-7 w-7 text-indigo-300" />
                        <span className="block">ห้องเรียนของฉัน</span>
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-[var(--student-dashboard-text-muted)]">
                        My Classes — เลือกห้องเรียนเพื่อเช็คอินหรือดู feedback
                    </p>
                </div>
                <Link href="/student/join">
                    <Button className="h-14 w-full rounded-2xl bg-indigo-600 px-5 shadow-[0_14px_28px_rgba(99,102,241,0.24)] hover:bg-indigo-500 sm:w-auto">
                        <UserPlus className="w-4 h-4 mr-2" />
                        เข้าร่วมห้องเรียน / Join Class
                    </Button>
                </Link>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    {error}
                </div>
            )}

            {/* Empty state */}
            {classes.length === 0 && !error ? (
                <Card className="student-surface border-2 border-dashed border-indigo-200/50 rounded-[28px] shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                            <Users className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 data-display="true" className="text-2xl font-semibold text-[var(--student-dashboard-text)]">
                                <span className="block">ยังไม่ได้เข้าร่วมห้องเรียน</span>
                                <span className="block text-sm font-normal text-[var(--student-dashboard-text-muted)]">
                                    You haven&apos;t joined any classes yet
                                </span>
                            </h3>
                            <p className="max-w-sm text-sm text-[var(--student-dashboard-text-muted)]">
                                <span className="block">ขอรหัสเชิญจากครูของคุณเพื่อเข้าร่วมห้องเรียน</span>
                                <span className="block text-xs mt-1">
                                    Ask your teacher for an invite code to join a class.
                                </span>
                            </p>
                        </div>
                        <Link href="/student/join">
                            <Button size="lg" className="mt-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500">
                                <UserPlus className="w-5 h-5 mr-2" />
                                เข้าร่วมห้องเรียน / Join Class
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                /* Class cards */
                <div className="grid gap-5">
                    {classes.map((cls) => (
                        <Card
                            key={cls.class_id}
                            className="student-surface rounded-[28px] border shadow-[0_16px_36px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-1 hover:border-indigo-300/30 hover:shadow-[0_22px_48px_rgba(0,0,0,0.2)]"
                        >
                            <CardContent className="space-y-5 p-6">
                                <div className="min-w-0 space-y-2">
                                    <h3 data-display="true" className="truncate text-[2rem] font-semibold leading-[1.1] text-[var(--student-dashboard-text)]">
                                        {cls.class_name}
                                    </h3>
                                    {cls.teacher_name && (
                                        <p className="truncate text-sm text-[var(--student-dashboard-text-muted)]">
                                            👩‍🏫 {cls.teacher_name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 rounded-full border border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--student-dashboard-text-muted)]">
                                    <span>เช็คอินได้วันละครั้งต่อห้อง</span>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Link
                                        href={`/student/check-in?classId=${cls.class_id}`}
                                        className="flex-1"
                                    >
                                        <Button className="h-14 w-full rounded-2xl bg-indigo-600 shadow-[0_14px_28px_rgba(99,102,241,0.24)] hover:bg-indigo-500">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            เช็คอิน
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
