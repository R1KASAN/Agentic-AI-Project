"use client"

import * as React from "react"
import { createClass } from "@/app/(dashboard)/teacher/class/actions"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewClassPage() {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError(null)

        const formData = new FormData(e.currentTarget)
        try {
            const res = await createClass(formData)
            if (res?.error) {
                setError(res.error)
                setIsSubmitting(false)
            }
            // Success redirects automatically inside the server action
        } catch {
            setError("An unexpected error occurred.")
            setIsSubmitting(false)
        }
    }

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <Link href="/teacher" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Link>

            <Card className="border-2 border-primary/10">
                <CardHeader>
                    <CardTitle className="text-2xl">Create a New Class</CardTitle>
                    <CardDescription>Setup a new cohort to begin gathering climate data.</CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="name">Class Name <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. AP Calculus Block 3"
                                required
                                maxLength={50}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Brief details about this class cohort..."
                                maxLength={200}
                                className="resize-none"
                                disabled={isSubmitting}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 pt-6 border-t border-border/50">
                        <Link href="/teacher" className="block">
                            <Button type="button" variant="outline" disabled={isSubmitting}>
                                Cancel
                            </Button>
                        </Link>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                            ) : "Create Class"}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
