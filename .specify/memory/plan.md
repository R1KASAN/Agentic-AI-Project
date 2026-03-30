<!-- updated: 2026-03-19 -->
# Implementation Plan: Climate Agent

## Phase 1 ✅ Complete
- Removed Admin Role completely, leaving 2 roles (Teacher, Student).
- Setup Next.js 15, UI libraries (shadcn/ui), and Supabase integration.
- Developed the Student check-in flow with 5-second emoji picker.
- Implemented `/qr/[classId]` for public anonymous check-ins.
- Delivered Teacher Dashboard with overview and AI recommendations.
- Set up core Supabase tables and RLS (e.g. `qr_checkins` insert only).
- Enforced k-anonymity at the RPC level (`get_aggregated_climate_data`).

## Phase 2 🔄 In Progress
- ✅ `climate-agent-main` fixes applied (Luxon `toFormat('c')`, `$env` access, updated date strings, and Supabase Header Auth credentials).
- 🔄 Fix N8N Canvas connection: Removing Validate n≥3 → Insert Audit Log error edge.
- 🔄 Complete full E2E test covering the simulated average mood path.
- 🔲 Activate `climate-agent-main` schedule trigger.
- 🔲 Build `W07 Mood Alert` threshold workflow.

## Phase 3 🔲 Planned
- Weekly PDF reports & CSV export features.
- Re-introduce LINE OA option for notifications as a premium alternative.
- Multi-school orchestration and capabilities.
- QR live projector mode (animated mood bars in real-time).
- Teacher feedback loop ("ทำตามแล้ว" / "Implemented" button on AI recommendations).

## Risks + Mitigations
- **URL Instability**: ngrok URL changes frequently → Mitigate by using a static domain or self-hosted tunnel for n8n.
- **Email Limits**: Resend free tier has a 100 emails/day limit → Mitigate by monitoring usage carefully or upgrading plan.
- **Teacher Adoption**: Single teacher testing is a single point of failure → Mitigate by running pilots in at least 3 schools before general scale-up.
