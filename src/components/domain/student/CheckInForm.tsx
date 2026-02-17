"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, ShieldCheck, Send, Loader2 } from "lucide-react";

const MOOD_EMOJIS = [
    { value: 1, emoji: "😞", label: "Very Low" },
    { value: 2, emoji: "😕", label: "Low" },
    { value: 3, emoji: "😐", label: "Neutral" },
    { value: 4, emoji: "🙂", label: "Good" },
    { value: 5, emoji: "😄", label: "Great" },
];

const PACE_OPTIONS = [
    { value: 1, label: "Way too slow" },
    { value: 2, label: "A bit slow" },
    { value: 3, label: "Just right" },
    { value: 4, label: "A bit fast" },
    { value: 5, label: "Way too fast" },
];

const FAIRNESS_OPTIONS = [
    { value: 1, label: "Very unfair" },
    { value: 2, label: "Somewhat unfair" },
    { value: 3, label: "Neutral" },
    { value: 4, label: "Mostly fair" },
    { value: 5, label: "Very fair" },
];

interface CheckInFormProps {
    onSubmit: (data: CheckInData) => Promise<void>;
    isSubmitting: boolean;
}

export interface CheckInData {
    mood: number;
    pace: number;
    fairness: number;
    content: string;
    anonymous: boolean;
}

export function CheckInForm({ onSubmit, isSubmitting }: CheckInFormProps) {
    const [mood, setMood] = useState<number | null>(null);
    const [pace, setPace] = useState<number | null>(null);
    const [fairness, setFairness] = useState<number | null>(null);
    const [content, setContent] = useState("");
    const [anonymous, setAnonymous] = useState(true);

    const isValid = mood !== null && pace !== null && fairness !== null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isValid) return;
        await onSubmit({
            mood: mood!,
            pace: pace!,
            fairness: fairness!,
            content,
            anonymous,
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Anonymity Badge (T019) */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setAnonymous(!anonymous)}
                    className={cn(
                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                        anonymous
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800"
                            : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    )}
                >
                    {anonymous ? (
                        <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                        <Shield className="w-3.5 h-3.5" />
                    )}
                    {anonymous ? "Anonymity Guaranteed" : "Name Visible to Teacher"}
                </button>
                <span className="text-[11px] text-muted-foreground">
                    Tap to toggle
                </span>
            </div>

            {/* Mood - Emoji Picker */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                    How are you feeling?
                </label>
                <div className="flex justify-between gap-2">
                    {MOOD_EMOJIS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => setMood(item.value)}
                            className={cn(
                                "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all flex-1",
                                mood === item.value
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-md scale-105"
                                    : "border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                        >
                            <span className="text-2xl">{item.emoji}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                                {item.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Pace - Scale Buttons */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                    How's the pace?
                </label>
                <div className="flex flex-wrap gap-2">
                    {PACE_OPTIONS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => setPace(item.value)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                                pace === item.value
                                    ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 shadow-sm"
                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fairness - Scale Buttons */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                    Is the class fair?
                </label>
                <div className="flex flex-wrap gap-2">
                    {FAIRNESS_OPTIONS.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => setFairness(item.value)}
                            className={cn(
                                "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                                fairness === item.value
                                    ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300 shadow-sm"
                                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Optional Text */}
            <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                    Anything else? <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your thoughts..."
                    maxLength={500}
                    rows={3}
                    className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                    {content.length}/500
                </p>
            </div>

            {/* Submit */}
            <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg h-12 text-base"
                disabled={!isValid || isSubmitting}
            >
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Check-in
                    </>
                )}
            </Button>
        </form>
    );
}
