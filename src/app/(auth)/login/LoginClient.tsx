"use client";

import { useEffect, useState } from "react";
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
import { Shield, Clock, Heart } from "lucide-react";
import {
    APP_NAME,
    BrandMark,
} from "@/components/branding/ClassClimateAgentBrand";

const ROLE_HOME: Record<string, string> = {
    student: "/student/classes",
    teacher: "/teacher",
};

function getRoleHome(role: unknown) {
    if (typeof role !== "string") {
        return null;
    }

    return ROLE_HOME[role] ?? null;
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unable to sign in right now. Please try again.";
}

export default function LoginClient() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        async function hydrateMagicLinkSession() {
            const hash = window.location.hash.replace(/^#/, "");
            if (!hash.includes("access_token=")) {
                return;
            }

            const hashParams = new URLSearchParams(hash);
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const redirectTarget =
                new URLSearchParams(window.location.search).get("redirect") ||
                "/";

            if (!accessToken || !refreshToken) {
                return;
            }

            setIsLoading(true);
            setError(null);
            setMessage("Completing your sign-in link...");

            try {
                const supabase = createClient();
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (!isActive) {
                    return;
                }

                if (error) {
                    setError(error.message);
                    setIsLoading(false);
                    setMessage(null);
                    return;
                }

                window.history.replaceState(
                    {},
                    document.title,
                    `${window.location.pathname}${window.location.search}`
                );
                window.location.replace(redirectTarget);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                setError(getErrorMessage(error));
                setIsLoading(false);
                setMessage(null);
            }
        }

        void hydrateMagicLinkSession();

        return () => {
            isActive = false;
        };
    }, []);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const supabase = createClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                setIsLoading(false);
                return;
            }

            const redirectTarget =
                getRoleHome(data.user?.user_metadata?.role) ?? "/";
            setMessage(
                redirectTarget === "/"
                    ? "กำลังพาคุณไปยังหน้าหลัก..."
                    : "กำลังเปิดแดชบอร์ด..."
            );
            window.location.replace(redirectTarget);
        } catch (error) {
            setError(getErrorMessage(error));
            setIsLoading(false);
        }
    }

    async function handleMagicLink(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const supabase = createClient();

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
        } catch (error) {
            setError(getErrorMessage(error));
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-3">
                    <BrandMark
                        size="lg"
                        className="border-sky-200 bg-sky-100 text-blue-600"
                    />
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        {APP_NAME}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        How&apos;s your classroom feeling today?
                    </p>
                </div>

                <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-xl">Welcome Back</CardTitle>
                        <CardDescription>
                            Sign in to access your dashboard
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2" suppressHydrationWarning>
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
                            <div className="space-y-2" suppressHydrationWarning>
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
