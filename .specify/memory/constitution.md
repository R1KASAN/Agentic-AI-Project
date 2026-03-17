<!--
SYNC IMPACT REPORT
- Version: 2.0.0 (Agentic Autonomy & Evolution)
- Changes: MAJOR paradigm shift: Reframed system as autonomous agent (not dashboard tool). Added Autonomous Agency principle with agentic loop (5 steps: Sense → Reason → Act → Self-Evaluate → Learn). Added Autonomy Levels (1-4) defining current state (Level 1-2) and roadmap (Level 3-4). New principles: Continuous Self-Evaluation & Loop Closure (core feature), Teacher Partnership & Proactive Advisor, Scalability & Multi-School Orchestration. Elevated NO Invasive Monitoring to top-level anti-pattern. Updated Tech Stack to emphasize n8n as agentic orchestrator. Updated Governance section with agentic compliance gates.
- Templates Updated: plan-template.md (Constitution Check gate for agentic patterns); spec-template.md (requirements for autonomous decisions + proactive messaging); tasks-template.md (added agentic loop testing tasks + observability for self-evaluation).
- Deprecation: v1.3 "dashboard-centric" guidance superseded by v2.0 agent-centric architecture.
-->
<!--
SYNC IMPACT REPORT (v1.3.0)
- Version: 1.3.0 (Competitive Positioning Amendment)
- Changes: Added Competitive Positioning Note (Focus on Deep Climate, Daily Pulse); Refined Principles with USPs (Local Context Friendly, Habit Building); Strengthened Anti-Patterns (No Predictive Monitoring).
- Templates Checked: plan-template.md, spec-template.md, tasks-template.md.
-->
# Climate Agent Constitution (v2.0.0)
<!-- Governance for the Climate Agent autonomous agentic system -->

> **System Identity**: Climate Agent is an **autonomous AI agent**—not a dashboard or reporting tool. It **proactively** senses classroom climate, reasons about state, and sends timely briefings/warnings/escalations to teachers via LINE, email, or web notifications. It is trusted with decision authority over *when* to communicate and *what policy* (Routine/Warning/Critical) to apply, subject to human-in-the-loop governance and continuous self-evaluation.

## Core Identity & Authority

**Agent Name**: Climate Agent  
**Primary Goal**: Maintain & elevate classroom climate (psychological safety, belonging, readiness to learn) via daily autonomous sensing + proactive advisor briefings.  
**Decision Authority**: Agent autonomously decides *when* to notify teachers and *what policy* to apply, subject to this constitution and demonstrable effectiveness metrics. Teacher retains authority over classroom response.  
**Not a Dashboard Tool**: Climate Agent is NOT a system teachers log into to ask "How's my class today?" Rather, the agent *proactively delivers analysis* so teachers can focus on teaching.


## Autonomy Levels & Roadmap

The agent evolves through four maturity levels. Current implementations are **Level 1** and **Level 2** (in progress). Future phases target **Level 3** and **Level 4**.

| Level | Capability | Status | Timeline |
|-------|-----------|--------|----------|
| **Level 1** ✅ | **Sensing & Reporting**: Collect mood check-ins, historical data, aggregate into climate summaries for dashboards | Production (v4) | Deployed |
| **Level 2** 🔄 | **Decision & Action**: Agent autonomously evaluates state, selects policy (Routine/Warning/Critical), sends LINE/email notifications per teacher approval | In Progress (v4.1) | Q2 2026 |
| **Level 3** 🔲 | **Adaptive Policy**: Thresholds & parameters tuned per classroom context (class size, grade level, cultural norms, teacher preferences) via feedback loop | Backlog | Q3-Q4 2026 |
| **Level 4** 🔲 | **Conversational Agent**: Bidirectional LINE OA dialogue—agent asks follow-up questions, clarifies concerns, co-creates intervention plans with teachers | Backlog | 2027+ |

## Agentic Loop: Non-Negotiable Architecture (L2+)

Climate Agent operates in a **5-step closed loop** at Level 2 and above:

