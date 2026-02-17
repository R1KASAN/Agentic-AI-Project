import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherRecommendationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
                <p className="text-muted-foreground mt-1">
                    AI-suggested actions based on student climate data.
                </p>
            </div>

            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <MessageSquare className="w-5 h-5 text-sky-500" />
                        Action Items
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Recommendations will be implemented in Phase 6 (T027-T031).
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
