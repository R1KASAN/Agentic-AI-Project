import Link from "next/link";
import { CloudSun, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 px-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 shadow-lg">
                    <Search className="w-10 h-10 text-slate-500 dark:text-slate-400" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-6xl font-bold text-foreground">404</h1>
                    <h2 className="text-xl font-semibold text-foreground">
                        Page Not Found
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                    <Link href="/">
                        <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white">
                            <ArrowLeft className="w-4 h-4" />
                            Go Home
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
