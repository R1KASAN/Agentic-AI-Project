<!-- updated: 2026-03-19 -->
# Specify: Climate Agent v2.1

## Feature Matrix
| ID | Feature | Priority | Status |
|---|---|---|---|
| S-01 | Student 5-sec Emoji Check-in | P0 | ✅ |
| S-02 | Anonymous QR Check-in (`/qr/[classId]`) | P0 | ✅ |
| S-03 | Student Loop Closure Feedback | P1 | ✅ |
| S-04 | Join Class via Code | P1 | ✅ |
| S-05 | Privacy Settings & Info | P2 | ✅ |
| S-06 | Mobile-optimized views | P0 | ✅ |
| T-01 | Teacher Dashboard (Overview) | P0 | ✅ |
| T-02 | Class Grid & QR Generation Dialog | P0 | ✅ |
| T-03 | AI Recommendations List (Approve/Dismiss) | P0 | ✅ |
| T-04 | Class Specific Setup (Create/Edit) | P1 | ✅ |
| T-05 | Email Notifications via Resend | P0 | ✅ |
| T-06 | Inquiry mode for high dismissal instances | P1 | 🔲 |
| T-07 | Daily frequency checks | P1 | ✅ |
| T-08 | Teacher Dashboard specific elements | P1 | ✅ |
| T-09 | Export CSV/Reports | P2 | 🔲 |
| T-10 | Loop closure "ทำตามแล้ว" mark | P2 | 🔲 |
| SYS-01 | Supabase Auth (2 roles) | P0 | ✅ |
| SYS-02 | N8N `climate-agent-main` Workflow | P0 | 🔄 |
| SYS-03 | Supabase k-anonymity RPCs | P0 | ✅ |
| SYS-04 | Supabase N8N Audit Logging | P1 | ✅ |
| SYS-05 | Confidence-bound fallback engines | P2 | 🔲 |
| SYS-06 | Soft archive classes | P1 | ✅ |
| SYS-07 | E2E Tests | P1 | 🔄 |
| SYS-08 | Resend Mail config | P0 | ✅ |
| SYS-09 | Frequency Check Limits RPC | P0 | ✅ |
| SYS-10 | RLS recursion fixes | P0 | ✅ |
| SYS-11 | Admin removal & refactor | P0 | ✅ |
| SYS-12 | Luxon datetime standards in N8N | P0 | ✅ |

## Sitemap v2.1
- `/login`
- `/student/check-in` (emoji mood picker)
- `/student/feedback` (personal history)
- `/student/join` (invite code entry)
- `/student/privacy`
- `/teacher/` (dashboard mood overview)
- `/teacher/classes/` (class grid + QR dialog)
- `/teacher/class/new`
- `/teacher/class/[id]/` (mood chart + student count)
- `/teacher/class/[id]/settings` (edit / archive)
- `/teacher/recommendations` (AI recommendations list)
- `/qr/[classId]` (PUBLIC anonymous check-in)
- `/api/qr/[classId]` (POST anonymous mood submit)
- `/api/qr/[classId]/image` (GET QR PNG download)
- `/api/webhooks/` (n8n webhook receiver)

## QR Code Spec (Growth Feature)
- **/qr/[classId]**: PUBLIC, no auth required, anonymous POST access.
- **/api/qr/[classId]/image**: GET PNG, accessible by teacher only for projecting or printing.
- **Flow**: Teacher downloads code -> projects on board -> students scan -> tap emoji -> done in < 5 seconds.
- **Deduplication**: Session-based dedup; absolutely no student ID collected.
- **Privacy**: k-anonymity enforced; teacher sees data only after aggregate n≥3.

## N8N Workflow Spec (`climate-agent-main`)
- Handles morning briefings. See `specs/003-morning-briefing/spec.md` for full node breakdown.
- Uses Gemini 2.0 Flash (`langchain.agent`).
- Invokes sub-workflows to retrieve teacher metrics and past recommendations securely.
- Strict limits: max 2/day, 5/week.

## Email Notification Spec (Resend)
- **ROUTINE**: "🌤️ [Climate Agent] สภาพบรรยากาศห้องเรียนวันนี้"
- **WARNING**: "☁️ [Climate Agent] ⚠️ ควรให้ความสนใจห้องเรียน"
- **CRITICAL**: "🚨 URGENT [Climate Agent] บรรยากาศน่าเป็นห่วง"

## Safety Gates
- **School Day Check**: `toFormat('c').toNumber()` must be 1-5 (Mon-Fri).
- **k-anonymity**: Validate `n >= 3`.
- **Frequency Limits**: Max 2 notifications per day, 5 per week. Checks `check_frequency_limit` RPC.
- **Confidence Check**: < 0.65 → fallback to rule-based engine.

## Environment Variables
Expected to be provided in `.env.local`:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`, `EMAIL_TEACHER`, `EMAIL_ADMIN`
- `TOOL_GET_TEACHER_METRICS_ID`, `TOOL_GET_PAST_RECS_ID`
- `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
- ❌ `LINE_NOTIFY_TOKEN` (REMOVED)
