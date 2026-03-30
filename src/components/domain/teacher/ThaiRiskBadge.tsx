import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, AlertOctagon, Minus } from "lucide-react";

type RiskLevel = "low" | "medium" | "high" | "unknown";

type PolicyLevel = "ROUTINE" | "WARNING" | "CRITICAL";

interface ThaiRiskBadgeProps {
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
      return "unknown";
  }
}

const THAI_RISK_CONFIG: Record<
  RiskLevel,
  {
    label: string;
    icon: React.ReactNode;
    className: string;
  }
> = {
  low: {
    label: "ปกติ",
    icon: <Shield className="w-3.5 h-3.5" />,
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800",
  },
  medium: {
    label: "ต้องติดตาม",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  },
  high: {
    label: "เสี่ยงสูง",
    icon: <AlertOctagon className="w-3.5 h-3.5" />,
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  },
  unknown: {
    label: "ยังไม่มีข้อมูล",
    icon: <Minus className="w-3.5 h-3.5" />,
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
};

export function ThaiRiskBadge({ score, policyLevel, size = "sm" }: ThaiRiskBadgeProps) {
  const level = policyLevel !== undefined ? getRiskFromPolicyLevel(policyLevel) : "unknown";
  const config = THAI_RISK_CONFIG[level];

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
