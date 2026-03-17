"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

const MOODS = [
    { value: 1, emoji: "😢", label: "Struggling" },
    { value: 2, emoji: "😕", label: "Not great" },
    { value: 3, emoji: "😐", label: "Okay" },
    { value: 4, emoji: "🙂", label: "Good" },
    { value: 5, emoji: "😄", label: "Great!" },
] as const;

type State = "idle" | "submitting" | "success" | "error" | "already_done";

interface QrCheckInClientProps {
    classId: string;
    className: string;
}

function getSessionKey(classId: string) {
    return `qr_checkin_done_${classId}`;
}

export function QrCheckInClient({ classId, className }: QrCheckInClientProps) {
    const [selected, setSelected] = useState<number | null>(null);
    const [state, setState] = useState<State>("idle");
    const [errorMsg, setErrorMsg] = useState<string>("");

    // Check if already submitted this session
    useEffect(() => {
        if (sessionStorage.getItem(getSessionKey(classId)) === "1") {
            setState("already_done");
        }
    }, [classId]);

    const handleSubmit = async () => {
        if (!selected || state === "submitting") return;

        // Double-check dedup
        if (sessionStorage.getItem(getSessionKey(classId)) === "1") {
            setState("already_done");
            return;
        }

        setState("submitting");

        // Generate a simple session token (not a user ID — just for server-side logging)
        const sessionToken =
            sessionStorage.getItem("qr_session_id") ||
            (() => {
                const id = crypto.randomUUID();
                sessionStorage.setItem("qr_session_id", id);
                return id;
            })();

        try {
            const res = await fetch(`/api/qr/${classId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mood: selected, session_token: sessionToken }),
            });

            if (!res.ok) {
                const { error } = await res.json().catch(() => ({ error: "Unknown error" }));
                setErrorMsg(error || "Something went wrong. Please try again.");
                setState("error");
                return;
            }

            sessionStorage.setItem(getSessionKey(classId), "1");
            setState("success");
        } catch {
            setErrorMsg("Network error — check your connection and try again.");
            setState("error");
        }
    };

    // ── Success screen ───────────────────────────────────────────
    if (state === "success") {
        return (
            <div className="text-center max-w-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-center">
                    <CheckCircle2 className="w-20 h-20 text-emerald-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                    Thanks! ✨
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                    Your check-in has been recorded anonymously.
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-sm">
                    You can close this window.
                </p>
            </div>
        );
    }

    // ── Already done screen ──────────────────────────────────────
    if (state === "already_done") {
        return (
            <div className="text-center max-w-sm space-y-4">
                <p className="text-5xl">✅</p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Already checked in
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    You&apos;ve already submitted your check-in for this session.
                </p>
            </div>
        );
    }

    // ── Main mood picker ─────────────────────────────────────────
    return (
        <div className="w-full max-w-md">
            {/* Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-indigo-600 px-6 py-8 text-center">
                    <p className="text-sky-100 text-sm font-medium uppercase tracking-widest mb-1">
                        Anonymous Check-in
                    </p>
                    <h1 className="text-white text-2xl font-bold leading-tight">
                        {className}
                    </h1>
                </div>

                {/* Picker */}
                <div className="px-6 py-8 space-y-6">
                    <p className="text-center text-slate-600 dark:text-slate-300 font-medium">
                        How are you feeling about this class?
                    </p>

                    <div className="flex justify-between gap-2">
                        {MOODS.map(({ value, emoji, label }) => (
                            <button
                                key={value}
                                onClick={() => setSelected(value)}
                                disabled={state === "submitting"}
                                aria-label={label}
                                aria-pressed={selected === value}
                                className={[
                                    "flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 transition-all duration-150 cursor-pointer select-none",
                                    "hover:scale-105 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                                    selected === value
                                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950 shadow-md scale-105"
                                        : "border-slate-200 dark:border-slate-600 bg-transparent hover:border-slate-300",
                                    state === "submitting" ? "opacity-50 cursor-not-allowed" : "",
                                ].join(" ")}
                            >
                                <span className="text-3xl leading-none">{emoji}</span>
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center leading-tight">
                                    {label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Error message */}
                    {state === "error" && (
                        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-3">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!selected || state === "submitting"}
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 border-0 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {state === "submitting" ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Submitting…
                            </>
                        ) : (
                            "Submit Check-in"
                        )}
                    </Button>

                    <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                        🔒 Completely anonymous — no name or ID is stored.
                    </p>
                </div>
            </div>
        </div>
    );
}
