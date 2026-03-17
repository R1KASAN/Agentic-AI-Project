# Climate Agent Phase 2 — Spec-Kit Master Navigation Guide
**Date:** March 16, 2026  
**Status:** ✅ All Spec-Kit workflows complete  
**Framework:** Agentic AI System (not dashboard)  

---

## 🎯 What Was Created

This session completed the **full Spec-Kit workflow** for Climate Agent Phase 2 (Operational Agent):

1. ✅ **Constitution v2.0** — Agentic governance principles
2. ✅ **Feature Specifications** — 3 features (W06, W07, Loop Closure UI)
3. ✅ **Technical Plans** — Complete architecture & implementation designs
4. ✅ **Implementation Tasks** — 75 actionable tasks across 7 workstreams

---

## 📁 File Structure & Navigation

### **1. Constitution v2.0** (Start Here for Principles)

**Location**: `.specify/memory/constitution.md`

**Contains**:
- 8 Core Agentic Principles (Autonomous Agency, Privacy-by-Design, Loop Closure, Human-in-the-Loop, Minimum Friction, Teacher Partnership, Scalability, No Invasive Monitoring)
- Autonomy Levels roadmap (L1-L4, with current vs. future state)
- Agentic Loop architecture (Sense → Reason → Plan → Act → Learn)
- Technical stack reframed as agentic orchestrator
- Governance gates & compliance checkpoints
- Updated templates for spec/plan/tasks (all include agentic sections)

**Read this if**: You need to understand the "why" behind every design decision, or you're reviewing a feature for constitutional alignment.

---

### **2. Feature Specifications** (Read for Requirements)

**Location**: `specs/`

Each feature has a complete spec folder:

#### **A. W06 Morning AI Briefing** (Daily Routine Policy)
**Path**: `specs/003-morning-briefing/`

Files:
- `spec.md` — Full specification (requirements, acceptance criteria, success metrics)
- `CHECKLIST.md` — Quality validation gates

**Features**:
- Daily 7:30 AM LINE notification with classroom climate summary + AI suggestions
- Teacher approval gate before sending (human-in-the-loop)
- Loop closure tracking: teacher marks "done" after implementing suggestion
- Metrics: ≥70% approval rate, ≥50% implemented within 4h, ≥60% closure rate

**Agentic Loop Stages**: Loop0 (trigger) → Loop2 (personalize) → Loop3 (send) → Loop4 (closure) → Loop5 (learn patterns)

#### **B. W07 Mood Anomaly Alert** (Real-Time Warning Policy)
**Path**: `specs/004-anomaly-alert/`

Files:
- `spec.md` — Full specification
- `CHECKLIST.md` — Quality validation gates

**Features**:
- Real-time detection when mood drops >30% vs. baseline (or <50% engagement)
- Severity classification: WARNING (medium anomaly) vs. CRITICAL (immediate support needed)
- 2-3 rapid intervention suggestions (5-10 min activities)
- Non-intrusive: Max 2 notifications/day guard

**Agentic Loop Stages**: Loop0 (trigger) → Loop2 (severity) → Loop3 (alert) → Loop4 (immediate feedback) → Loop5 (tag high-trust actions)

#### **C. Loop Closure UI Enhancement** (Self-Evaluation Mechanism)
**Path**: `specs/005-closure-tracking/`

Files:
- `spec.md` — Full specification
- `CHECKLIST.md` — Quality validation gates

