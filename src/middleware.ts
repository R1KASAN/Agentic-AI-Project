import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

// Role → default home page mapping
const ROLE_HOME: Record<string, string> = {
    student: "/student/check-in",
    teacher: "/teacher",
    admin: "/admin/metrics",
};

// Role → allowed path prefixes
const ROLE_ROUTES: Record<string, string[]> = {
    student: ["/student"],
    teacher: ["/teacher"],
    admin: ["/admin"],
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
            const role = await getUserRole(request, user.id);
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
    const role = await getUserRole(request, user.id);

    if (!role) {
        // User exists in auth but no profile yet — redirect to login
        return NextResponse.redirect(new URL("/login", request.url));
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
        // Redirect unauthorized users to their own home
        return NextResponse.redirect(
            new URL(ROLE_HOME[role] || "/login", request.url)
        );
    }

    return supabaseResponse;
}

/**
 * Fetch the user's role from the public.users table.
 * Uses a service-level client to bypass RLS for the role check.
 */
async function getUserRole(
    request: NextRequest,
    userId: string
): Promise<string | null> {
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll() {
                    // Middleware can't set cookies directly in this helper
                },
            },
        }
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
