import Link from "next/link";
import { CloudSun, ArrowLeft, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-slate-50 dark:from-red-950/30 dark:via-slate-900 dark:to-slate-950 px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-200 to-red-300 dark:from-red-800 dark:to-red-700 shadow-lg">
                    <ShieldOff className="w-10 h-10 text-red-600 dark:text-red-300" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-6xl font-bold text-foreground">403</h1>
                    <h2 className="text-xl font-semibold text-foreground">
                        Access Denied
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        You don't have permission to view this page. You'll be redirected to
                        your dashboard.
                    </p>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                    <Link href="/">
                        <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white">
                            <ArrowLeft className="w-4 h-4" />
                            Go to Dashboard
                        </Button>
                    </Link>
                </div>

                <div className="flex items-center justify-center gap-2 pt-4 text-muted-foreground/50">
                    <CloudSun className="w-4 h-4" />
                    <span className="text-xs">Climate Agent</span>
                </div>
            </div>
        </div>
    );
}
