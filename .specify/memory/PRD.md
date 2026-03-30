<!-- updated: 2026-03-19 -->
# Product Requirements Document (PRD) v2.1

## Product Vision
Classroom Climate SaaS (EdTech). "ให้ครูเข้าใจบรรยากาศอารมณ์ห้องเรียนก่อนเริ่มสอน โดยที่ครูไม่ต้องทำอะไรเพิ่มเติม" 
Solve the lack of visibility into student emotional states without burdening educators, through an anonymous mood check-in and an AI-agent loop that translates data into actionable advice.

## Target Users
1. **Teacher**: Primary consumer of insights. Uses the dashboard to monitor class mood and receive proactive actionable recommendations.
2. **Student**: Primary data provider. Receives a friction-free check-in experience and benefits from an improved learning environment.

## Feature Requirements
- **S-01**: 5-second Emoji Check-in (P0)
- **S-02**: Anonymous QR check-in without login (P0)
- **S-03**: Loop Closure visible to students (P1)
- **S-04**: Invite codes for class joining (P1)
- **S-05**: Privacy disclosures (P2)
- **S-06**: Mobile-optimized views (P0)
- **T-01**: Teacher Dashboard with class-level Risk Badges (P0)
- **T-02**: Manage Classrooms view with Invite Code copy (P0)
- **T-03**: AI Recommendations tab (Status Tracking) (P0)
- **T-04**: Class management and context menu (P1)
- **T-05**: Email notifications for warnings/criticals (P0)
- **T-06**: Inquiry mode for high dismissal instances (P1)
- **T-07**: Daily frequency checks (P1)
- **SYS-01**: Dual-role Supabase Auth (Teacher/Student) (P0)
- **SYS-02**: N8N asynchronous workflow logic (`climate-agent-main`) (P0)
- **SYS-03**: Built-in k-anonymity (n≥3) via RPC (P0)
- **SYS-04**: Absolute audit logs recorded directly to Supabase via n8n (P1)
- **SYS-05**: Fallback rule-based engines on poor AI confidence (P2)
- **SYS-12**: Scale limits per class/day (P1)

## Sitemap v2.1
- `/login`
- `/student/check-in`
- `/student/feedback`
- `/student/join`
- `/student/privacy`
- `/teacher/dashboard` (ภาพรวมชั้นเรียน)
- `/teacher/classes` (จัดการห้องเรียน)
- `/teacher/recommendations` (ข้อเสนอแนะ)
- `/teacher/class/[id]/settings`
- **`/qr/[classId]` (Growth focus: PUBLIC anonymous check-in)**
- **`/api/qr/[classId]` (Growth focus: POST anonymous)**
- **`/api/qr/[classId]/image` (Growth focus: GET QR PNG)**
- `/api/webhooks/`

## QR Code as Growth Engine
- **Zero Friction**: The ultimate low-barrier entry point. Scan → Tap Emoji → Done within 5 seconds without installing any app or logging in.
- **Viral Loop**: QR code projected on the whiteboard → Students naturally see and engage → Teachers boast about insights → Other teachers request access.
- **PDPA Safe**: Strictly session-based with full anonymity. No mapping back to individual student ID prevents any privacy breaches.
- **Upgrade Path**: Free tier gets static QR → Pro gets Dynamic QR → School License gets live projector mode with real-time animated mood bars floating on screen.

## N8N Workflow Map
- Main Driver: `climate-agent-main` (Morning Briefings & Actions)
- Sub tool: `Get Teacher Metrics` (3FdK3o7eBUjd56aT)
- Sub tool: `Get Past Recommendations` (mDagGr7MWDHFEhES)
- Auxiliary: W02 Loop Closure Notification, W05 Weekly Teacher Email.

## Business Model
- **FREE**: 1 teacher, unlimited classes, morning email briefings, static QR codes.
- **PRO (฿299/mo/teacher)**: PDF reports, CSV generic export, historical trend insights, and dynamic QR.
- **SCHOOL (฿2,900/mo)**: Unlimited teachers within the campus, aggregated multi-class view, internal API access.

## Go-To-Market
- Reach directly via **Facebook กลุ่มครู** (3M+ active members combined).
- Showcases at **EDUCA Conference**.
- Align with **SEL (Social-Emotional Learning)** policies gaining traction at OBEC (สพฐ.).

## Infrastructure & Credentials
| Service | Environment / Value |
|---------|---------------------|
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` |
| AI | `GEMINI_API_KEY` |
| EMail | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TEACHER`, `EMAIL_ADMIN` |
| Sub-workflows | `TOOL_GET_TEACHER_METRICS_ID`, `TOOL_GET_PAST_RECS_ID` |
| N8N Env | `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` |

## Roadmap
- **Phase 1 (MVP)** ✅: 2 Roles, core dashboard, Supabase Auth, Basic check-ins, k-anonymity.
- **Phase 2 (Growth)** 🔄: Refined n8n Agent (`climate-agent-main`), Email integrations, QR Code endpoints, Analytics enhancements.
- **Phase 3 (Scale)** 🔲: Multi-tenant School capabilities, Teacher feedback features, Pro/School enterprise tiers.
