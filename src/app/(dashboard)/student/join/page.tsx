"use client"

import * as React from "react"
import { joinClass } from "./actions"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, UserPlus } from "lucide-react"
import Link from "next/link"

export default function JoinClassPage() {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        try {
            const res = await joinClass(formData)
            if (res?.error) {
                setError(res.error)
                setIsSubmitting(false)
            }
            // Success triggers redirect in the server action
        } catch (err) {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่ / An unexpected error occurred.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <UserPlus className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        <span className="block">เข้าร่วมห้องเรียน</span>
                        <span className="block text-lg font-medium text-muted-foreground">Join a Class</span>
                    </h1>
                    <p className="text-muted-foreground">
                        <span className="block">กรอกรหัสเชิญ 8 ตัวอักษรจากครูของคุณ</span>
                        <span className="block text-sm">Enter the 8-character invite code from your teacher.</span>
                    </p>
                </div>

                <Card className="border-2 border-indigo-100 shadow-md">
                    <form onSubmit={handleSubmit}>
                        <CardContent className="pt-6 space-y-4">
                            {error && (
                                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2 text-center">
                                <Label htmlFor="inviteCode" className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">รหัสเชิญ / Invite Code</Label>
                                <Input
                                    id="inviteCode"
                                    name="inviteCode"
                                    placeholder="XXXXXXXX"
                                    required
                                    maxLength={8}
                                    disabled={isSubmitting}
                                    className="text-center text-3xl font-mono tracking-widest h-14 uppercase"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3 pb-6">
                            <Button type="submit" size="lg" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> กำลังเข้าร่วม...</>
                                ) : "เข้าร่วมห้องเรียน / Join Class"}
                            </Button>
                            <Link href="/student/check-in" className="w-full block">
                                <Button type="button" variant="ghost" className="w-full" disabled={isSubmitting}>
                                    ยกเลิก / Cancel
                                </Button>
                            </Link>
                        </CardFooter>
                    </form>
                </Card>

            </div>
        </div>
    )
}
