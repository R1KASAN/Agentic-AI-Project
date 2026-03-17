# W06 Morning AI Briefing - Implementation Traceability Matrix

**Date**: 2026-03-16  
**Status**: Implementation Complete for Phase 3-4 (n8n Workflow)  
**Remaining**: Phase 5-9 (API Routes, Frontend, Testing, Deployment)

---

## 📊 Task-to-Node Mapping

This matrix maps each feature task from **tasks.md** to the specific n8n nodes that implement it.

| Task ID | Task Name | File | Node Names | Status |
|---------|-----------|------|-----------|--------|
| **T017** | Create n8n Schedule Trigger node | 006-morning-briefing.workflow.ts | Node 1 (ScheduleTrigger) | ✅ DONE |
| **T018** | Create "Check School Day" IF condition | 006-morning-briefing.workflow.ts | Nodes 2-3 (CheckSchoolDay, IsSchoolDayDecision) | ✅ DONE |
| **T019** | Create "Loop Over Classes" Split in Batches | 006-morning-briefing.workflow.ts | Nodes 4-7 (FetchActiveTeachers, LoopSplitTeachers, FetchTeacherClasses, LoopSplitClasses) | ✅ DONE |
| **T020** | Create Tool Sub-workflow: get_class_climate_summary | tool-get-class-climate-summary.workflow.ts | Nodes 8 + TriggerInput, ParseClimateData | ✅ DONE |
| **T021** | Create Tool Sub-workflow: get_past_recommendations | tool-get-past-recommendations.workflow.ts | Nodes 9 + FetchPastRecommendations, CalculateClosureMetrics | ✅ DONE |
| **T022** | Create Tool Sub-workflow: get_teacher_action_rate | tool-get-teacher-action-rate.workflow.ts | Node 10 + FetchTeacherProfile, ApplyInquiryModeLogic | ✅ DONE |
| **T023** | Create "Check K-Anonymity" IF condition | 006-morning-briefing.workflow.ts | Node 11 (KAnonymityCheck) | ✅ DONE |
| **T024** | Create "Check Notification Frequency" IF | 006-morning-briefing.workflow.ts | Nodes 12-13 (CheckFrequencyGuard, FrequencyGuardDecision) | ✅ DONE |
| **T025** | Create "Check Teacher Availability" IF | 006-morning-briefing.workflow.ts | Node 14 (CheckTeacherAvailability) | ✅ DONE |
| **T026** | Create Gemini LLM credential in n8n | 006-morning-briefing.workflow.ts | Node 15 (GeminiLLM) | ✅ DONE |
| **T027** | Create LangChain Agent node | 006-morning-briefing.workflow.ts | Node 16 (LangChainAgent) | ✅ DONE |
| **T028** | Create output validation & fallback logic | 006-morning-briefing.workflow.ts | Node 17 (ValidateAndFallback) | ✅ DONE |
| **T029** | Create policy classification node | 006-morning-briefing.workflow.ts | Node 18 (ClassifyPolicy), Node 30 (ToneAudit) | ✅ DONE |
| **T030** | Create tone/frame audit node | 006-morning-briefing.workflow.ts | Node 19 (ToneAudit) | ✅ DONE |
| **T031** | Create LINE notification message template | 006-morning-briefing.workflow.ts | Node 20 (PrepareLineMessage) | ✅ DONE |
| **T032** | Create "Send LINE Notify" HTTP request | 006-morning-briefing.workflow.ts | Node 21 (SendLineNotify) | ✅ DONE |
| **T033** | Create recommendation DB insert node | 006-morning-briefing.workflow.ts | Node 22 (InsertRecommendation) | ✅ DONE |
| **T034** | Create audit log insert node | 006-morning-briefing.workflow.ts | Node 23 (InsertAuditLog) | ✅ DONE |
| **T035** | Create dashboard cache revalidation webhook | 006-morning-briefing.workflow.ts | Node 24 (RevalidateDashboard) | ✅ DONE |
| **T036** | Test W06 workflow end-to-end | 006-morning-briefing.workflow.ts | (Entire workflow) | 🔄 PENDING |
| **T037-T038** | Create n8n_notification_log table + trigger | (DB Migration) | (RPC + trigger) | 🔄 PENDING |
| **T039-T044** | Create Next.js API routes | src/app/api/ | (API handlers) | 🔄 PENDING |
| **T045-T054** | Create Frontend UI Components | src/components/ | (React components) | 🔄 PENDING |
| **T055-T065** | Create Tests | __tests__/ | (Test files) | 🔄 PENDING |
| **T066-T067** | n8n Workflow Tests | (n8n Dry-run) | (All nodes) | 🔄 PENDING |
| **T068-T071** | Deployment & Validation | (Production) | (All systems) | 🔄 PENDING |

