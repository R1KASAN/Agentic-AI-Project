import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, AlertOctagon, CircleSlash } from "lucide-react";

type RiskLevel = "low" | "medium" | "high" | "none";

type PolicyLevel = "ROUTINE" | "WARNING" | "CRITICAL";

interface RiskIndicatorProps {
  score: number | null;
  policyLevel?: PolicyLevel | null;
  size?: "sm" | "md";
}

function getRiskFromPolicyLevel(policyLevel: string | null | undefined): RiskLevel {
  switch (policyLevel) {
    case "ROUTINE":
      return "low";
    case "WARNING":
      return "medium";
    case "CRITICAL":
      return "high";
    default:
      return "none";
  }
}

function getRiskLevel(score: number | null): RiskLevel {
    if (score === null) return "none";
    if (score <= 30) return "low";
    if (score <= 60) return "medium";
    return "high";
}

const RISK_CONFIG: Record<
    RiskLevel,
    {
        label: string;
        icon: React.ReactNode;
        className: string;
        dotColor: string;
    }
> = {
    none: {
        label: "ยังไม่มีข้อมูล",
        icon: <CircleSlash className="w-3.5 h-3.5" />,
        className:
            "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700",
        dotColor: "bg-slate-400",
    },
    low: {
        label: "ปกติ",
        icon: <Shield className="w-3.5 h-3.5" />,
        className:
            "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
        dotColor: "bg-green-500",
    },
    medium: {
        label: "ต้องติดตาม",
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        className:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
        dotColor: "bg-amber-500",
    },
    high: {
        label: "เสี่ยงสูง",
        icon: <AlertOctagon className="w-3.5 h-3.5" />,
        className:
            "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
        dotColor: "bg-red-500",
    },
};

export function RiskIndicator({ score, policyLevel, size = "sm" }: RiskIndicatorProps) {
  const level = policyLevel !== undefined ? getRiskFromPolicyLevel(policyLevel) : getRiskLevel(score);
    const config = RISK_CONFIG[level];

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border font-semibold",
                config.className,
                size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
            )}
        >
            {config.icon}
            {config.label}
        </span>
    );
}

export function RiskDot({ score }: { score: number | null }) {
    const level = getRiskLevel(score);
    const config = RISK_CONFIG[level];

    return (
        <span
            className={cn("inline-block w-2.5 h-2.5 rounded-full", config.dotColor)}
            title={config.label}
        />
    );
}

export { getRiskLevel };
