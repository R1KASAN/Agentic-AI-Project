"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckInForm, type CheckInData } from "@/components/domain/student/CheckInForm";
import { CheckInSuccess } from "@/components/domain/student/CheckInSuccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudSun, Loader2 } from "lucide-react";

export default function StudentCheckInPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
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
                setError("You are not enrolled in any class.");
            }
            setLoading(false);
        }

        fetchClass();
    }, []);

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

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to submit");
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

    if (isSuccess) {
        return <CheckInSuccess />;
    }

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Daily Check-in</h1>
                <p className="text-muted-foreground mt-1">
                    How's your classroom feeling today? Takes less than 20 seconds.
                </p>
            </div>

            {error && (
                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                    {error}
                </div>
            )}

            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <CloudSun className="w-5 h-5 text-indigo-500" />
                        Climate Check-in
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CheckInForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
                </CardContent>
            </Card>
        </div>
    );
}
