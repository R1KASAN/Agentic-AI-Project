"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export default function QrSuccessPage() {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto-close or go back
                    if (window.opener) {
                        window.close();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
            <div className="text-center max-w-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Success icon */}
                <div className="flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-200 dark:shadow-emerald-900/30">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                        บันทึกแล้ว ✓
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400">
                        ขอบคุณที่แชร์ความรู้สึก!
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                        Your check-in has been recorded anonymously.
                    </p>
                </div>

                {/* Privacy badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-700/80 rounded-full text-sm text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    🔒 ไม่มีการเก็บชื่อหรือ ID ของคุณ
                </div>

                {/* Auto-close countdown */}
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    {countdown > 0
                        ? `ปิดหน้านี้อัตโนมัติใน ${countdown} วินาที...`
                        : "คุณสามารถปิดหน้านี้ได้เลย"}
                </p>
            </div>
        </div>
    );
}
