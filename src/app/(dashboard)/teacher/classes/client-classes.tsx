"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Copy, Plus, Archive, Edit, Loader2, QrCode, BarChart3, HelpCircle, PauseCircle, ShieldCheck } from "lucide-react";
import { ThaiRiskBadge } from "@/components/domain/teacher/ThaiRiskBadge";
import { archiveClass, createClassAction } from "./actions";
import { toast } from "sonner";
import { QrCodeDialog } from "@/components/domain/teacher/QrCodeDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type PolicyLevel = "ROUTINE" | "WARNING" | "CRITICAL";

interface ClientClass {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_at: string;
  student_count: number;
  risk_level: PolicyLevel | null;
  risk_score: number | null;
  pending_recommendations: number;
  inquiry_mode_suggested: boolean;
  blocked_reason: "frequency_limit_exceeded" | "k_anonymity" | null;
  total_decided: number;
  dismissal_rate: number;
  latest_policy_selected: string | null;
}

interface ClientClassesProps {
    classes: ClientClass[];
}

export function ClientClasses({ classes }: ClientClassesProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [qrClass, setQrClass] = useState<{ id: string; name: string } | null>(null);
    const router = useRouter();

    const handleCopyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("Invite code copied to clipboard", {
                description: code
            });
        } catch {
            toast.error("Failed to copy code");
        }
    };

    const handleArchive = async (classId: string, className: string) => {
        if (!confirm(`Are you sure you want to archive "${className}"?`)) return;

        setIsArchiving(classId);
        try {
            const res = await archiveClass(classId);
            if (res.success) {
                toast.success(`Class "${className}" archived successfully.`);
            } else {
                toast.error(res.error || "Failed to archive class");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsArchiving(null);
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsCreating(true);

        const formData = new FormData(e.currentTarget);
        try {
            const res = await createClassAction(formData);
            if (res.success) {
                toast.success("Class created successfully!");
                setIsCreateOpen(false);
            } else {
                toast.error(res.error || "Failed to create class.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--teacher-dashboard-text)]">
                        <Users className="w-6 h-6 text-[var(--teacher-dashboard-primary)]" />
                        Classrooms
                    </h1>
                    <p className="mt-1 text-[var(--teacher-dashboard-text-muted)]">
                        Manage your active classes and invite students.
                    </p>
                </div>
                
                <Button onClick={() => setIsCreateOpen(true)} className="w-full bg-[var(--teacher-dashboard-primary)] text-slate-950 shadow-[0_16px_32px_rgba(147,197,253,0.18)] hover:bg-[#bfdbfe] sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Class
                </Button>
            </div>

            {classes.length === 0 ? (
                <Card className="teacher-surface border-dashed bg-[linear-gradient(180deg,rgba(15,27,45,0.96),rgba(10,19,33,0.92))]">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                        <Users className="w-10 h-10 text-[var(--teacher-dashboard-text-muted)] opacity-60" />
                        <h3 className="text-lg font-medium text-[var(--teacher-dashboard-text)]">No active classes</h3>
                        <p className="max-w-sm text-[var(--teacher-dashboard-text-muted)]">
                            You don&apos;t have any active classes right now. Create one to get started.
                        </p>
                        <Button 
                            variant="outline" 
                            className="mt-4 border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)] hover:text-[var(--teacher-dashboard-primary)]"
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create your first class
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {classes.map((cls) => (
                        <Card key={cls.id} className="teacher-surface flex h-full flex-col overflow-hidden border bg-[linear-gradient(180deg,rgba(15,27,45,0.98),rgba(10,19,33,0.94))] transition-all group hover:-translate-y-1 hover:shadow-[0_26px_62px_rgba(2,8,23,0.52)]">
                            {isArchiving === cls.id && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(8,17,33,0.62)] backdrop-blur-sm">
                                    <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                                </div>
                            )}
                            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2 space-y-0">
                                <div className="min-w-0 flex-1">
                                    <CardTitle className="pr-2 text-base font-semibold text-[var(--teacher-dashboard-text)]" title={cls.name}>
                                        <Link href={`/teacher/class/${cls.id}`} className="transition-colors hover:text-[var(--teacher-dashboard-primary)]">
                                            <span className="product-card-title text-[clamp(1.4rem,1.9vw,1.9rem)] leading-[1.12]">{cls.name}</span>
                                        </Link>
                                    </CardTitle>
                                    {cls.description && (
                                        <p className="mt-2 max-w-[32ch] text-sm leading-6 teacher-text-muted">
                                            {cls.description}
                                        </p>
                                    )}
                                    <div className="mt-2">
                                        <ThaiRiskBadge score={cls.risk_score} policyLevel={cls.risk_level} size="sm" />
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {cls.inquiry_mode_suggested && (
                                            <Badge variant="secondary" className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text)]">
                                                <HelpCircle className="mr-1 h-3 w-3" />
                                                Inquiry Mode
                                            </Badge>
                                        )}
                                        {cls.blocked_reason === "frequency_limit_exceeded" && (
                                            <Badge variant="outline" className="border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] text-[var(--teacher-dashboard-text-muted)]">
                                                <PauseCircle className="mr-1 h-3 w-3" />
                                                No new draft this cycle
                                            </Badge>
                                        )}
                                        {cls.blocked_reason === "k_anonymity" && (
                                            <Badge variant="outline" className="border-[color:var(--teacher-dashboard-border)] bg-[rgba(147,197,253,0.12)] text-[var(--teacher-dashboard-primary)]">
                                                <ShieldCheck className="mr-1 h-3 w-3" />
                                                Waiting for safe aggregate signal
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0 text-[var(--teacher-dashboard-text-muted)] hover:bg-white/5 hover:text-white">
                                            <span className="sr-only">Open menu</span>
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setQrClass({ id: cls.id, name: cls.name })}>
                                            <QrCode className="w-4 h-4 mr-2" /> Show QR Code
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/teacher/class/${cls.id}/settings`)}>
                                            <Edit className="w-4 h-4 mr-2" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={() => handleArchive(cls.id, cls.name)}
                                            className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                        >
                                            <Archive className="w-4 h-4 mr-2" /> Archive
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-between">
                                <Link href={`/teacher/class/${cls.id}`} className="block h-full group">
                                    <div className="mt-2 flex items-center gap-2 text-2xl font-bold text-[var(--teacher-dashboard-text)] transition-colors group-hover:text-[var(--teacher-dashboard-primary)]">
                                        <Users className="w-5 h-5 text-[var(--teacher-dashboard-text-muted)]" />
                                        {cls.student_count} <span className="text-sm font-normal text-[var(--teacher-dashboard-text-muted)]">Students</span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-2 text-sm">
                                        {cls.pending_recommendations > 0 ? (
                                            <span className="rounded-full bg-[rgba(253,230,138,0.12)] px-2.5 py-1 font-medium text-[var(--teacher-dashboard-warning)]">
                                                {cls.pending_recommendations} pending draft
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-[rgba(147,197,253,0.12)] px-2.5 py-1 font-medium text-[var(--teacher-dashboard-primary)]">
                                                {cls.blocked_reason === "frequency_limit_exceeded"
                                                    ? "no new draft this cycle"
                                                    : cls.blocked_reason === "k_anonymity"
                                                      ? "waiting for safe aggregate signal"
                                                      : "all caught up"}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-3 text-xs text-[var(--teacher-dashboard-text-muted)]">
                                        ตัดสินแล้ว {cls.total_decided} รายการ, ข้าม {Math.round(cls.dismissal_rate * 100)}%
                                    </p>
                                </Link>
                                <div className="mt-4 grid gap-2">
                                    <Link href={`/teacher/class/${cls.id}/members`} className="min-w-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="product-card-button h-auto min-h-11 w-full border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 py-3 text-left text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)] hover:text-[var(--teacher-dashboard-primary)]"
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            สมาชิก
                                        </Button>
                                    </Link>
                                    <Link href={`/teacher/climate?classId=${cls.id}`} className="min-w-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="product-card-button h-auto min-h-11 w-full border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] px-4 py-3 text-left text-[var(--teacher-dashboard-text)] hover:bg-[var(--teacher-dashboard-primary-soft)] hover:text-[var(--teacher-dashboard-primary)]"
                                        >
                                            <BarChart3 className="w-4 h-4 mr-2" />
                                            Class Climate
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col items-start gap-3 border-t border-[var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)] p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0 text-xs font-medium uppercase tracking-wider text-[var(--teacher-dashboard-text-muted)]">
                                    Code: <span className="product-code-chip ml-1 inline-block rounded bg-[rgba(147,197,253,0.12)] px-1.5 py-0.5 font-mono tracking-widest text-[var(--teacher-dashboard-text)]">{cls.invite_code || "N/A"}</span>
                                </div>
                                {cls.invite_code && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-[var(--teacher-dashboard-text-muted)] hover:bg-white/5 hover:text-white" onClick={() => handleCopyCode(cls.invite_code)}>
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* QR Code Dialog */}
            {qrClass && (
                <QrCodeDialog
                    classId={qrClass.id}
                    className={qrClass.name}
                    open={!!qrClass}
                    onOpenChange={(open) => !open && setQrClass(null)}
                />
            )}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleCreateSubmit}>
                        <DialogHeader>
                            <DialogTitle>Create Class</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Class Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. CS 101 - Fall 2026"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setIsCreateOpen(false)}
                                disabled={isCreating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Class"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
