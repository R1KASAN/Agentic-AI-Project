"use client";

import * as React from "react"
import { cn } from "@/lib/utils"

export type Mood = 'great' | 'okay' | 'stressed' | 'bored';

interface EmojiPickerToggleProps {
    value?: Mood;
    onChange: (value: Mood) => void;
    className?: string;
}

const MOODS: { value: Mood; emoji: string; label: string }[] = [
    { value: 'great', emoji: '😁', label: 'Great' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'stressed', emoji: '😰', label: 'Stressed' },
    { value: 'bored', emoji: '🥱', label: 'Bored' },
];

export function EmojiPickerToggle({ value, onChange, className }: EmojiPickerToggleProps) {
    return (
        <div className={cn("flex flex-wrap gap-4 justify-center", className)}>
            {MOODS.map((mood) => (
                <button
                    key={mood.value}
                    type="button"
                    onClick={() => onChange(mood.value)}
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                        value === mood.value
                            ? "border-primary bg-primary/10 scale-110 shadow-sm"
                            : "border-transparent bg-muted hover:bg-muted/80 hover:scale-105"
                    )}
                    aria-pressed={value === mood.value}
                >
                    <span className="text-4xl mb-2">{mood.emoji}</span>
                    <span className="text-sm font-medium">{mood.label}</span>
                </button>
            ))}
        </div>
    )
}
