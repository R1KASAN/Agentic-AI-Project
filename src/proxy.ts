import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { createClient } from "@supabase/supabase-js";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth/callback", "/qr"];

// Role -> default home page mapping
const ROLE_HOME: Record<string, string> = {
    student: "/student/classes",
    teacher: "/teacher",
};

// Role -> allowed path prefixes
const ROLE_ROUTES: Record<string, string[]> = {
    student: ["/student"],
    teacher: ["/teacher"],
};

function normalizeRole(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    return ROLE_HOME[value] ? value : null;
}

async function resolveRole(userId: string, jwtRoleValue: unknown) {
    const jwtRole = normalizeRole(jwtRoleValue);
    if (jwtRole) {
        return {
            role: jwtRole,
            jwtRole,
            dbRole: null,
        };
    }

    const dbRole = normalizeRole(await getUserRole(userId));
    return {
        role: dbRole,
        jwtRole: null,
        dbRole,
    };
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    const { user, supabaseResponse, authError, hasAuthCookies } =
        await updateSession(request);

    if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
        if (user) {
            const { role } = await resolveRole(user.id, user.user_metadata?.role);
            if (role && ROLE_HOME[role]) {
                return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
            }
        }
        return supabaseResponse;
    }

    if (!user) {
        if (authError && hasAuthCookies) {
            supabaseResponse.headers.set("x-auth-refresh-status", "degraded");
            return supabaseResponse;
        }

        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    const { role } = await resolveRole(user.id, user.user_metadata?.role);

    if (!role) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname === "/") {
        return NextResponse.redirect(new URL(ROLE_HOME[role] || "/login", request.url));
    }

    const allowedPrefixes = ROLE_ROUTES[role] || [];
    const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

    if (!isAllowed) {
        console.warn(
            `[proxy] Blocking ${pathname} for role="${role}" (allowed: ${allowedPrefixes.join(", ")}). Redirecting to ${ROLE_HOME[role]}`
        );

        return NextResponse.redirect(
            new URL(ROLE_HOME[role] || "/login", request.url)
        );
    }

    return supabaseResponse;
}

async function getUserRole(userId: string): Promise<string | null> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
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
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
