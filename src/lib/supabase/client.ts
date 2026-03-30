import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getPublicSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Configure these Vercel environment variables and redeploy."
        );
    }

    return { url, anonKey };
}

export function createClient() {
    if (!browserClient) {
        const { url, anonKey } = getPublicSupabaseConfig();
        browserClient = createBrowserClient(
            url,
            anonKey
        );
    }

    return browserClient;
}

export async function getSessionUser() {
    const supabase = createClient();
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        console.warn("[supabase-client] getSession failed:", error.message);
        return null satisfies User | null;
    }

    return session?.user ?? null;
}
