"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageSquare, Clock } from "lucide-react";

interface Action {
    id: string;
    content: string;
    action_taken_note: string | null;
    created_at: string;
    updated_at: string;
}

interface ActionListProps {
    actions: Action[];
}

export function ActionList({ actions }: ActionListProps) {
    if (actions.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                    <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        No teacher actions yet. Your teacher will review feedback and take
                        action soon.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Recent Actions from Teacher
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {actions.map((action) => (
                    <div
                        key={action.id}
                        className="flex gap-3 p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30"
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                {action.content}
                            </p>
                            {action.action_taken_note && (
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Action taken:</span>{" "}
                                    {action.action_taken_note}
                                </p>
                            )}
                            <div className="flex items-center gap-2">
                                <Badge variant="success" className="text-[10px] px-1.5 py-0">
                                    Communicated
                                </Badge>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(action.updated_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
