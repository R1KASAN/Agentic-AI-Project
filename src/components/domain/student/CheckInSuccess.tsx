"use client";

import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MICROCOPY, BiText } from "@/lib/microcopy";
import Link from "next/link";

export function CheckInSuccess() {
    return (
        <div className="flex flex-col items-center justify-center text-center py-12 px-6 space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Success Icon */}
            <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200 dark:shadow-green-900/30">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                    <Sparkles className="w-4 h-4 text-yellow-800" />
                </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                    <BiText entry={MICROCOPY.student.successMessage} />
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                    <span className="block">เสียงของคุณมีความหมาย ครูจะเห็นเฉพาะแนวโน้มรวม ไม่เห็นคำตอบส่วนตัว</span>
                    <span className="block text-muted-foreground/70 text-xs mt-1">
                        Your voice matters. Your teacher sees aggregate trends, never your individual response.
                    </span>
                </p>
            </div>

            {/* Privacy reminder */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-sm text-green-700 dark:text-green-300 max-w-sm">
                <span className="block">🔒 คำตอบของคุณได้รับการปกป้องโดย k-anonymity จะแสดงเฉพาะเมื่อมีนักเรียน 3+ คนตอบ</span>
                <span className="block text-xs mt-1 opacity-80">
                    Protected by k-anonymity — only shown in aggregate when 3+ students respond.
                </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                <Link href="/student/feedback">
                    <Button variant="outline" className="gap-2">
                        ดูความคิดเห็น / View Feedback
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
                <Link href="/student/check-in">
                    <Button
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => window.location.reload()}
                    >
                        เช็คอินใหม่ / New Check-in
                    </Button>
                </Link>
            </div>
        </div>
    );
}
