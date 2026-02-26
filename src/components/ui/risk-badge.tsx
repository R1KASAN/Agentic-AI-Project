import * as React from "react"
import { Badge } from "@/components/ui/badge"

interface RiskBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    level?: "Low" | "Medium" | "High";
    score?: number; // 0-100
}

export function RiskBadge({ level, score, className, ...props }: RiskBadgeProps) {
    let displayLevel = level;
    if (!displayLevel && score !== undefined) {
        if (score < 40) displayLevel = "Low";
        else if (score < 70) displayLevel = "Medium";
        else displayLevel = "High";
    }

    const variant = displayLevel === "High" ? "destructive" : displayLevel === "Medium" ? "secondary" : "default";

    return (
        <Badge variant={variant} className={className} {...props}>
            {displayLevel || "Unknown"} Risk
        </Badge>
    )
}
