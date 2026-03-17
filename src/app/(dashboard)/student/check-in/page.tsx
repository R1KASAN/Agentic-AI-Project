"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckInForm, type CheckInData } from "@/components/domain/student/CheckInForm";
import { CheckInSuccess } from "@/components/domain/student/CheckInSuccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Loader2, CheckCircle2 } from "lucide-react";
import { MICROCOPY, BiText } from "@/lib/microcopy";

export default function StudentCheckInPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
    const [classId, setClassId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const supabase = createClient();

    // Fetch student's enrolled class
    useEffect(() => {
        async function fetchClass() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setError("Not authenticated");
                setLoading(false);
                return;
            }

            const { data: enrollments } = await supabase
                .from("class_enrollments")
                .select("class_id, classes(name)")
                .eq("student_id", user.id)
                .limit(1);

            if (enrollments && enrollments.length > 0) {
                setClassId(enrollments[0].class_id);
            } else {
                setError("not_enrolled");
            }
            setLoading(false);
        }

        fetchClass();
    }, [supabase]);

    async function handleSubmit(data: CheckInData) {
        if (!classId) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/student/check-in", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    class_id: classId,
                    mood: data.mood,
                    pace: data.pace,
                    fairness: data.fairness,
                    content: data.content || null,
                }),
            });

            const resData = await res.json();

            if (resData.alreadyCheckedIn) {
                setAlreadyCheckedIn(true);
                return;
            }

            if (!res.ok) {
                throw new Error(resData.error || "Failed to submit");
            }

            setIsSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (alreadyCheckedIn) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12 px-6 space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-xl font-bold">
                        <BiText entry={MICROCOPY.student.alreadyCheckedInTitle} />
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-sm">
                        <BiText entry={MICROCOPY.student.alreadyCheckedInBody} />
                    </p>
                </div>
                <div className="flex gap-3 pt-2">
                    <a href="/student/feedback">
                        <button className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium text-sm transition-colors">
                            ดูความคิดเห็น / View Feedback
                        </button>
                    </a>
                </div>
            </div>
        );
    }

    if (isSuccess) {
        return <CheckInSuccess />;
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    <BiText entry={MICROCOPY.student.checkInTitle} />
                </h1>
                <p className="text-muted-foreground mt-1">
                    {MICROCOPY.student.checkInSubtitle.th}
                    <span className="block text-sm">{MICROCOPY.student.checkInSubtitle.en}</span>
                </p>
            </div>

            {error === "not_enrolled" ? (
                <Card className="border-2 border-indigo-100 shadow-sm mt-8">
                    <CardContent className="pt-6 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-2">
                            <CloudSun className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-semibold">
                                <BiText entry={MICROCOPY.student.notEnrolledTitle} />
                            </h3>
                            <p className="text-muted-foreground text-sm max-w-sm">
                                <BiText entry={MICROCOPY.student.notEnrolledBody} />
                            </p>
                        </div>
                        <a href="/student/join" className="mt-2 block w-full sm:w-auto">
                            <button className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors">
                                <BiText entry={MICROCOPY.student.joinClass} />
                            </button>
                        </a>
                    </CardContent>
                </Card>
            ) : error ? (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    {error}
                </div>
            ) : (
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CloudSun className="w-5 h-5 text-indigo-500" />
                            <BiText entry={MICROCOPY.student.climateCheckIn} />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CheckInForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
