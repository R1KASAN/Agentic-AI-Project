"use client";

import { useState, useEffect } from "react";
import { createClient, getSessionUser } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, GraduationCap, Loader2, MessageSquare } from "lucide-react";
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
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-indigo-500" />
                        <span className="block">ห้องเรียนของฉัน</span>
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        My Classes — เลือกห้องเรียนเพื่อเช็คอินหรือดู feedback
                    </p>
                </div>
                <Link href="/student/join">
                    <Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
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
                <Card className="border-2 border-dashed border-indigo-200">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-400 flex items-center justify-center">
                            <Users className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold">
                                <span className="block">ยังไม่ได้เข้าร่วมห้องเรียน</span>
                                <span className="block text-sm font-normal text-muted-foreground">
                                    You haven&apos;t joined any classes yet
                                </span>
                            </h3>
                            <p className="text-muted-foreground text-sm max-w-sm">
                                <span className="block">ขอรหัสเชิญจากครูของคุณเพื่อเข้าร่วมห้องเรียน</span>
                                <span className="block text-xs mt-1">
                                    Ask your teacher for an invite code to join a class.
                                </span>
                            </p>
                        </div>
                        <Link href="/student/join">
                            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 mt-2">
                                <UserPlus className="w-5 h-5 mr-2" />
                                เข้าร่วมห้องเรียน / Join Class
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                /* Class cards */
                <div className="grid gap-4">
                    {classes.map((cls) => (
                        <Card
                            key={cls.class_id}
                            className="hover:shadow-md transition-all border-2 border-transparent hover:border-indigo-100"
                        >
                            <CardContent className="p-5 space-y-4">
                                <div className="space-y-1 min-w-0">
                                    <h3 className="text-base font-semibold truncate">
                                        {cls.class_name}
                                    </h3>
                                    {cls.teacher_name && (
                                        <p className="text-sm text-muted-foreground truncate">
                                            👩‍🏫 {cls.teacher_name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <Link
                                        href={`/student/check-in?classId=${cls.class_id}`}
                                        className="flex-1"
                                    >
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                                            <GraduationCap className="w-4 h-4 mr-2" />
                                            เช็คอิน
                                        </Button>
                                    </Link>
                                    <Link
                                        href={`/student/feedback?classId=${cls.class_id}`}
                                        className="flex-1"
                                    >
                                        <Button variant="outline" className="w-full">
                                            <MessageSquare className="w-4 h-4 mr-2" />
                                            ดู Feedback
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