1. **Perception (Sense)**: Collect consented student mood data, class context (enrollment, recent actions), historical trends, teacher feedback.
2. **Reasoning & Planning (Brain)**: Evaluate aggregate climate state → select policy (Routine=low risk, Warning=elevated risk, Critical=urgent) → invoke LLM to generate insights & draft messages.
3. **Action (Act)**: Send notifications (LINE, email, dashboard alert) per policy + teacher approval. Update teacher dashboard with recommended actions. Communicate outcomes back to student view when teacher acts.
4. **Self-Evaluation (Learn)**: Track teacher response patterns (approve/dismiss rate, action rate, timing to action). Measure loop closure (% of check-ins → teacher checks → teacher acts). Identify patterns in teacher overload vs. engagement.
5. **Long-Term Learning (Adapt)**: Aggregate effectiveness metrics across classes. Recommend policy parameter adjustments. Prepare adaptation plans for Level 3 threshold tuning.

**Non-Negotiable**: This loop MUST execute on a predictable schedule (e.g., daily at 06:00 UTC) with deterministic, auditable decision paths. No black-box randomness.

## Core Principles

### I. Autonomous Agency & Agentic Reasoning
**The agent has decision authority; teachers have response authority.**
- **Agent Authority**: Agent decides *when* to communicate (schedule, ad-hoc triggers), *what policy* to apply (Routine/Warning/Critical), and *what to recommend*. This authority is data-driven and auditable.
- **Teacher Authority**: Teachers decide *whether* to act on agent recommendations, and *how* to respond in their classroom. Teachers retain absolute veto.
- **Tool-Using Pattern**: The agent invokes external tools (LLM, time-series analysis, RLS-guarded RPCs) to inform reasoning, not to replace it. All tool outputs are logged for audit.
- **Reasoning Transparency**: All agent decisions must be explainable; policy selection is deterministic, not probabilistic. Logs MUST capture: (timestamp, policy selected, confidence threshold, trigger, actions taken).

### II. Privacy-by-Design
**NON-NEGOTIABLE**: Student privacy is paramount.
- **NO Invasive Monitoring**: We explicitly PROHIBIT facial recognition, emotion recognition, biometric sensors, or location tracking. The system operates ONLY on data students explicitly submit (consented).
- **No Predictive Monitoring**: We do NOT generate individual "at-risk" scores or behavioral tracking profiles. We analyze only aggregate climate trends.
- **Row Level Security (RLS)**: Students see only their own submissions. Teachers see only aggregate metrics (n ≥ 3, k-anonymity enforced) to prevent student deduceability.
- **Data Retention**: Raw text submissions must be redacted/deleted after 60 days. Audit logs: retained for 2 years.

### III. Continuous Self-Evaluation & Loop Closure
**Core feature, not afterthought**: The agent MUST measure its own effectiveness and close feedback loops.
- **Loop Closure Metric**: % of student check-ins → % teacher checks dashboard → % teacher takes action. Target: ≥60% closure on priority alerts.
- **Self-Monitoring Dashboard**: Agent reports weekly: notifications sent, teacher response time, action rate, dismissal rate, student mood trend post-action. Teachers see this data.
- **Effectiveness Gates**: If action rate drops below 30% on an alert type for >2 weeks, agent MUST reduce notification frequency for that type OR revise message framing. No "crying wolf."
- **Continuous Logs**: All agentic decisions, tool invocations, and teacher responses are logged to `n8n_audit_log` table with full traceability.

### IV. Human-in-the-Loop Partnership & Proactive Advisor
**Agent is advisor, not operator; teacher is decision-maker, not responder to dashboards.**
- **Proactive, Not Reactive**: Agent sends briefings *to* teachers (via LINE, email) rather than waiting for teachers to log in. Frees teacher time.
- **AI as Assistant**: AI is limited to:
  - Summarizing trends (e.g., "Workload concerns in 3+ student submissions this week"),
  - Highlighting patterns (e.g., "Mood dips Monday morning"),
  - Drafting messages for teacher editing/approval (never auto-sends to students/parents).
