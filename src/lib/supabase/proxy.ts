import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_REFRESH_TIMEOUT_MS = 2500;

type SessionUpdateResult = {
    user: User | null;
    supabaseResponse: NextResponse;
    authError: boolean;
    hasAuthCookies: boolean;
};

function applyNoStore(response: NextResponse) {
    response.headers.set("Cache-Control", "private, no-store");
}

function hasSupabaseAuthCookies(request: NextRequest) {
    return request.cookies.getAll().some(({ name }) => name.startsWith("sb-"));
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "";
}

function shouldClearAuthCookies(error: unknown) {
    const message = getErrorMessage(error).toLowerCase();

    return (
        message.includes("refresh token") ||
        message.includes("invalid jwt") ||
        message.includes("jwt expired") ||
        message.includes("session not found") ||
        message.includes("session from session_id claim")
    );
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
    request.cookies
        .getAll()
        .filter(({ name }) => name.startsWith("sb-"))
        .forEach(({ name }) => {
            request.cookies.delete(name);
            response.cookies.delete(name);
        });
}

async function getUserWithTimeout(
    supabase: SupabaseClient,
    timeoutMs: number
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            supabase.auth
                .getUser()
                .then(({ data, error }) => ({
                    user: data.user,
                    error,
                    timedOut: false,
                }))
                .catch((error: unknown) => ({
                    user: null,
                    error,
                    timedOut: false,
                })),
            new Promise<{
                user: null;
                error: Error;
                timedOut: true;
            }>((resolve) => {
                timeoutId = setTimeout(() => {
                    resolve({
                        user: null,
                        error: new Error(
                            `Supabase auth refresh timed out after ${timeoutMs}ms`
                        ),
                        timedOut: true,
                    });
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

export async function updateSession(
    request: NextRequest
): Promise<SessionUpdateResult> {
    let supabaseResponse = NextResponse.next({
        request,
    });

    applyNoStore(supabaseResponse);

    const hasAuthCookiesValue = hasSupabaseAuthCookies(request);
    if (!hasAuthCookiesValue) {
        return {
            user: null,
            supabaseResponse,
            authError: false,
            hasAuthCookies: false,
        };
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    applyNoStore(supabaseResponse);
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const result = await getUserWithTimeout(
        supabase,
        AUTH_REFRESH_TIMEOUT_MS
    );

    if (result.error) {
        const errorMessage = getErrorMessage(result.error);

        console.warn(
            `[proxy] Supabase session refresh failed${
                result.timedOut ? " (timeout)" : ""
            }: ${errorMessage || "unknown error"}`
        );

        if (shouldClearAuthCookies(result.error)) {
            clearSupabaseAuthCookies(request, supabaseResponse);
        }

        return {
            user: null,
            supabaseResponse,
            authError: true,
            hasAuthCookies: true,
        };
    }

    return {
        user: result.user,
        supabaseResponse,
        authError: false,
        hasAuthCookies: true,
    };
}
