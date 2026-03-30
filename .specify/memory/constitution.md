<!-- updated: 2026-03-19 -->
# Climate Agent Constitution (v2.1)
<!-- Governance for the Climate Agent autonomous agentic system -->

> **System Identity**: Climate Agent is an **autonomous AI agent**—not a dashboard or reporting tool. "ให้ครูเข้าใจบรรยากาศอารมณ์ห้องเรียนก่อนเริ่มสอน โดยที่ครูไม่ต้องทำอะไรเพิ่มเติม"

## Core Identity & Authority
**Agent Name**: Climate Agent  
**Primary Goal**: Maintain & elevate classroom climate via daily autonomous sensing + proactive advisor briefings.  
**Decision Authority**: Agent autonomously decides *when* to notify and *what policy* to apply. Teacher retains authority over classroom response.  
**Not a Dashboard Tool**: Proactively delivers analysis so teachers can focus on teaching. 

## User Roles (ADR-02)
- **Teacher**: Access to dashboard, classes, AI recommendations, email alerts.
- **Student**: Access to check-in (emoji mood picker), personal feedback, join class, privacy settings.
- ❌ **Admin**: REMOVED.

## Core Principles
1. **10-Second Rule**: Check-ins must be frictionless.
2. **Zero Learning Curve**: AI works for the teacher, interpreting data and bringing insights directly via email.
3. **Psychological Safety**: Non-judgmental, purely supportive interface.
4. **Mobile First**: Especially for student interfaces and QR check-ins.
5. **AI Works for Teacher**: Minimum cognitive load on the educators.

## Privacy Constitution
- **k-anonymity (n≥3)**: Non-negotiable. Enforced at the Supabase RPC level (ADR-06).
- **No Individual Data**: No individual student data in logs or messages.
- **QR Check-in**: Strictly anonymous session only, no student ID stored (ADR-07).

## Agentic Loop (5-Step)
1. **Sense**: Collect consented student mood data via fast QR or standard check-in.
2. **Reason**: Evaluate aggregate climate state → select policy (Routine / Warning / Critical) → generate insights.
3. **Act**: Send email notifications (Resend) and dashboard updates per policy + teacher approval.
4. **Learn**: Track teacher response (approve/dismiss rate, action rate).
5. **Adapt**: Adjust thresholds and inquiry modes base on long-term data.

## Inquiry Mode
- If teacher `dismissal_rate` > 60%, the agent MUST pivot to asking questions instead of giving recommendations.
- Agent will ask: "สังเกตว่าบรรยากาศห้องเรียนอาจมีบางอย่าง ครูคิดว่าอะไรทำให้นักเรียนรู้สึกแบบนี้คะ/ครับ?"

## Technical Constraints
- **Notification**: Resend Email ONLY (from onboarding@resend.dev). LINE Notify DEPRECATED (ADR-01).
- **Auth**: 2 roles only (Teacher, Student). Supabase JWT + metadata. Auth in n8n via "Supabase Service Role" header (ADR-04).
- **Expressions**: Luxon `toFormat()` ALWAYS (e.g., `$now.toFormat('yyyy-MM-dd')`, `$now.toFormat('c').toNumber()`). Never use Moment.js or `$now.format()` (ADR-05).
- **Secrets**: Use n8n Credentials only. Never hardcode JWT keys in node parameters (ADR-09). Access env vars with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` (ADR-03).
- **k-anonymity**: RPC-enforced only, not bypassed in the app level.

## Out of Scope (Frozen)
- Attendance / grading tracking.
- Individual student identity or behavioral profiling.
- Admin role functionalities.
- Multi-school orchestration (Target for Phase 3).

## Governance & Decisions (ADRs)
- **ADR-01**: LINE Notify → Resend Email
- **ADR-02**: Admin role removed (2 roles only)
- **ADR-03**: N8N_BLOCK_ENV_ACCESS_IN_NODE=false
- **ADR-04**: Supabase API auth via Header Auth Credential "Supabase Service Role"
- **ADR-05**: All dates use Luxon toFormat() / ISO / toNumber()
- **ADR-06**: k-anonymity (n≥3) enforced at RPC level
- **ADR-07**: QR check-in is anonymous session-based
- **ADR-08**: W06 renamed to climate-agent-main
- **ADR-09**: No hardcoded JWT secrets