---

## 🔄 Phase Completion Status

| Phase | Name | Tasks | Status | Files |
|-------|------|-------|--------|-------|
| **Phase 2** | Database Schema & RLS | T005-T016 | ✅ COMPLETE | Migrations 024-026 (applied) |
| **Phase 3** | n8n Workflow Part 1 (Trigger & Gates) | T017-T025 | ✅ COMPLETE | 006-morning-briefing.workflow.ts |
| **Phase 4** | n8n Workflow Part 2 (Agent & Recording) | T026-T035 | ✅ COMPLETE | 006-morning-briefing.workflow.ts + tool-*.workflow.ts |
| **Phase 5** | Next.js API Routes | T039-T044 | 🔄 NOT STARTED | src/app/api/ |
| **Phase 6** | Frontend UI Components | T045-T054 | 🔄 NOT STARTED | src/components/domain/teacher/BriefingWidget/ |
| **Phase 7** | Testing & QA | T055-T067 | 🔄 NOT STARTED | __tests__/, e2e/ |
| **Phase 8** | Deployment & Validation | T068-T071 | 🔄 NOT STARTED | (Production systems) |

---

## 🗂️ File Directory Structure

```
Climate Agent/
├── n8n/
│   └── workflows/
│       ├── 006-morning-briefing.workflow.ts          [24 nodes, async]
│       └── tools/
│           ├── tool-get-class-climate-summary.workflow.ts     [2 nodes]
│           ├── tool-get-past-recommendations.workflow.ts      [2 nodes]
│           └── tool-get-teacher-action-rate.workflow.ts       [2 nodes]
│
├── specs/
│   └── 003-morning-briefing/
│       ├── spec.md                                    [Feature spec]
│       ├── plan.md                                    [Implementation plan]
│       ├── tasks.md                                   [71 tasks total]
│       ├── data-model.md                              [Entities & relationships]
│       ├── research.md                                [Technical decisions]
│       ├── quickstart.md                              [Quick start guide]
│       ├── CHECKLIST.md                               [Quality checklist ✅ PASS]
│       ├── W06-WORKFLOW-DOCUMENTATION.md              [Comprehensive docs]
│       ├── W06-QUICK-REFERENCE.md                     [Quick reference]
│       └── W06-TRACEABILITY-MATRIX.md                 [This file]
│
└── [Phase 5-9 files pending...]
    ├── src/app/api/                                   [API routes T039-T044]
    ├── src/components/domain/teacher/                 [UI T045-T054]
    └── __tests__/                                     [Tests T055-T067]
```

---

## 📈 Implementation Progress Chart

```
Phase 2: Database Schema        ████████████████████  100% (12/12 tasks)
Phase 3: n8n Workflow Pt 1      ████████████████████  100% (9/9 tasks)
Phase 4: n8n Workflow Pt 2      ████████████████████  100% (10/10 tasks)
Phase 5: API Routes             ░░░░░░░░░░░░░░░░░░░░    0% (0/6 tasks)
Phase 6: Frontend UI             ░░░░░░░░░░░░░░░░░░░░    0% (0/10 tasks)
Phase 7: Testing                 ░░░░░░░░░░░░░░░░░░░░    0% (0/13 tasks)
Phase 8: Deployment              ░░░░░░░░░░░░░░░░░░░░    0% (0/4 tasks)

Overall: ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  27% (31/71 tasks)
```

---

## 🔗 Specification Traceability

### Feature Requirements → Nodes

