# N8N Workflows & Payload Contracts

This defines the expected webhooks and database triggers interacting with N8N.

## 1. Weekly AI Recommendation Generator
**Trigger**: Cron (Every Monday 06:00)
**AI Model**: Gemini 2.0 Flash via Google AI Studio API (`googlePalmApi` credential in N8N, `lmChatGoogleGemini` node)

> Selected for: Constitution §V compliance, free tier availability for school pilots,
> native N8N node support, and faster response times vs GPT-4o.

**Data Fetched**:
- Supabase RPC: `get_class_climate_summary(class_id, 4)`
**N8N Output to Supabase**:
```json
{
  "class_id": "uuid",
  "content": "Consider allocating 10 minutes at the start of class for a quick review.",
  "priority": "medium",
  "category": "academic",
  "status": "pending",
  "ai_generated": true,
  "ai_model": "gemini-2.0-flash",
  "raw_climate_snapshot": { /* JSON aggregated data */ }
}
```
**N8N Output to Next.js Webhook**:
```json
{
  "event": "recommendations_generated",
  "summary": { "total_classes": 12, "flagged_count": 3 }
}
```

## 2. Weekly Teacher Email Summary
**Trigger**: Cron (Every Monday 07:00)
**Data Fetched**:
- Supabase: Pending recommendations & `classes`
**Output**: Email via SendGrid/SMTP.

## 3. Loop Closure Notification
**Trigger**: Supabase DB Webhook (ON UPDATE `recommendations` WHERE `status='approved'`)
**N8N Output to Supabase**:
```json
{
  "user_id": "student_uuid",
  "type": "loop_closure",
  "message": "ครูตอบสนอง feedback ของห้องคุณแล้ว",
  "class_id": "uuid"
}
```
**N8N Output to Next.js Webhook**:
```json
{
  "event": "loop_closure_communicated",
  "class_id": "uuid"
}
```

## 4. Student Reminder
**Trigger**: Cron (Every Friday 15:00)
**Data Fetched**: Classes where check-in rate < 50%.
**Output**: Email / LINE Notify.

> ✅ **I3 Verified 2026-02-21**: `friday-student-reminder.json` triggers
> Friday (weekday=5) at 15:00. Master poller routes reminder via DB-driven
> `shouldRun()` function — no hardcoded day drift. No changes needed.

## 5. Health Score & Churn Alert
**Trigger**: Cron (Every Sunday 09:00)
**Logic**: 
`score = (checkin_rate * 0.4) + (loop_closure_rate * 0.4) + (teacher_active * 0.2)`
**N8N Output to Internal Team**: Slack JSON alert.
**N8N Output to Supabase**: Update `schools` table `health_score`.
