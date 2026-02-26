"use client"

import * as React from "react"
import { updateSchoolSettings } from "./actions"
import { SchoolNotificationSettingsInput } from "@/types/settings"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Settings2, Bell, Brain, AlertTriangle, CalendarOff } from "lucide-react"
import { toast } from "sonner"

const DAYS = [
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
    { value: "sunday", label: "Sunday" }
]

export function SchoolSettingsClient({
    schoolId,
    initialSettings
}: {
    schoolId: string,
    initialSettings: SchoolNotificationSettingsInput
}) {
    const [isSaving, setIsSaving] = React.useState(false)
    const [settings, setSettings] = React.useState<SchoolNotificationSettingsInput>(initialSettings)

    const handleUpdate = (updates: Partial<SchoolNotificationSettingsInput>) => {
        setSettings(prev => ({ ...prev, ...updates }))
    }

    const handleSave = async () => {
        setIsSaving(true)
        const { school_id, ...dataToSave } = settings // Omit school_id from payload if we want, or keep it
        const res = await updateSchoolSettings(schoolId, settings)

        if (res.success) {
            toast.success("บันทึกการตั้งค่าเรียบร้อย")
        } else {
            toast.error(res.error || "Failed to save settings")
        }
        setIsSaving(false)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between border-b pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <Settings2 className="w-8 h-8 text-indigo-600" />
                        School Settings
                    </h1>
                    <p className="text-muted-foreground mt-2">Manage automation schedules and configuration for your school.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
                </Button>
            </div>

            <div className="grid gap-6">

                {/* Section 1: AI Recommendation */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-500" />
                                AI Recommendation Generator
                            </CardTitle>
                            <CardDescription>Generates draft actions based on student feedback.</CardDescription>
                        </div>
                        <Switch
                            checked={settings.ai_run_enabled}
                            onCheckedChange={(c) => handleUpdate({ ai_run_enabled: c })}
                        />
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label>Day of Week</Label>
                            <Select value={settings.ai_run_day} onValueChange={(v) => handleUpdate({ ai_run_day: v })} disabled={!settings.ai_run_enabled}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input type="time" value={settings.ai_run_time} onChange={(e) => handleUpdate({ ai_run_time: e.target.value })} disabled={!settings.ai_run_enabled} />
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Teacher Email Summary */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bell className="w-5 h-5 text-blue-500" />
                                Teacher Email Summary
                            </CardTitle>
                            <CardDescription>Sends weekly TL;DR emails to teachers with pending actions.</CardDescription>
                        </div>
                        <Switch
                            checked={settings.teacher_email_enabled}
                            onCheckedChange={(c) => handleUpdate({ teacher_email_enabled: c })}
                        />
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <Label>Day of Week</Label>
                            <Select value={settings.teacher_email_day} onValueChange={(v) => handleUpdate({ teacher_email_day: v })} disabled={!settings.teacher_email_enabled}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <Input type="time" value={settings.teacher_email_time} onChange={(e) => handleUpdate({ teacher_email_time: e.target.value })} disabled={!settings.teacher_email_enabled} />
                        </div>
                    </CardContent>
                </Card>

                {/* Section 3: Student Reminder */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Bell className="w-5 h-5 text-emerald-500" />
                                Student Reminder
                            </CardTitle>
                            <CardDescription>Pushes in-app reminders to students who haven't checked in.</CardDescription>
                        </div>
                        <Switch
                            checked={settings.reminder_enabled}
                            onCheckedChange={(c) => handleUpdate({ reminder_enabled: c })}
                        />
                    </CardHeader>
                    <CardContent className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Day of Week</Label>
                                <Select value={settings.reminder_day} onValueChange={(v) => handleUpdate({ reminder_day: v })} disabled={!settings.reminder_enabled}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input type="time" value={settings.reminder_time} onChange={(e) => handleUpdate({ reminder_time: e.target.value })} disabled={!settings.reminder_enabled} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>ส่ง reminder เมื่อ check-in ต่ำกว่า X% : {settings.reminder_threshold}%</Label>
                            </div>
                            <input
                                type="range"
                                min="0" max="100"
                                value={settings.reminder_threshold}
                                onChange={(e) => handleUpdate({ reminder_threshold: parseInt(e.target.value) })}
                                disabled={!settings.reminder_enabled}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Section 4: Health Score Alert */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Health Score Alert
                            </CardTitle>
                            <CardDescription>Calculates school health score and sends Slack alerts if below threshold.</CardDescription>
                        </div>
                        <Switch
                            checked={settings.health_score_enabled}
                            onCheckedChange={(c) => handleUpdate({ health_score_enabled: c })}
                        />
                    </CardHeader>
                    <CardContent className="space-y-6 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Day of Week</Label>
                                <Select value={settings.health_score_day} onValueChange={(v) => handleUpdate({ health_score_day: v })} disabled={!settings.health_score_enabled}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{DAYS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Time</Label>
                                <Input type="time" value={settings.health_score_time} onChange={(e) => handleUpdate({ health_score_time: e.target.value })} disabled={!settings.health_score_enabled} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Alert Threshold (0-100)</Label>
                            <Input
                                type="number"
                                min="0" max="100"
                                value={settings.health_score_alert_threshold}
                                onChange={(e) => handleUpdate({ health_score_alert_threshold: parseInt(e.target.value) || 0 })}
                                disabled={!settings.health_score_enabled}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Section 5: System Pause */}
                <Card className="border-destructive/20">
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2 text-destructive">
                            <CalendarOff className="w-5 h-5" />
                            หยุดระบบแจ้งเตือนชั่วคราว
                        </CardTitle>
                        <CardDescription>
                            ใช้ในช่วงสอบหรือปิดเทอม ระบบจะกลับมาทำงานอัตโนมัติเมื่อพ้นวันที่กำหนด
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Paused Until (Date & Time)</Label>
                            <Input
                                type="datetime-local"
                                value={settings.paused_until ? new Date(settings.paused_until).toISOString().slice(0, 16) : ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdate({ paused_until: val ? new Date(val).toISOString() : null })
                                }}
                            />
                            <p className="text-sm text-muted-foreground mt-2">Clear the date to resume immediately.</p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
