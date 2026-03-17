"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    CloudSun,
    LayoutDashboard,
    MessageSquare,
    BarChart3,
    ClipboardList,
    Shield,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { useState } from "react";
import type { UserRole } from "@/types";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: Record<UserRole, NavItem[]> = {
    student: [
        { label: "Check-in", href: "/student/check-in", icon: <CloudSun className="w-5 h-5" /> },
        { label: "Feedback", href: "/student/feedback", icon: <BarChart3 className="w-5 h-5" /> },
        { label: "ความเป็นส่วนตัว", href: "/student/privacy", icon: <Shield className="w-5 h-5" /> },
    ],
    teacher: [
        { label: "Dashboard", href: "/teacher", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "จัดการห้องเรียน", href: "/teacher/classes", icon: <ClipboardList className="w-5 h-5" /> },
        { label: "Recommendations", href: "/teacher/recommendations", icon: <MessageSquare className="w-5 h-5" /> },
    ],
};

const ROLE_LABELS: Record<UserRole, string> = {
    student: "Student",
    teacher: "Teacher",
};

const ROLE_COLORS: Record<UserRole, string> = {
    student: "from-indigo-500 to-indigo-600",
    teacher: "from-sky-500 to-sky-600",
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

    async function handleSignOut() {
        const confirmed = window.confirm("ออกจากระบบ? / Sign out?");
        if (!confirmed) return;
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col bg-sidebar-bg text-sidebar-fg border-r border-slate-700/50 transition-all duration-300",
                    collapsed ? "w-[68px]" : "w-60"
                )}
            >
                {/* Brand */}
                <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
                    <div
                        className={cn(
                            "flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br shadow-lg flex-shrink-0",
                            ROLE_COLORS[role]
                        )}
                    >
                        <CloudSun className="w-5 h-5 text-white" />
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <h2 className="text-sm font-semibold text-white truncate">
                                Climate Agent
                            </h2>
                            <p className="text-[11px] text-slate-400 truncate">
                                {ROLE_LABELS[role]} Dashboard
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1">
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
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-sidebar-active/20 text-white shadow-sm"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                                title={collapsed ? item.label : undefined}
                            >
                                <span
                                    className={cn(
                                        "flex-shrink-0",
                                        isActive ? "text-sidebar-active" : ""
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
                <div className="mt-auto border-t border-slate-700/50">
                    {/* User */}
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
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
                                <p className="text-sm font-medium text-white truncate">
                                    {userName}
                                </p>
                                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {ROLE_LABELS[role]}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 space-y-1">
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title={collapsed ? "Sign Out" : undefined}
                        >
                            <LogOut className="w-4 h-4 flex-shrink-0" />
                            {!collapsed && <span>Sign Out</span>}
                        </button>
                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                            title={collapsed ? "Expand" : "Collapse"}
                        >
                            {collapsed ? (
                                <ChevronRight className="w-4 h-4 flex-shrink-0" />
                            ) : (
                                <>
                                    <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                                    <span>Collapse</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
            </main>
        </div>
    );
}
