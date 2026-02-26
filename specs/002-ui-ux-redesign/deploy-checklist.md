# Deploy Checklist: 002-ui-ux-redesign

**Purpose**: Final production deploy gate — human-executed verification
**Created**: 2026-02-21
**Audit**: speckit.analyze v3 → 🟢 DEPLOY APPROVED (0C/0H/0M/0L)
**Feature**: Climate Agent UI/UX Redesign + N8N Automation

---

## 🔐 BLOCK 1: Database & Security

> Run in Supabase SQL Editor against production project.

- [ ] CHK001 — All 11 migrations applied without gaps [Completeness]
  ```sql
  SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
  ```
  **Expected**: 001 → 011 all present

- [ ] CHK002 — RLS: teacher JWT cannot read optional_text [Security, Migration 008]
  ```sql
  -- Switch to teacher-role JWT in Auth header
  SELECT optional_text FROM student_pulses LIMIT 5;
  ```
  **Expected**: 0 rows OR permission denied

- [ ] CHK003 — RLS: service_role CAN read student_pulses [Security, Migration 008]
  ```sql
  -- Switch to service_role key
  SELECT COUNT(*) FROM student_pulses;
  ```
  **Expected**: Returns count (not denied)

- [ ] CHK004 — pg_cron retention job active [Privacy, Migration 010]
  ```sql
  SELECT job_name, schedule, active
  FROM cron.job WHERE job_name = 'purge-optional-text-60d';
  ```
  **Expected**: 1 row, `active = true`, `schedule = '0 2 * * *'`

- [ ] CHK005 — Mood CHECK constraint exists [Schema, Migration 009]
  ```sql
  SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'student_pulses'::regclass AND contype = 'c';
  ```
  **Expected**: `mood_valid_enum` constraint with values `very_low|low|okay|good|great`

- [ ] CHK006 — No orphaned writes to deprecated check_ins table [Data Integrity]
  ```sql
  SELECT COUNT(*) FROM check_ins WHERE created_at > now() - interval '7 days';
  ```
  **Expected**: 0 new rows

---

## 🤖 BLOCK 2: N8N & LLM

> Verify in N8N Dashboard + environment config.

- [ ] CHK007 — `GEMINI_API_KEY` set in `.env.local` (local) AND Vercel project settings (prod) [Config]
  **Expected**: `AIza...` present, NOT committed to git

- [ ] CHK008 — N8N credential configured [N8N]
  N8N UI → Credentials → Search "Google Gemini"
  **Expected**: "Google Gemini account" credential exists and valid

- [ ] CHK009 — AI Recommendation workflow using Gemini [Constitution §V]
  N8N → Workflows → "Weekly AI Recommendation Generator" → Open AI node
  **Expected**: Node = `Google Gemini Chat Model`, type = `lmChatGoogleGemini`, Status = ACTIVE

- [ ] CHK010 — Zero OpenAI references in codebase [Constitution §V]
  ```bash
  grep -r "openAiApi\|gpt-4o\|OPENAI_API_KEY" src/ n8n/
  ```
  **Expected**: No results

- [ ] CHK011 — Friday student reminder active [N8N, I3]
  N8N → Workflows → "Friday Student Reminder"
  **Expected**: ACTIVE, Trigger = Friday (weekday 5), Hour = 15:00

---

## 🧪 BLOCK 3: Automated Tests

> Run locally against preview deployment.

- [ ] CHK012 — Unit tests pass [Testing]
  ```bash
  npm test
  ```
  **Expected**: All tests pass, 0 failures

- [ ] CHK013 — E2E tests pass against preview URL [Testing, SC-001]
  ```bash
  TEST_BASE_URL=https://[vercel-preview-url] npm run test:e2e
  ```
  **Expected**: All Playwright tests pass, check-in < 20 seconds

- [ ] CHK014 — Coverage baseline recorded [Testing]
  ```bash
  npm run test:coverage
  ```
  **Record**: Coverage % = _______ (baseline for future sprints)

- [ ] CHK015 — Zero TypeScript errors [Build]
  ```bash
  npx tsc --noEmit
  ```
  **Expected**: 0 errors, 0 warnings

