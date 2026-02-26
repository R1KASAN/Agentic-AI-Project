import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// ── N8N Webhook Receiver ─────────────────────────────────────
// All N8N workflows POST events here after completing their work.
// Validates Bearer token, handles events, triggers cache revalidation.
//
// Events:
//   recommendations_generated  → W01 Agentic AI
//   loop_closure_communicated  → W02 Loop Closure
//   student_reminder_sent      → W05 Friday Reminder
//   health_score_updated       → W06 Sunday Health Score
//   settings_updated           → Admin settings change

const VALID_EVENTS = [
    'recommendations_generated',
    'loop_closure_communicated',
    'student_reminder_sent',
    'health_score_updated',
    'settings_updated',
] as const;

export async function POST(request: Request) {
    // ── Auth guard ───────────────────────────────────────────
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
    if (!expectedSecret) {
        console.error('[n8n/webhook] N8N_WEBHOOK_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse & validate ─────────────────────────────────────
    try {
        const body = await request.json();
        const event = body.event as string;

        console.log(`[n8n/webhook] event=${event}`, JSON.stringify(body));

        // ── Route events ─────────────────────────────────────
        switch (event) {
            case 'recommendations_generated':
                revalidatePath('/teacher');
                revalidatePath('/teacher/actions');
                break;

            case 'loop_closure_communicated':
                revalidatePath('/student/feedback');
                break;

            case 'student_reminder_sent':
                // Acknowledge only — notifications already in DB
                break;

            case 'health_score_updated':
                revalidatePath('/admin/metrics');
                break;

            case 'settings_updated':
                revalidatePath('/admin/settings');
                revalidatePath('/admin/metrics');
                console.log('Schedule settings updated for school:', body.school_id);
                break;

            default:
                return NextResponse.json(
                    { error: `Unknown event: ${event}`, valid_events: VALID_EVENTS },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            ok: true,
            event,
            received_at: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
}
