import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/alerts
 *
 * Receives admin alert payloads from n8n workflows.
 * Secured via a shared secret in the X-Webhook-Secret header.
 * Set the env var ADMIN_WEBHOOK_SECRET to a random string and
 * configure the same value in your n8n HTTP Request node headers.
 */
export async function POST(request: NextRequest) {
    try {
        // ── Auth: verify shared secret ──────────────────────────────────
        const webhookSecret = process.env.ADMIN_WEBHOOK_SECRET;
        if (webhookSecret) {
            const incomingSecret = request.headers.get("x-webhook-secret");
            if (incomingSecret !== webhookSecret) {
                console.warn("[admin/alerts] Rejected request – invalid secret");
                return NextResponse.json(
                    { error: "Unauthorized" },
                    { status: 401 }
                );
            }
        }

        // ── Parse body ──────────────────────────────────────────────────
        const payload = await request.json();

        // ── Log the incoming alert ──────────────────────────────────────
        console.log("[admin/alerts] Received alert payload:", JSON.stringify(payload, null, 2));

        // ── Optional: persist to Supabase action_logs ───────────────────
        // Uncomment and adapt if you want database persistence:
        //
        // const supabase = await createClient();
        // await supabase.from("action_logs").insert({
        //     actor_id: null,
        //     action_type: payload.alert_type ?? "n8n_alert",
        //     target_type: payload.target_type ?? "system",
        //     target_id: payload.target_id ?? null,
        // });

        return NextResponse.json(
            { received: true, timestamp: new Date().toISOString() },
            { status: 200 }
        );
    } catch (error) {
        console.error("[admin/alerts] Handler error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