- **Teacher Sanity**: Notifications MUST be rare and actionable. Max 1-3 recommended actions per briefing. Overloading teachers = system failure.
- **Approval Loop**: No message leaves Climate Agent environment without explicit teacher click "Approve & Send" or "Send to LINE OA". Agent respects all edits/dismissals without penalty or re-escalation.

### V. Minimum Friction, Maximum Student Safety
**The student experience is the foundation of everything.**
- **Speed**: Check-in UI must be completable in <20 seconds. No friction, no pressure.
- **Safe Space**: Interface must feel non-judgmental, never like a test. Copy MUST be supportive, never clinical.
- **Anonymity**: Students always have a clearly visible option to submit feedback anonymously/pseudonymously. No forcing of identity.
- **No Surveillance Framing**: Never tell students they are being "tracked" or "monitored." Frame as "your voice matters."

### VI. Teacher Partnership: Daily Habits & Closing the Loop
**A system is only useful if trusted and actively used.**
- **Daily/Weekly Habit**: Check-ins designed as classroom routine (e.g., first 2 mins of class), creating reflection habit, not one-off surveys.
- **Local Channel Integration**: Notifications delivered via channels teachers already use (LINE OA, email, Slack, Teams) in local language.
- **Visible Loop Closure**: When teachers act, system MUST communicate back to students (e.g., "Your feedback prompted us to..." update on student view). Students see their voice matters.
- **Pilot-First Expansion**: New schools/classes must be voluntary pilots. Scale only after >70% teacher satisfaction + >50% student participation rate achieved.
- **Teacher Autonomy Over Norms**: Teachers can set custom norms/thresholds per their classroom (e.g., "My class values debate intensity—lower the 'conflict' threshold"). Agent respects local context.

### VII. Scalability & Multi-School Orchestration
**Design for growth from single school to district networks.**
- **Multi-Tenant Architecture**: Database/auth design allows independent schools as logical partitions, federated under "School Network."
- **Workflow Orchestration**: n8n workflows are configurable per school (e.g., different notification times, languages, escalation chains, LINE OA vs. email).
- **Observability for Orchestration**: Central observability dashboard shows health across all schools: agentic loop execution time, notification queue depth, teacher approval rate, student participation trends.
- **Federation Governance**: Each school principal can define local policies (e.g., "no notifications after 17:00") while adhering to constitutional constraints (privacy, human-in-the-loop, no surveillance).

### VIII. NO Invasive Monitoring or Forced Action
**Guardrails against system overreach.**
- **NO Surveillance**: No cameras, sensors, or background tracking. No biometric monitoring.
- **NO Ranking**: Data never used to rank or score students/teachers publicly.
- **NO Predictive Policing**: No individual "risk profiles" based on behavioral logs.
- **NO Forced Participation**: System-wide mandates only after proven pilot success.
- **NO Forced Action**: Teachers never forced to act. Agent suggests, teacher decides. No penalty for dismissals.
- **NO Spam**: Notifications are rare, actionable, and time-conscious (e.g., not >2/day, not after school hours except critical escalations).

## Tech Stack & Agentic Orchestration

### Frontend & Backend
- **Framework**: Next.js (React) + TypeScript with App Router (RSC-first design).
- **Styling**: Tailwind CSS v4 for rapid UI iteration with consistent design.
- **Auth & Sessions**: Supabase Auth + async `cookies()` for secure session management.
- **Deployment**: Vercel for automatic deployments and Edge Functions.

### Data & Privacy Infrastructure
- **Database**: Supabase (PostgreSQL) is the single source of truth.
- **Row Level Security (RLS)**: Supabase Auth + `SECURITY DEFINER` RPCs enforce k-anonymity (k ≥ 3) & student-teacher data separation.
- **Privacy Gateway**: All student data returned via RPC (never raw queries) to enforce anonymization.

