import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export const APP_NAME = "Class Climate Agent";

type BrandMarkSize = "xs" | "sm" | "lg";

const MARK_SIZE_STYLES: Record<BrandMarkSize, string> = {
    xs: "h-7 w-7 rounded-lg",
    sm: "h-9 w-9 rounded-xl",
    lg: "h-16 w-16 rounded-2xl",
};

const ICON_SIZE_STYLES: Record<BrandMarkSize, string> = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    lg: "h-8 w-8",
};

interface BrandMarkProps {
    size?: BrandMarkSize;
    className?: string;
    iconClassName?: string;
}

export function BrandMark({
    size = "sm",
    className,
    iconClassName,
}: BrandMarkProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center justify-center border border-sky-200 bg-sky-100 text-blue-600 shadow-none",
                MARK_SIZE_STYLES[size],
                className
            )}
        >
            <GraduationCap
                className={cn(ICON_SIZE_STYLES[size], "stroke-[2.2]", iconClassName)}
            />
        </div>
    );
}
