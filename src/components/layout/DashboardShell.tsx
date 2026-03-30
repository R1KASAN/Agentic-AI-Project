"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    BarChart3,
    ClipboardList,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Users,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/types";
import {
    APP_NAME,
    BrandMark,
} from "@/components/branding/ClassClimateAgentBrand";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
    student: [
        { label: "ห้องเรียน", href: "/student/classes", icon: <Users className="w-5 h-5" /> },
        { label: "Feedback", href: "/student/feedback", icon: <BarChart3 className="w-5 h-5" /> },
        { label: "ความเป็นส่วนตัว", href: "/student/privacy", icon: <Shield className="w-5 h-5" /> },
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "จัดการห้องเรียน", href: "/teacher/classes", icon: <ClipboardList className="w-5 h-5" /> },
    ],
};

const ROLE_LABELS: Record<UserRole, string> = {
    student: "Student",
    teacher: "Teacher",
};

interface DashboardShellProps {
    role: UserRole;
    userName: string;
    avatarUrl: string | null;
    children: React.ReactNode;
}

export function DashboardShell({
    role,
    userName,
    avatarUrl,
    children,
}: DashboardShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const navItems = NAV_ITEMS[role] || [];
    const isStudent = role === "student";

    async function handleSignOut() {
        const confirmed = window.confirm("ออกจากระบบ? / Sign out?");
        if (!confirmed) return;
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <div
            className={cn(
                "flex h-screen overflow-hidden bg-background",
                isStudent && "student-dashboard-shell"
            )}
        >
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col transition-all duration-300",
                    isStudent
                        ? "border-r border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-sidebar)] text-[var(--student-dashboard-text)]"
                        : "bg-sidebar-bg text-sidebar-fg border-r border-slate-700/50",
                    collapsed ? "w-[68px]" : "w-60"
                )}
            >
                {/* Brand */}
                <div
                    className={cn(
                        "flex items-center gap-3 border-b px-4 py-5",
                        isStudent
                            ? "border-[color:var(--student-dashboard-border)]"
                            : "border-slate-700/50"
                    )}
                >
                    <BrandMark
                        size="sm"
                        className={cn(
                            "flex-shrink-0",
                            isStudent
                                ? "border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-surface-raised)] text-[var(--student-dashboard-primary)]"
                                : "border-sky-200/80 bg-sky-100 text-blue-700"
                        )}
                    />
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h2
                                className={cn(
                                    "truncate text-sm font-semibold",
                                    isStudent ? "text-[var(--student-dashboard-text)]" : "text-white"
                                )}
                            >
                                {APP_NAME}
                            </h2>
                            <p
                                className={cn(
                                    "truncate text-[11px]",
                                    isStudent
                                        ? "text-[var(--student-dashboard-text-muted)]"
                                        : "text-slate-400"
                                )}
                            >
                                {ROLE_LABELS[role]} Dashboard
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
                    {navItems.map((item) => {
                        // Exact match for root paths like "/teacher" or "/admin/metrics"
                        // to prevent greedy matching of sub-routes like "/teacher/classes"
                        const isExactMatch = pathname === item.href;
                        const isSubPath =
                            item.href !== "/" &&
                            !item.href.match(/^\/[^/]+$/) && // not a root-level path
                            pathname.startsWith(item.href);
                        const isActive = isExactMatch || isSubPath;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-dashboard-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                                    isStudent &&
                                        "border border-transparent text-[var(--student-dashboard-text-muted)] hover:border-[color:var(--student-dashboard-border)] hover:bg-[var(--student-dashboard-surface)] hover:text-[var(--student-dashboard-text)]",
                                    !isStudent &&
                                        (isActive
                                            ? "bg-sidebar-active/20 text-white shadow-sm"
                                            : "text-slate-400 hover:text-white hover:bg-white/5"),
                                    isStudent &&
                                        isActive &&
                                        "border-[color:var(--student-dashboard-border)] bg-[var(--student-dashboard-primary-soft)] text-[var(--student-dashboard-text)] shadow-sm",
                                    !isStudent && isActive && "bg-sidebar-active/20 text-white shadow-sm"
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <span
                                    className={cn(
                                        "flex-shrink-0",
                                        isStudent
                                            ? isActive
                                                ? "text-[var(--student-dashboard-primary)]"
                                                : "text-[var(--student-dashboard-text-muted)]"
                                            : isActive
                                              ? "text-sidebar-active"
                                              : ""
                                    )}
                                >
                                    {item.icon}
                                </span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div
                    className={cn(
                        "mt-auto border-t",
                        isStudent
                            ? "border-[color:var(--student-dashboard-border)]"
                            : "border-slate-700/50"
                    )}
                >
                    {/* User */}
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div
                            className={cn(
                                "flex size-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                                isStudent
                                    ? "bg-gradient-to-br from-[var(--student-dashboard-surface-raised)] to-[var(--student-dashboard-surface-soft)]"
                                    : "bg-gradient-to-br from-slate-600 to-slate-500"
                            )}
                        >
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt={userName}
                                    width={32}
                                    height={32}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                userName.charAt(0).toUpperCase()
                            )}
                        </div>
                        {!collapsed && (
                            <div className="overflow-hidden flex-1">
                                <p
                                    className={cn(
                                        "truncate text-sm font-medium",
                                        isStudent
                                            ? "text-[var(--student-dashboard-text)]"
                                            : "text-white"
                                    )}
                                >
                                    {userName}
                                </p>
                                <p
                                    className={cn(
                                        "flex items-center gap-1 text-[11px]",
                                        isStudent
                                            ? "text-[var(--student-dashboard-text-muted)]"
                                            : "text-slate-400"
                                    )}
                                >
                                    <Shield className="size-3" />
                                    {ROLE_LABELS[role]}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 px-3 pb-3">
                        <button
                            onClick={handleSignOut}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-dashboard-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                                isStudent
                                    ? "text-[var(--student-dashboard-text-muted)] hover:bg-[var(--student-dashboard-surface)] hover:text-[var(--student-dashboard-danger)]"
                                    : "text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            )}
                            title={collapsed ? "Sign Out" : undefined}
                        >
                            <LogOut className="size-4 flex-shrink-0" />
                            {!collapsed && <span>Sign Out</span>}
                        </button>
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-dashboard-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                                isStudent
                                    ? "text-[var(--student-dashboard-text-muted)] hover:bg-[var(--student-dashboard-surface)] hover:text-[var(--student-dashboard-text)]"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                            title={collapsed ? "Expand" : "Collapse"}
                        >
                            {collapsed ? (
                                <ChevronRight className="size-4 flex-shrink-0" />
                            ) : (
                                <>
                                    <ChevronLeft className="size-4 flex-shrink-0" />
                                    <span>Collapse</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main
                className={cn(
                    "flex-1 overflow-auto",
                    isStudent && "bg-[var(--student-dashboard-bg)] text-[var(--student-dashboard-text)]"
                )}
            >
                <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
            </main>
        </div>
    );
}
