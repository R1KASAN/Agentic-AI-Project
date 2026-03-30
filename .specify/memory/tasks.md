<!-- updated: 2026-03-19 -->
# Tasks: Climate Agent

### DONE
- [x] Fix Check School Day: `weekday()` → `toFormat('c').toNumber()`
- [x] Fix `$env`: `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
- [x] Fix date format: `format('YYYY-MM-DD')` → `toFormat('yyyy-MM-dd')`
- [x] Replace LINE Notify → Resend Email (all alert nodes)
- [x] Fix RPC: `get_teacher_response_rate` → `get_teacher_metrics`
- [x] Create Supabase Service Role credential (Header Auth)
- [x] Apply credential to all 7 Supabase HTTP nodes
- [x] Remove hardcoded JWT keys from node parameters

### IN PROGRESS
- [ ]~ Fix canvas: remove Validate n≥3 → Insert Audit Log edge
- [ ]~ Fix Insert Audit Log body (remove broken node references)
- [ ]~ Full E2E test: mock avg_mood=2.3 CRITICAL path

### PLANNED
- [ ] Activate `climate-agent-main` schedule trigger
- [ ] Submit real student check-in → test live trigger
- [ ] W07 Mood Alert threshold workflow
- [ ] Custom email domain (replace onboarding@resend.dev)
- [ ] Teacher feedback loop button ("ทำตามคำแนะนำแล้ว")
- [ ] Load test 100+ teachers