- [ ] CHK016 — Zero broken imports [Code Hygiene]
  ```bash
  grep -rn 'from.*(student)/\|from.*(teacher)/' src/
  ```
  **Expected**: No results

---

## 📱 BLOCK 4: Manual Browser Verification

> Test on mobile viewport (390px) and desktop.

### Student Check-In Flow
- [ ] CHK017 — Navigate to `/student/check-in`, Thai title visible: "เช็คอินรายวัน" [I2]
- [ ] CHK018 — English subtitle visible below Thai text [I2, Constitution §IV]
- [ ] CHK019 — Mood emoji options render correctly, submit → success page [FR-001]
- [ ] CHK020 — Success message bilingual: "บันทึกแล้ว ขอบคุณ! 🎉 / Saved, thank you!" [I2]
- [ ] CHK021 — Total check-in flow time < 20 seconds [SC-001]

### Teacher Dashboard (no classes state)
- [ ] CHK022 — Navigate to `/teacher`, Thai empty state visible [I2]
- [ ] CHK023 — "ยังไม่มีห้องเรียน — รอ Admin กำหนด" + English below [I2]

### Student Feedback Page
- [ ] CHK024 — TrendChart section renders ABOVE loop-closure feed [G2, FR-007]
- [ ] CHK025 — If < 3 students: bilingual empty state shown [G2, k-anonymity]
- [ ] CHK026 — If data exists: 3 lines (mood/pace/fairness) render correctly [G2]
- [ ] CHK027 — Loop-closure `ActionList` still visible below chart [G2]

### Privacy Page
- [ ] CHK028 — Navigate to `/student/privacy` (under `(dashboard)/`) [D2-R1]
- [ ] CHK029 — Bilingual 60-day retention message visible, `RETENTION_DAYS=60` [C4]

### AI Draft Approval (teacher role)
- [ ] CHK030 — AI draft shows Approve / Edit / Dismiss buttons [FR-005]
- [ ] CHK031 — `updateRecommendationStatus` action works after D2-R1 fix [D2-R1]

---

## 🧹 BLOCK 5: Codebase Cleanliness

- [ ] CHK032 — `src/app/(student)/` directory does NOT exist [D2-R1]
- [ ] CHK033 — `src/app/(teacher)/` directory does NOT exist [D2-R1]
- [ ] CHK034 — `src/components/student/student-pulse-form.tsx` does NOT exist [C3]
- [ ] CHK035 — `.env.local` is in `.gitignore` [Security]
- [ ] CHK036 — No API keys in any committed file [Security]
  ```bash
  git log -p --all -S "AIza" -- . | head -5
  ```
  **Expected**: No results

- [ ] CHK037 — Production env vars set in Vercel [Config]
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`
  - `N8N_WEBHOOK_SECRET` (verify NOT placeholder)

---

## 📋 BLOCK 6: Post-Pilot Backlog Acknowledged

> Confirm these do NOT block deployment:

- [ ] CHK038 — G3/T023 PDF/CSV export: deferred [FUTURE] ✅
- [ ] CHK039 — G4/SC-001/SC-002 metric tracking: manual observation for pilot ✅
- [ ] CHK040 — U2 AI inline edit UI: Phase 2 scope ✅
- [ ] CHK041 — U3 Loop closure rate formula (SC-004): post-pilot ✅
- [ ] CHK042 — A1 Loop closure trigger: webhook works for pilot ✅

---

## 🚀 DEPLOY COMMAND

> Execute only after ALL blocks above are ✅

```bash
git push origin main
```

### Post-Deploy Monitoring

1. **Vercel** dashboard → watch build logs (target: < 3 min)
2. **Supabase** dashboard → confirm no migration errors
3. **N8N** → verify all workflows still ACTIVE

### Rollback Plan

```bash
# Vercel: Deployments → previous deployment → "Promote to Production"
# Migrations 008-011 use SET/UPDATE/ADD — no destructive DROPs
# Safe to rollback without data loss ✅
```

---

## Sign-Off

| Role | Verified By | Date | ✅ |
|------|-------------|------|----|
| Developer | | 2026-02-21 | ☐ |
| Product Owner | | 2026-02-21 | ☐ |
| Privacy Review | | 2026-02-21 | ☐ |