**Features**:
- New dashboard page: `/teacher/class/[id]/actions` (recommendation history)
- Quick "Mark as Done" button + feedback modal (what did you implement? how'd it go?)
- Metrics card: "Your Response Rate X%" (closure %, response latency, top actions)
- Nightly aggregation: Closure stats feed into future LLM prompts

**Agentic Loop Stages**: Loop4 (teacher feedback) → Loop5 (aggregate patterns, personalize future suggestions)

#### **D. Phase 2 Integration Document**
**Path**: `specs/PHASE_2_SUMMARY.md`

Ties all three features together:
- How they work as a cohesive system
- Shared infrastructure dependencies
- Week-by-week implementation timeline
- Engineering handoff notes

---

### **3. Technical Plans** (Read for Architecture & Design)

**Location**: `specs/` (same folder as specs above)

#### **A. Phase 2 Master Architecture**
**Path**: `specs/PHASE_2_TECHNICAL_IMPLEMENTATION.md`

**Contains**:
- 5-layer agentic system architecture
- Shared infrastructure (LINE API, frequency guard, audit logging)
- Database migration sequence (020-024)
- N8N workflow orchestration
- Cross-feature dependencies
- Constitutional alignment matrix
- 5-6 week critical path timeline

**Read this first** before diving into individual feature plans.

#### **B. Feature Technical Plans**

Each feature has a detailed technical plan:

1. **W06 Technical Plan**: `specs/003-morning-briefing/TECHNICAL_PLAN.md`
   - BriefingQueue DB table design
   - N8N workflow: 11 nodes (Schedule → LLM → Approval Gate → LINE)
   - Frontend: BriefingCard + ApprovalModal components
   - 3 API endpoints (GET, POST approve, POST dismiss)
   - Test scenarios + success metrics
   - 3-4 week effort estimate

2. **W07 Technical Plan**: `specs/004-anomaly-alert/TECHNICAL_PLAN.md`
   - MoodAlerts + HourlyMoodAggregate DB tables
   - N8N workflow: 19 nodes (Schedule/webhook → Detection rules → LLM severity → LINE)
   - 3 detection rules (30% drop, 15-30% + engagement, baseline comparison)
   - Frontend: LiveAlertBanner component + rapid action buttons
   - 3 API endpoints (GET active, POST acknowledge, POST action)
   - False-positive tuning strategy
   - 3-4 week effort estimate

3. **Loop UI Technical Plan**: `specs/005-closure-tracking/TECHNICAL_PLAN.md`
   - Extensions to recommendations table + new teacher_engagement_stats
   - Dashboard page (/teacher/class/[id]/actions) with history table
   - ClosureModal component (action type picker + feedback)
   - 3 API endpoints (GET history, POST close, GET stats)
   - Nightly aggregation job
   - 2-3 week effort estimate

#### **C. Deployment & Handoff**
**Path**: `specs/PHASE_2_COMPLETE_PACKAGE.md`

**Contains**:
- Master index of all 5 technical documents
- Constitutional alignment matrix (8 principles × 3 features)
- Week-by-week detailed timeline
- Pre/during/post deployment checklists
- Success metrics & go-live KPIs
- Common issues & escalation paths
- Final verification checklist

---

### **4. Implementation Tasks** (Read for Sprint Planning)

**Location**: `specs/PHASE_2_TASKS/`

Master index file: `00-MASTER_TASKS.md`

**Contains**:
- 75 actionable tasks across 7 workstreams
- Week-by-week Gantt chart (6 weeks, 42 days)
- Critical path analysis (39-day minimum path)
- Parallel execution examples (team coordination)
- Team role assignments (Backend, Frontend, DevOps, QA)
- Success metrics for go-live

**Individual Workstream Files**:

1. **01-INFRA-tasks.md** (8 tasks, Week 1-2)
   - LINE API abstraction library
   - Frequency guard mechanism
   - Audit logging extensions
   - N8N environment setup
   - Dependencies/imports architecture

2. **02-DB-MIGRATIONS-tasks.md** (6 tasks, Week 1-2, parallel to INFRA)
   - Migration 020: briefing_queue table
   - Migration 021: mood_alerts + aggregates
   - Migration 022: recommendation enhancements
   - Migration 023: audit_log extensions
   - Migration testing + rollback procedures

3. **03-W07-ANOMALY-tasks.md** (15 tasks, Week 2-4)
   - Anomaly detection logic (rule-based + LLM)
   - N8N workflow design (W07-Mood-Anomaly-Alert.json)
   - Frontend: LiveAlertBanner + action buttons
   - API implementation (3 endpoints)
   - Unit + E2E testing
   - False-positive tuning

4. **04-W06-BRIEFING-tasks.md** (12 tasks, Week 3-4)
   - N8N workflow design (W06-Morning-Briefing.json)
   - LLM personalization logic
   - Frontend: BriefingCard + ApprovalModal
   - API implementation (3 endpoints)
   - Approval gate + LINE integration
   - Testing (mock LLM, real n8n)

5. **05-LOOP-UI-tasks.md** (9 tasks, Week 4-5)
   - ActionHistory page component
   - ClosureModal + feedback collection
   - Nightly aggregation job
   - MetricsCard dashboard
   - API implementation (3 endpoints)
   - Frontend integration

6. **06-QA-TESTING-tasks.md** (6 tasks, Week 4-6)
   - Load testing (100 classes, concurrent anomalies)
   - False-positive tuning for W07
   - Frequency guard validation
   - Privacy audit (k-anonymity checks)
   - E2E user flows (all roles)

7. **07-DEPLOYMENT-tasks.md** (5 tasks, Week 5-6)
   - Pre-deployment checklist
   - Pilot school onboarding
   - Monitoring dashboard setup
   - Success metrics tracking
   - Rollback procedures + incident response

---

## 🗺️ How to Use This Guide

### **For Product Managers / Tech Leads:**
1. Read `PHASE_2_SUMMARY.md` (3-5 min overview)
2. Read `PHASE_2_COMPLETE_PACKAGE.md` (10-15 min, focus on timeline + success metrics)
3. Reference `00-MASTER_TASKS.md` Gantt chart weekly for tracking

### **For Engineers (Backend):**
1. Start: `PHASE_2_TECHNICAL_IMPLEMENTATION.md` (understand architecture + dependencies)
2. Assign tasks from `01-INFRA-tasks.md` (Week 1-2)
3. Then work on feature tasks: `03-W07-ANOMALY-tasks.md` (Week 2-4), `04-W06-BRIEFING-tasks.md` (Week 3-4)
4. Reference individual TECHNICAL_PLAN.md files for N8N workflows, DB schema, API designs

### **For Engineers (Frontend):**
1. Start: `PHASE_2_TECHNICAL_IMPLEMENTATION.md` (understand system flow + component hierarchy)
2. Assign tasks from feature files: `03-W07-ANOMALY-tasks.md` (LiveAlertBanner), `04-W06-BRIEFING-tasks.md` (BriefingCard), `05-LOOP-UI-tasks.md` (ActionHistory page)
3. Reference TECHNICAL_PLAN.md files for component specs, API contracts, type definitions

### **For DevOps / QA:**
1. Start: `02-DB-MIGRATIONS-tasks.md` (understand DB evolution)
2. Reference: `06-QA-TESTING-tasks.md` for test scenarios + load testing approach
3. Reference: `07-DEPLOYMENT-tasks.md` for staging/production procedures

### **For Security / Privacy Officer:**
1. Read: `constitution.md` (Principle II: Privacy-by-Design)
2. Audit: Each TECHNICAL_PLAN.md section "Privacy/Safety/RLS"
3. Checklist: `PHASE_2_COMPLETE_PACKAGE.md` (Constitutional alignment matrix)

---

## 📊 Key Statistics

| Artifact | Count | Effort |
|----------|-------|--------|
| Specifications (features) | 3 | N/A |
| Specification sections per feature | 8+ | N/A |
| Technical plans (master + features) | 5 | N/A |
| Database migrations | 4 | Phase 2 |
| N8N workflows | 3 | Phase 2 |
| React components (new) | 6 | Phase 2 |
| API endpoints (new) | 9 | Phase 2 |
| Implementation tasks | 75 | 86 task-days |
| Week timeline | 5-6 | Critical path 39 days |

---

## 🎯 Phase 2 Goals

**What Phase 2 Delivers**:
- ✅ W06 Morning AI Briefing (routine policy)
- ✅ W07 Mood Anomaly Alert (warning/critical policy)
- ✅ Enhanced Loop Closure UI (self-evaluation feedback)
- ✅ Frequency guard (max 2 notifications/day)
- ✅ Stronger teacher action tracking (closure metrics)

**Agentic Evolution**:
- **Current**: Level 2 (Decision & Action) — Agent decides what to send, teacher approves
- **After Phase 2**: Still Level 2, but with robust feedback loops (self-evaluation enabled)
- **Phase 3 (future)**: Level 3 (Adaptive Policy) — Agent learns from teacher feedback, adjusts thresholds

---

## 🚀 Next Steps

1. **Kickoff Meeting** (30 min)
   - Review Constitution v2.0 with team
   - Confirm constitutional alignment is non-negotiable
   - Assign team roles

2. **Sprint 0** (Week 1-2) — Foundation
   - Execute INFRA tasks (8 tasks)
   - Execute DB-MIGRATIONS tasks (6 tasks)
   - Set up shared LINE API, frequency guard, audit logging

3. **Sprint 1** (Week 2-3) — W07 (Anomaly)
   - Execute W07-ANOMALY tasks (start of 15 tasks)
   - Parallel: Begin W06-BRIEFING prep

4. **Sprint 2** (Week 3-4) — W06 (Briefing) + W07 completion
   - Continue W07 tasks (complete all 15)
   - Execute W06-BRIEFING tasks (all 12)

5. **Sprint 3** (Week 4-5) — Loop UI + QA
   - Execute LOOP-UI tasks (all 9)
   - All 6 QA-TESTING tasks (parallel)

6. **Sprint 4** (Week 5-6) — Deployment
   - Execute DEPLOYMENT tasks (5 tasks)
   - Pilot school launch

---

## 📖 Reading Order (Recommended)

**First Reading (30 min)**:
1. This guide (you are here) ← Overview
2. `.specify/memory/constitution.md` ← Principles

**Second Reading (1-2 hours)**:
3. `PHASE_2_SUMMARY.md` ← Feature overview
4. `PHASE_2_COMPLETE_PACKAGE.md` ← Timeline + checklist

**Deep Dive (2-3 hours per feature)**:
5. Individual spec files (`003-morning-briefing/spec.md`, etc.)
6. Individual technical plans (`TECHNICAL_PLAN.md`)

**Implementation (ongoing**):
7. Task files (`01-INFRA-tasks.md`, etc.)
8. Reference docs as needed

---

## ✅ Quality Assurance

**All deliverables have been validated**:
- ✅ Constitutional alignment (all features aligned to 8 principles)
- ✅ Specification completeness (no [NEEDS CLARIFICATION] markers)
- ✅ Task ordering (no circular dependencies)
- ✅ Timeline feasibility (39-day critical path, 86 task-days for team of 4-5)
- ✅ Agentic framing (preserved throughout; not downgraded to dashboard)

---

## 🔗 Key Hyperlinks

| What | Where | Why |
|------|-------|-----|
| **Start here** | `PHASE_2_SUMMARY.md` | 5 min overview of Phase 2 |
| **Principles** | `.specify/memory/constitution.md` | Govern all decisions |
| **Full arch** | `PHASE_2_TECHNICAL_IMPLEMENTATION.md` | Before any implementation |
| **Feature specs** | `specs/00X-*/spec.md` | Requirements per feature |
| **Feature plans** | `specs/00X-*/TECHNICAL_PLAN.md` | Design details per feature |
| **Tasks** | `specs/PHASE_2_TASKS/00-MASTER_TASKS.md` | Sprint planning |
| **Deployment** | `specs/PHASE_2_COMPLETE_PACKAGE.md` | Go-live checklist |

---

*This master guide reflects the complete Phase 2 specification, built to Constitutional v2.0 standards with agentic AI system architecture (not dashboard). All documents are interdependent and should be read in order.*

Generated: March 16, 2026  
Status: ✅ Ready for Engineering Handoff