| Requirement (from spec.md) | Implemented In Nodes | Notes |
|---|---|---|
| **FR-001**: Daily 7:30 AM trigger M-F | Node 1 (ScheduleTrigger) | Cron: `0 7 * * 1-5` |
| **FR-002**: Skip on non-school days | Nodes 2-3 (CheckSchoolDay + Decision) | Queries school_days table |
| **FR-003**: Get active teachers | Node 4 (FetchActiveTeachers) | Filters on is_active + not on_leave |
| **FR-004**: Get teacher's classes | Node 6 (FetchTeacherClasses) | Filtered per teacher |
| **FR-005**: K-anonymity protection (k≥3) | Node 8 (ClimateSummary) + Node 11 (Gate) | RPC enforces, workflow checks |
| **FR-006**: Mood aggregation | Node 8 (ClimateSummary RPC) | Returns mean, std_dev, trend |
| **FR-007**: LLM recommendation generation | Node 16 (LangChainAgent + Gemini) | With fallback (Node 17) |
| **FR-008**: Policy classification | Node 18 (ClassifyPolicy) | ROUTINE/WARNING/CRITICAL |
| **FR-009**: MESSAGE template | Node 20 (PrepareLineMessage) | With ☀️ mood + trend + closure % |
| **AG-001**: Tool isolation | Nodes 8-10 (Tool Sub-workflows) | Separate from LLM |
| **AGR-001**: Notification frequency guard | Nodes 12-13 (Frequency gates) | ≤2/day, ≤5/week |
| **AGR-002**: Full audit logging | Node 23 (InsertAuditLog) | decision_path_json captured |
| **AGR-003**: Deterministic reasoning | All nodes (sequential flow) | Same input → same output |
| **SC-001**: Briefing delivered within 5 min | All nodes | Target: <5 min end-to-end |
| **SC-002**: No raw student data | Nodes 8, 20, 23 | Aggregates only |
| **SC-003**: K-anonymity enforced | Nodes 8, 11 | Server + workflow level |
| **SC-004**: Teacher approval gate | Nodes 36-41 (API routes, Phase 5) | Handler in T041 |

---

## 🎯 Success Criteria

### Phase 3-4 Implementation (Current)
- [x] All 19 workflow nodes created with correct configuration
- [x] 3 tool sub-workflows implemented with proper isolation
- [x] System prompt for LLM agent defined + reviewed
- [x] K-anonymity guard implemented at RPC + workflow level
- [x] Fallback logic for low-confidence LLM output
- [x] Full audit logging with decision_path_json structure
- [x] LINE message template with variable substitution
- [x] Database insertion nodes for recommendations + audit_log
- [x] Workflow documentation complete (2 comprehensive docs)
- [x] Node mapping & traceability clear

### Phase 3-4 Verification (Next Steps - T036)
- [ ] Dry-run each node individually (Node 1-24)
- [ ] Dry-run entire workflow end-to-end
- [ ] Test with valid data (5+ teacher, 3+ students per class)
- [ ] Test each gate: K-anonymity skip, frequency skip, etc.
- [ ] Verify recommendations table has data after execution
- [ ] Verify n8n_audit_log has full decision_path_json
- [ ] Verify LINE message delivered (test account)
- [ ] Verify dashboard webhook called (check Next.js logs)

---

## 🚀 Next Phase Kickoff (Phase 5: API Routes)

**Ready to start**: T039-T044 (Next.js API Routes)

### Files to Create
- `src/app/api/n8n/webhook/route.ts`
- `src/app/api/teacher/briefing-status/route.ts`
- `src/app/api/teacher/recommendation/[id]/action/route.ts`
- `src/lib/sentiment-analyzer.ts`
- `src/lib/closure-message.ts`

### Dependencies Available
- ✅ recommendations table (created + seeded)
- ✅ n8n_audit_log table (created)
- ✅ teacher_profiles table (created)
- ✅ W06 workflow ready (all nodes)
- ✅ Tool sub-workflows ready (all 3)

### Starting Point
Review [tasks.md](tasks.md) T039-T044 for detailed API specifications.

---

## 📚 Documentation Links

- [W06 Feature Specification](spec.md)
- [W06 Implementation Plan](plan.md)
- [W06 Comprehensive Workflow Docs](W06-WORKFLOW-DOCUMENTATION.md)
- [W06 Quick Reference](W06-QUICK-REFERENCE.md)
- [W06 Data Model](data-model.md)
- [W06 Tasks](tasks.md)
- [Climate Agent Constitution](../../AGENTS.md)

---

## 🔗 Related Workflows