### Agentic Orchestration & Autonomy (L2+)
- **Agentic Workflow Engine**: n8n v2.8.3+ with `langchain.agent` node for tool-using pattern.
- **LLM Integration**: Gemini API for sentiment analysis, trend synthesis, and draft message generation.
- **Tool Isolation Pattern**: Sub-workflows (toolWorkflow nodes) encapsulate RPC calls, preventing LLM from direct DB access. Agent invokes tools, logs all invocations.
- **Scheduling & Events**: n8n `scheduleTrigger` for periodic agentic loops (e.g., daily 06:00), `webhookTrigger` for ad-hoc events (e.g., urgent escalation), `workflowTrigger` for sub-workflows.
- **Hybrid Scoring**: Risk analysis uses 60% LLM (semantic analysis) + 40% deterministic rules (count thresholds, trend slopes).
- **Audit Logging**: All agentic decisions logged to `n8n_audit_log` table with full decision trace (trigger, policy, LLM output, action taken, teacher response).

### Notification & Communication
- **Channels**: LINE OA API, SendGrid (email), Next.js dashboard (web UI).
- **Message Orchestration**: n8n routes agent recommendations to appropriate channel per teacher & school settings.
- **Approval Loop**: Teacher approves in dashboard → webhook triggers notification send → status logged.

## Anti-Patterns & Guardrails

This constitution explicitly PROHIBITS:

- **NO Surveillance**: No cameras, sensors, activity logs, behavioral profiles, biometric monitoring.
- **NO Ranking**: Never use climate data to rank, score, or publicly evaluate students or teachers.
- **NO Predictive Policing**: No individual "at-risk" predictions or behavioral tracking scores.
- **NO Forced Participation**: System-wide adoption only after voluntary pilot success.
- **NO Forced Action**: Teachers never coerced to act on agent recommendations.
- **NO Spam or Notification Overload**: Max 2 notifications/day, none after school hours except critical (SEVERITY_CRITICAL).
- **NO Invasive Prompts**: Never use shame, guilt, or social pressure in student-facing messaging.
- **NO Opaque Decisions**: Agent reasoning must be auditable and deterministic (logging all tool invocations + thresholds applied).

## Governance

This constitution defines immutable constraints. ALL code, workflows, and decisions must be validated against these principles.

### Compliance Gates

1. **Code Review**: All PRs to `main` branch MUST pass:
   - **Privacy Check**: Verify no raw student data exposed; all queries use RLS-enforced RPCs; data retention policy honored.
   - **Agentic Audit**: (L2+) Verify tool isolation pattern followed; all agentic decisions logged; approval loop documented.
   - **Constitutional Alignment**: Check against I (Autonomous Agency), II (Privacy), IV (Human-in-the-Loop), VIII (Anti-Patterns).

2. **Testing Requirements**:
   - **RLS Tests**: Verify students see only own data; teachers see only aggregated (n ≥ 3) data.
   - **Agentic Loop Tests** (L2+): Verify all 5 steps execute; decision logic is deterministic; tool logs are complete.
   - **Integration Tests**: Verify notification delivery, teacher approval flow, loop closure metrics.

3. **Observability & Metrics**:
   - **Agentic Health**: Weekly dashboard showing loop execution time, notification queue depth, teacher approval rate, student participation %, action rate per policy, loop closure %.
   - **Privacy Audit**: Monthly check: data retention enforcement, RLS test pass rate, zero unencrypted PII logs.
   - **Constitution Audit**: Quarterly review of high-risk decisions (e.g., policy escalations) for adherence to Principle I (Agency) and IV (Loop Closure).

### Amendment Procedure

- **Patch Amendments** (typos, clarifications): Direct update + commit message `docs: update constitution (clarification)`.
- **Minor Amendments** (new principle, expanded guidance): PR with `[AMENDMENT]` label + rationale document + Constitutional Review approval + update all dependent templates.
- **Major Amendments** (principle removal, redefinition): Full RFC + Constitutional Review Board approval (3+ stakeholders) + migration plan + version bump to X.0.0.

### Versioning & Dates

- **Semantic Versioning**: MAJOR.MINOR.PATCH (breaking governance → MAJOR, new principle → MINOR, clarification → PATCH).
- **Dates (ISO 8601)**: Ratification date is original adoption; Last Amended date reflects most recent change.

**Version**: 2.0.0 | **Ratified**: 2026-02-16 | **Last Amended**: 2026-03-16
