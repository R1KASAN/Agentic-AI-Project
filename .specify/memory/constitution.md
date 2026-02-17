<!--
SYNC IMPACT REPORT
- Version: 1.3.0 (Competitive Positioning Amendment)
- Changes: Added Competitive Positioning Note (Focus on Deep Climate, Daily Pulse); Refined Principles with USPs (Local Context Friendly, Habit Building); Strengthened Anti-Patterns (No Predictive Monitoring).
- Templates Checked: plan-template.md, spec-template.md, tasks-template.md.
-->
<!--
SYNC IMPACT REPORT
- Version: 1.2.0 (EdTech/Privacy Amendment)
- Changes: Added "NO Invasive Monitoring" (Non-negotiable); Clarified AI as Assistant; Strengthened Adoption (Teacher Sanity, Student Safety); Expanded Anti-Patterns (No Surveillance, No Ranking).
- Templates Checked: plan-template.md, spec-template.md, tasks-template.md.
-->
<!--
SYNC IMPACT REPORT
- Version: 1.1.0 (Adoption & Engagement Focus)
- Changes: Refined Principle IV with specific metrics (pilot success, closure rate, sanity limits); Restored Principle III (Minimum Friction); Expanded Anti-Patterns.
- Templates Checked: plan-template.md, spec-template.md, tasks-template.md.
-->
<!--
SYNC IMPACT REPORT
- Version: 1.1.0 (Adoption Amendment)
- Changes: Added Principle IV: Adoption & Engagement; Added Anti-Patterns section.
- Templates Checked: plan-template.md, spec-template.md, tasks-template.md (No updates required).
-->
<!--
SYNC IMPACT REPORT
- Version: 1.0.0 (Initial Ratification)
- Changes: Established Core Principles (Privacy, AI Safety, Student Voice), Tech Stack, Governance.
- Templates Checked: plan-template.md, spec-template.md, tasks-template.md (No updates required).
-->
# Class Climate AI System Constitution
<!-- Governance for the Class Climate AI System project -->

> **Competitive Positioning Note**: This system is distinct from general EdTech or LMS platforms. It is laser-focused on **Classroom Climate** (feeling safe, belonging, workload) via a **Daily Anonymous Pulse**. It explicitly rejects surveillance, predictive policing of students, and heavy teacher workloads common in other tools.

## Core Principles

### I. Privacy-by-Design
**NON-NEGOTIABLE**: Student privacy is paramount.
- **NO Invasive Monitoring**: We explicitly PROHIBIT the use of facial recognition, emotion recognition, biometric sensors, or location tracking. The system operates ONLY on data students explicitly choose to submit (consented input).
- **No Predictive Monitoring**: Unlike other platforms, we do NOT score students on "at-risk" predictions based on behavior logs. We only analyze what they tell us.
- **Row Level Security (RLS)**: Students must ONLY identify their own data. Teachers must ONLY see aggregate data (n ≥ 3) to prevent deduceability.
- **Data Retention**: Raw text submissions must be redacted or deleted after 60 days.

### II. Human-in-the-Loop AI
**AI is an assistant, NOT a judge or commander.**
- **AI as Assistant**: AI is limited to summarizing trends, highlighting patterns, and drafting messages. It has NO authority to make decisions.
- **Teacher Autonomy**: Teachers have the absolute right to ignore, edit, or dismiss any AI suggestion without penalty.
- **No Public Call-outs**: AI must NEVER be used to auto-select "unprepared" students or facilitate public shaming.
- **Teacher Approval**: The AI must NEVER send messages to students or parents without explicit teacher approval.

### III. Minimum Friction, Maximum Safety
**The system must be effortless and safe for students.**
- **Speed**: Student check-in UI must be designed to be completed in under 20 seconds.
- **Safe Space**: The interface must feel like a safe, non-judgmental space (not a test).
- **Anonymity**: Students must always have a clearly visible option to submit feedback anonymously.

### IV. Adoption & Engagement (USP)
**A system is only useful if it is trusted and used.**
- **Daily Pulse & Habit**: Check-ins are designed as a daily/weekly routine (e.g., first 2 mins of class), building a habit of reflection, not a one-off semester survey.
- **Teacher Sanity**: Weekly dashboards must be digestible in 3-5 minutes with max 1-3 suggested actions. Overloading teachers is a system failure.
- **Closing the Loop**: When teachers act, the system must support visible communication back to students (e.g., student view update), validating that their voice matters. **Metric**: Loop Closure Rate.
- **Pilot First**: Adoption must be VOLUNTARY. Scale only after successful pilots with early adopters.
- **Local Context Friendly**: System must support local languages (Thai/English) and integration with common local channels (e.g., LINE OA/Email) for nudges, sensitive to local educational culture (supportive, not punitive).

## Tech Stack & Architecture

### Frontend & Backend
- **Framework**: Next.js (React) + TypeScript for full-stack type safety.
- **Styling**: Tailwind CSS for rapid, consistent UI development.
- **Deploy**: Vercel for immediate deployments and edge functions.

### Data & AI
- **Database**: Supabase (PostgreSQL) is the single source of truth.
- **Auth & RLS**: Supabase Auth handling user sessions and Row Level Security policies.
- **AI Orchestration**: n8n workflows to manage AI logic.
- **LLM**: Gemini API for sentiment analysis, topic extraction, and draft generation.
- **Hybrid Scoring**: Risk analysis uses a hybrid approach (60% LLM + 40% deterministic rules).

## Anti-Patterns (What We Won't Do)
- **NO Surveillance**: No cameras, sensors, or background tracking.
- **NO Ranking**: Data must never be used to rank, score, or evaluate students/teachers.
- **NO Predictive Policing**: No individual "risk scores" generated from behavioral tracking.
- **NO Forced Participation**: No system-wide mandates without proven pilot success.
- **NO Forced Action**: Teachers are never forced to act on AI suggestions.
- **NO Spam**: Notifications must be actionable, rare, and respectful of teacher time.

## Governance

This constitution defines the immutable constraints of the project.
- **Amendments**: Changes to these principles require a documented "Constitutional Amendment" PR with explicit rationale.
- **Compliance**: All code reviews must verify against `Privacy-by-Design` and `Human-in-the-Loop` principles.
- **Version**: 1.3.0 | **Ratified**: 2026-02-16 | **Last Amended**: 2026-02-16
