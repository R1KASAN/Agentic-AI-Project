"use client"

import * as React from "react"
import { enrollByEmail, removeStudent, archiveClass, regenerateInviteCode } from "./actions"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, Trash2, Users, Link as LinkIcon, Loader2, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export function ClassSettingsClient({
    classId,
    className,
    inviteCode,
    createdAt,
    students
}: {
    classId: string,
    className: string,
    inviteCode: string,
    createdAt: string,
    students: { id: string, name: string, email: string }[]
}) {
    const [email, setEmail] = React.useState("")
    const [isAdding, setIsAdding] = React.useState(false)
    const [removingId, setRemovingId] = React.useState<string | null>(null)
    const [isArchiving, setIsArchiving] = React.useState(false)
    const [isRegenerating, setIsRegenerating] = React.useState(false)

    const handleRegenerateCode = async () => {
        if (!confirm("Are you sure you want to generate a new invite code? The old code will no longer work.")) return
        setIsRegenerating(true)
        const res = await regenerateInviteCode(classId)
        if (res.success) {
            toast.success("New invite code generated successfully")
        } else {
            toast.error(res.error)
        }
        setIsRegenerating(false)
    }

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setIsAdding(true)
        const res = await enrollByEmail(classId, email)
        if (res.success) {
            toast.success("Student added successfully")
            setEmail("")
        } else {
            toast.error(res.error)
        }
        setIsAdding(false)
    }

    const handleRemove = async (studentId: string, studentName: string) => {
        if (!confirm(`Are you sure you want to remove ${studentName}?`)) return
        setRemovingId(studentId)
        const res = await removeStudent(classId, studentId)
        if (res.success) {
            toast.success(`${studentName} removed from class`)
        } else {
            toast.error(res.error)
        }
        setRemovingId(null)
    }

    const handleArchive = async () => {
        if (!confirm("Are you sure you want to archive (delete) this class? This action cannot be undone for the MVP.")) return
        setIsArchiving(true)
        const res = await archiveClass(classId)
        if (res?.error) {
            toast.error(res.error)
            setIsArchiving(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <Link href={`/teacher/class/${classId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Class Dashboard
            </Link>

            <div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">Settings: {className}</h1>
                <p className="text-muted-foreground">Manage your class roster, invite students, and configure metadata.</p>
            </div>

            <div className="grid gap-6">

                {/* Class Info & Invite Code */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-indigo-500" />
                            Invite Students
                        </CardTitle>
                        <CardDescription>Created on {new Date(createdAt).toLocaleDateString()}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-4 rounded-xl flex items-center justify-between border">
                            <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Class Invite Code</p>
                                <p className="text-2xl font-mono tracking-widest font-bold">{inviteCode}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => {
                                    navigator.clipboard.writeText(inviteCode)
                                    toast.success("Invite code copied to clipboard!")
                                }}>
                                    Copy Code
                                </Button>
                                <Button variant="secondary" onClick={handleRegenerateCode} disabled={isRegenerating}>
                                    {isRegenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Regenerate
                                </Button>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">Students can join your class by entering this code at <strong>/student/join</strong>.</p>
                    </CardContent>
                </Card>

                {/* Add Student Manually */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-500" />
                            Add Student Manually
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddStudent} className="flex gap-3">
                            <div className="flex-1">
                                <Input
                                    type="email"
                                    placeholder="student@school.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isAdding}
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={isAdding}>
                                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Class"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Enrolled Students List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Enrolled Students ({students.length})</CardTitle>
                        <CardDescription>To protect privacy, you cannot see individual check-in data here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {students.length > 0 ? (
                            <div className="divide-y border rounded-md overflow-hidden">
                                {students.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-4 bg-card hover:bg-muted/50 transition-colors">
                                        <div>
                                            <p className="font-medium">{s.name}</p>
                                            <p className="text-sm text-muted-foreground">{s.email}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemove(s.id, s.name)}
                                            disabled={removingId === s.id}
                                        >
                                            {removingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center border-2 border-dashed rounded-md text-muted-foreground">
                                No students enrolled yet. Share your invite code!
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-xl text-destructive flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Danger Zone
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Archiving this class will remove it from your dashboard. Students will no longer be able to submit check-ins.
                        </p>
                        <Button variant="destructive" onClick={handleArchive} disabled={isArchiving}>
                            {isArchiving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Archiving...</> : "Archive Class"}
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
