import { NextResponse } from 'next/server';

/**
 * Admin Alerts Webhook
 *
 * n8n sends critical alerts (HIGH risk + confidence ≥ 0.7) here.
 *
 * Expected request:
 *   POST /api/admin/alerts
 *   Header: X-Webhook-Secret: <ADMIN_WEBHOOK_SECRET>
 *   Body: {
 *     class_id: string
 *     teacher_id: string
 *     risk_score: number (0-1)
 *     confidence: number (0-1)
 *     alert_type: 'high_disengagement' | 'mood_shift' | 'peer_conflict' | 'attendance'
 *     message: string
 *     timestamp: ISO8601 string
 *   }
 */

export async function POST(request: Request) {
    // ── Validate X-Webhook-Secret header ────────────────────
    const expectedSecret = process.env.ADMIN_WEBHOOK_SECRET;

    if (!expectedSecret) {
        console.error('[admin/alerts] ADMIN_WEBHOOK_SECRET not configured');
        return NextResponse.json(
            { error: 'Server misconfigured' },
            { status: 500 }
        );
    }

    const headerSecret = request.headers.get('X-Webhook-Secret');

    if (headerSecret !== expectedSecret) {
        console.warn(
            '[admin/alerts] Invalid webhook secret. Expected:',
            expectedSecret.slice(0, 8) + '...',
            'Got:',
            (headerSecret?.slice(0, 8) ?? 'none') + '...'
        );
        return NextResponse.json(
            { error: 'Unauthorized: invalid X-Webhook-Secret' },
            { status: 401 }
        );
    }

    // ── Parse & validate alert payload ──────────────────────
    try {
        const body = await request.json();

        const {
            class_id,
            teacher_id,
            risk_score,
            confidence,
            alert_type,
            message,
            timestamp,
        } = body;

        // Basic validation
        if (
            !class_id ||
            !teacher_id ||
            typeof risk_score !== 'number' ||
            typeof confidence !== 'number' ||
            !alert_type ||
            !message
        ) {
            return NextResponse.json(
                {
                    error: 'Invalid payload. Required: class_id, teacher_id, risk_score, confidence, alert_type, message',
                },
                { status: 400 }
            );
        }

        const receivedAt = new Date().toISOString();

        console.log('[admin/alerts] CRITICAL ALERT RECEIVED', {
            class_id,
            teacher_id,
            alert_type,
            risk_score,
            confidence,
            message,
            received_at: receivedAt,
        });

        // ── TODO: Store alert in Supabase ──────────────────
        // const { data, error } = await adminClient
        //   .from('admin_alerts')
        //   .insert({
        //     class_id,
        //     teacher_id,
        //     risk_score,
        //     confidence,
        //     alert_type,
        //     message,
        //     alert_timestamp: timestamp,
        //     received_at: receivedAt,
        //   });

        // ── TODO: Send Email/Slack to teacher ──────────────
        // await sendCriticalAlertEmail(teacher_id, message);
        // await sendCriticalAlertSlack(class_id, message);

        return NextResponse.json(
            {
                ok: true,
                alert_type,
                received_at: receivedAt,
                message: 'Alert received and will be processed',
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('[admin/alerts] Error parsing alert:', error);
        return NextResponse.json(
            { error: 'Invalid JSON payload' },
            { status: 400 }
        );
    }
}

// ── GET (optional) ──────────────────────────────────────────
// Useful for health checks from n8n before sending alerts
export async function GET(request: Request) {
    const headerSecret = request.headers.get('X-Webhook-Secret');
    const expectedSecret = process.env.ADMIN_WEBHOOK_SECRET;

    if (!expectedSecret) {
        return NextResponse.json(
            { status: 'misconfigured' },
            { status: 500 }
        );
    }

    if (headerSecret !== expectedSecret) {
        return NextResponse.json(
            { status: 'unauthorized' },
            { status: 401 }
        );
    }

    return NextResponse.json({
        status: 'ok',
        endpoint: '/api/admin/alerts',
        method: 'POST',
        requires_header: 'X-Webhook-Secret',
        checked_at: new Date().toISOString(),
    });
}
