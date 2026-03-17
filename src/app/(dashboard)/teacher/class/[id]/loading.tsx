import { Card, CardContent } from "@/components/ui/card";

export default function ClassDetailLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header skeleton */}
            <div className="space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-8 w-64 bg-muted rounded" />
                <div className="h-4 w-40 bg-muted rounded" />
            </div>

            {/* Metric cards skeleton */}
            <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-4 space-y-2">
                            <div className="h-3 w-20 bg-muted rounded" />
                            <div className="h-8 w-16 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recommendations skeleton */}
            <div className="space-y-3">
                <div className="h-6 w-40 bg-muted rounded" />
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-4">
                            <div className="h-4 w-full bg-muted rounded mb-2" />
                            <div className="h-4 w-3/4 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
