"use client";

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Check, X, MessageSquareWarning, ArrowRight } from 'lucide-react';
import { useState, useTransition } from 'react';
import type { TeacherRecommendation } from '@/lib/data/teacher-mock';

interface RecommendationCardProps {
    recommendation: TeacherRecommendation;
    onAction: (id: string, action: 'approved' | 'dismissed', note?: string) => Promise<void>;
}

export function RecommendationCard({ recommendation, onAction }: RecommendationCardProps) {
    const { id, class_name, policy_level, content, inquiry_mode, reasoning, status, created_at, confidence_score } = recommendation;
    const [note, setNote] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleApprove = () => {
        startTransition(async () => {
            await onAction(id, 'approved', note);
        });
    };

    const handleDismiss = () => {
        startTransition(async () => {
            await onAction(id, 'dismissed', note);
        });
    };

    if (status !== 'pending') {
        return null; // Optimistic hide, or could show a "Completed" state
    }

    const isCritical = policy_level === 'CRITICAL';
    const isWarning = policy_level === 'WARNING';

    return (
        <Card className={`overflow-hidden border-l-4 ${isCritical ? 'border-l-red-500' : isWarning ? 'border-l-amber-500' : 'border-l-sky-500'}`}>
            <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-start justify-between bg-muted/20">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-semibold text-xs bg-background">
                            {class_name}
                        </Badge>
                        <Badge variant={isCritical ? 'destructive' : isWarning ? 'default' : 'secondary'} className={`${isWarning ? 'bg-amber-500 hover:bg-amber-600 outline-none border-transparent' : ''}`}>
                            {policy_level}
                        </Badge>
                        {confidence_score !== undefined && (
                            <Badge variant="outline" className="text-xs bg-background text-muted-foreground border-dashed">
                                {Math.round(confidence_score * 100)}% Confidence
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1">
                        Generated {new Date(created_at).toLocaleDateString()}
                    </p>
                </div>
                {inquiry_mode && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 bg-sky-100 dark:bg-sky-900/30 px-2.5 py-1 rounded-full">
                        <MessageSquareWarning className="w-3.5 h-3.5" />
                        Inquiry Mode
                    </div>
                )}
            </CardHeader>
            <CardContent className="pt-4 px-5 space-y-4">
                <div className="text-sm font-medium leading-relaxed">
                    &quot;{content}&quot;
                </div>
                
                {reasoning && (
                    <div className="bg-secondary/40 p-3 rounded-md text-xs text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{reasoning}</p>
                    </div>
                )}

                {inquiry_mode && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="text-xs font-medium text-sky-600 dark:text-sky-400 mb-1.5 block">
                            Teacher Context Required
                        </label>
                        <Textarea 
                            placeholder="Help the AI understand why this is happening (e.g., 'We have a big exam this week...')"
                            className="text-sm resize-none bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 focus-visible:ring-sky-500"
                            rows={3}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            disabled={isPending}
                        />
                    </div>
                )}
            </CardContent>
            
            <CardFooter className="px-5 pb-4 pt-0 gap-3">
                <Button 
                    variant="outline" 
                    className="flex-1 text-muted-foreground hover:text-foreground"
                    onClick={handleDismiss}
                    disabled={isPending}
                >
                    <X className="w-4 h-4 mr-1.5" />
                    {inquiry_mode ? 'Dismiss w/ Context' : 'Dismiss'}
                </Button>
                <Button 
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
                    onClick={handleApprove}
                    disabled={isPending || (inquiry_mode && note.trim().length === 0)}
                >
                    {inquiry_mode ? (
                        <>Submit Context & Approve <ArrowRight className="w-4 h-4 ml-1.5" /></>
                    ) : (
                        <><Check className="w-4 h-4 mr-1.5" /> Approve Action</>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