| Workflow | Purpose | Integration Point |
|----------|---------|-------------------|
| **W01** (Collect Moods) | Loop0 → Collects student check-ins | Populates student_pulses |
| **W02** (Loop Closure) | Loop4 → Triggered on check-in, closes prior recs | Marks recs as "implemented" |
| **W03** (Friday Reminder) | Series → Reminds students to check in | Complements W06 timing |
| **W04** (Health Score) | Reporting → Weekly school metrics | Consumes recommendations |
| **W05** (Email Summary) | Distribution → Email supplement to LINE | Parallel to W06 |
| **W06** (Morning Briefing) | **Core Loop2-3** → Generate + send daily briefing | Central to agentic loop |
| **W07** (Anomaly Alert) | Phase 3 → High-alert messaging | Complements W06 routine |

---

## 💡 Key Design Decisions

### 1. Tool Sub-Workflows (T020-T022)
**Decision**: Isolate each data fetch in separate workflow  
**Rationale**: Cleaner architecture, easier testing, reusable by other workflows  
**Tradeoff**: Slightly more HTTP calls vs. monolithic query

### 2. LangChain Agent over Raw LLM (T027 vs. simple lmChatGoogleGemini)
**Decision**: Use agentic pattern with tools instead of direct LLM call  
**Rationale**: Allows agent to iterate, use tools, plan multi-step reasoning  
**Tradeoff**: Longer execution time (~2-3 sec extra), but higher quality output

### 3. Extensive Gate Structure (T023-T025)
**Decision**: 3 sequential gates before agent reasoning  
**Rationale**: Fail fast, prevent spam, enforce guardrails  
**Tradeoff**: More nodes, but clear separation of concerns

### 4. Full Decision Path JSON (T034)
**Decision**: Capture all gate results in JSONB column  
**Rationale**: Transparency for future model training + debugging  
**Tradeoff**: Slightly larger DB footprint, but valuable for analytics

### 5. Fallback Logic (T028)
**Decision**: Use rule-based fallback if LLM confidence < 0.65  
**Rationale**: Ensures briefing always sent (at worst, generic suggestion)  
**Tradeoff**: Fallbacks are less personalized, but better than failure

---

## 🧭 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  W06 MORNING AI BRIEFING (Agentic Loop2-3)              │
└─────────────────────────────────────────────────────────┘
        ↑ INPUT (from W01: student_pulses)
        ↓
   ┌────────────────────────────────────────────┐
   │  n8n W06 Workflow (24 nodes)                │
   │  ├─ Trigger (7:30 AM M-F)                  │
   │  ├─ Gates (school_day, frequency, k-anon)  │
   │  ├─ Data (climate, past, teacher metrics)  │
   │  ├─ Agent (Gemini + tools)                 │
   │  └─ Send (LINE + DB + webhook)             │
   └────────────────────────────────────────────┘
        ↓ OUTPUT
    ┌──────────────────────────────────────────────┐
    │ Supabase (PostgreSQL)                        │
    │ ├─ recommendations (new record)             │
    │ ├─ n8n_audit_log (decision path)            │
    │ └─ teacher_profiles (updated metrics)       │
    └──────────────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────────────┐
    │ LINE Notify                                   │
    │ └─ Briefing message → teacher               │
    └──────────────────────────────────────────────┘
        ↓
    ┌──────────────────────────────────────────────┐
    │ Next.js Dashboard (Phase 5)                  │
    │ ├─ BriefingWidget component                  │
    │ ├─ Teacher approval UI                       │
    │ └─ Loop closure metrics display              │
    └──────────────────────────────────────────────┘
        ↓ (teacher interacts)
    ┌──────────────────────────────────────────────┐
    │ W02 Loop Closure (triggered on teacher action)│
    │ └─ Marks recommendation as "implemented"     │
    └──────────────────────────────────────────────┘
        ↓ (feedback loop)
    [Cycle repeats: W01 → W06 → Dashboard → W02 → W01...]
```

---

## 📞 Contact & Questions

For implementation details:
- **Workflow Architecture**: See [W06-WORKFLOW-DOCUMENTATION.md](W06-WORKFLOW-DOCUMENTATION.md)
- **Quick Lookup**: See [W06-QUICK-REFERENCE.md](W06-QUICK-REFERENCE.md)
- **Feature Spec**: See [spec.md](spec.md)
- **Implementation Plan**: See [plan.md](plan.md)

For next phase (API Routes, UI, Testing):
- Start with [tasks.md](tasks.md) T039-T044 for detailed specifications
- Use this document as a reference for how W06 workflow is already structured

---

**Generated**: 2026-03-16  
**Last Updated**: 2026-03-16  
**Status**: Implementation Complete (Phase 3-4)  
**Next**: Phase 5 (API Routes)

