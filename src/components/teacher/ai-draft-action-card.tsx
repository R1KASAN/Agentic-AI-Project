"use client"

import * as React from "react"
import { approveRecommendation, dismissRecommendation } from "@/lib/actions/teacher"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Bot, Check, X, Edit2, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface AIDraftActionCardProps {
    id: string
    content: string
    category: 'engagement' | 'wellbeing' | 'collaboration' | 'academic'
    priority: 'high' | 'medium' | 'low'
    aiGenerated: boolean
}

export function AIDraftActionCard({ id, content, category, priority, aiGenerated }: AIDraftActionCardProps) {
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isEditOpen, setIsEditOpen] = React.useState(false)
    const [editedContent, setEditedContent] = React.useState(content)

    const handleAction = async (status: 'approved' | 'dismissed' | 'edited', newContent?: string, dismissalReason?: string) => {
        setIsSubmitting(true)
        try {
            let res: { success: boolean; error?: string };
            if (status === 'approved' || status === 'edited') {
                const r = await approveRecommendation(id, newContent || content)
                res = { success: r.success ?? false, error: r.error }
            } else {
                const r = await dismissRecommendation(id, dismissalReason || 'Dismissed by Teacher')
                res = { success: r.success ?? false, error: r.error }
            }

            if (res.success) {
                toast.success(`Action successfully ${status === 'edited' ? 'approved (with edits)' : status}`)
                setIsEditOpen(false)
            } else {
                toast.error(res.error || "Something went wrong")
            }
        } catch (err) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="border-l-4 border-l-indigo-500 relative overflow-hidden group">
            {/* Decorative AI background element */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-50 dark:bg-indigo-950/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <CardContent className="pt-6 relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs font-semibold">
                            {category}
                        </Badge>
                        <Badge variant={priority === 'high' ? 'destructive' : priority === 'medium' ? 'secondary' : 'default'} className="uppercase text-[10px] tracking-wider">
                            {priority} Priority
                        </Badge>
                    </div>

                    {aiGenerated && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Draft View
                        </div>
                    )}
                </div>

                <div className="bg-muted/30 p-4 rounded-xl border border-muted/50 mb-2">
                    <p className="text-sm leading-relaxed text-foreground">
                        {content}
                    </p>
                </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2 pt-2 pb-4 px-6 relative z-10 border-t bg-muted/10 mt-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    disabled={isSubmitting}
                    onClick={() => handleAction('dismissed', undefined, 'Dismissed by Teacher')}
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                    Dismiss
                </Button>

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="bg-background" disabled={isSubmitting}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Edit AI Suggestion</DialogTitle>
                            <DialogDescription>
                                Modify this draft before approving it for your class. This text will be shown in the student's loop closure feed.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 mt-2">
                            <Textarea
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                className="min-h-[120px] text-sm leading-relaxed"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button onClick={() => handleAction('edited', editedContent)} disabled={isSubmitting || !editedContent.trim()}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Approve with Edits"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleAction('approved')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                    Approve Action
                </Button>
            </CardFooter>
        </Card>
    )
}
