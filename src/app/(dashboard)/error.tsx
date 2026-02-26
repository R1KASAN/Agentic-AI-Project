"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Dashboard error:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 text-red-500 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
                <h2 className="text-xl font-bold">
                    <span className="block">เกิดข้อผิดพลาด</span>
                    <span className="block text-sm font-normal text-muted-foreground">Something went wrong</span>
                </h2>
                <p className="text-muted-foreground text-sm max-w-md">
                    กรุณาลองใหม่อีกครั้ง หากปัญหายังคงอยู่ กรุณาติดต่อผู้ดูแลระบบ
                    <span className="block text-xs mt-1">
                        Please try again. If the problem persists, contact your administrator.
                    </span>
                </p>
            </div>
            <Button onClick={reset} variant="outline">
                ลองใหม่ / Try Again
            </Button>
        </div>
    );
}
