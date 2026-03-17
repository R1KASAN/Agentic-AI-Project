import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@supabase/supabase-js";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/qr"];

// Role → default home page mapping
const ROLE_HOME: Record<string, string> = {
    student: "/student/check-in",
    teacher: "/teacher",
};

// Role → allowed path prefixes
const ROLE_ROUTES: Record<string, string[]> = {
    student: ["/student"],
    teacher: ["/teacher"],
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for static files and API routes
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Refresh session (Supabase SSR requirement)
    const { user, supabaseResponse } = await updateSession(request);

    // --- PUBLIC ROUTES ---
    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        // If already logged in, redirect to role home
        if (user) {
            const role = (user.user_metadata?.role as string) || await getUserRole(request, user.id);
            if (role && ROLE_HOME[role]) {
                return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
            }
        }
        return supabaseResponse;
    }

    // --- AUTH GUARD ---
    if (!user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // --- ROLE GUARD ---
    // Use JWT metadata role as primary source (same as DashboardLayout).
    // Falls back to DB role if JWT metadata is missing.
    const jwtRole = (user.user_metadata?.role as string) || null;
    const dbRole = await getUserRole(request, user.id);

    const role = jwtRole || dbRole;

    if (!role) {
        // User exists in auth but no profile yet — redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
    }

    // Log role mismatch for debugging (remove once resolved)
    if (dbRole && jwtRole && dbRole !== jwtRole) {
        console.warn(
            `[middleware] Role mismatch for user ${user.id}: JWT="${jwtRole}" DB="${dbRole}" — using JWT role "${role}". Path: ${pathname}`
        );
    }

    // Root "/" → redirect to role home
    if (pathname === "/") {
        return NextResponse.redirect(new URL(ROLE_HOME[role] || "/login", request.url));
    }

    // Check if the current path is allowed for this role
    const allowedPrefixes = ROLE_ROUTES[role] || [];
    const isAllowed = allowedPrefixes.some((prefix) =>
        pathname.startsWith(prefix)
    );

    if (!isAllowed) {
        // Log the redirect for debugging
        console.warn(
            `[middleware] Blocking ${pathname} for role="${role}" (allowed: ${allowedPrefixes.join(", ")}). Redirecting to ${ROLE_HOME[role]}`
        );
        // Redirect unauthorized users to their own home
        return NextResponse.redirect(
            new URL(ROLE_HOME[role] || "/login", request.url)
        );
    }

    return supabaseResponse;
}

/**
 * Fetch the user's role from the public.users table.
 * Uses createClient (not createServerClient) with SERVICE_ROLE_KEY
 * to fully bypass RLS. createServerClient from @supabase/ssr uses
 * cookie-based auth context that doesn't honor service_role bypass.
 */
async function getUserRole(
    _request: NextRequest,
    userId: string
): Promise<string | null> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

    return data?.role || null;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
