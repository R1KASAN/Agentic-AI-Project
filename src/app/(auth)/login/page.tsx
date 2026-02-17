"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CloudSun, Shield, Clock, Heart } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const supabase = createClient();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setIsLoading(false);
            return;
        }

        // Middleware handles redirect to role-specific home
        window.location.href = "/";
    }

    async function handleMagicLink(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage("Check your email for a login link!");
        }
        setIsLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 px-4">
            <div className="w-full max-w-md space-y-8">
                {/* Logo & Tagline */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                        <CloudSun className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Climate Agent
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        How's your classroom feeling today?
                    </p>
                </div>

                {/* Login Card */}
                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl">Welcome Back</CardTitle>
                        <CardDescription>
                            Sign in to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@school.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium text-foreground"
                                >
                                    Password
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-destructive bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                                    {message}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md"
                                disabled={isLoading}
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">
                                        or
                                    </span>
                                </div>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleMagicLink}
                                disabled={isLoading || !email}
                            >
                                Send Magic Link
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Trust Signals */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm">
                        <Shield className="w-4 h-4 text-indigo-500" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                            Privacy First
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm">
                        <Clock className="w-4 h-4 text-sky-500" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                            20s Check-in
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span className="text-[11px] text-muted-foreground font-medium">
                            Student Voice
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
