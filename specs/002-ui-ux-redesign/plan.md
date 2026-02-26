# Implementation Plan: Climate Agent UI/UX Redesign & N8N Automation

**Branch**: `002-ui-ux-redesign` | **Date**: 2026-02-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-ui-ux-redesign/spec.md`

## Summary

The feature involves a comprehensive UI/UX redesign and automation backend mapping for the Classroom Climate SaaS over three primary roles: Students, Teachers, and Admins. The architecture bridges a Next.js 15 frontend, Supabase database with RLS, and N8N workflow automation to establish a low-friction daily pulse metric, automated AI issue summarization, explicit human-in-the-loop approval, and gamified student retention. 

## Technical Context

**Language/Version**: TypeScript / Next.js 15 App Router
**Primary Dependencies**: React 19, Tailwind CSS, shadcn/ui, Supabase Client, Recharts, N8N
**Storage**: Supabase (PostgreSQL) with Row Level Security (RLS)
**Testing**: Jest / React Testing Library (Unit), Playwright (E2E)
**Target Platform**: Web (Mobile-first for students; desktop optimized for teachers/admins)
**Project Type**: Next.js Full-Stack Web Application + N8N Automation Layer
**Performance Goals**: Student check-in < 20 seconds; Teacher dashboard review < 3 minutes
**Constraints**: k-anonymity (n ≥ 3 for aggregate views), absolute privacy on raw text, strictly human-in-the-loop AI workflows.
**Scale/Scope**: Focus on pilot MVP features first (Phase 1), laying groundwork for Phase 2 scaling (PDFs, advanced streaks).

## Constitution Check

*GATE: Passed*

- **Privacy-by-Design**: Checked. k-anonymity (n>=3) explicitly built into UI states. Raw text accessibility is blocked for teachers/admins.
- **Human-in-the-Loop**: Checked. AI action drafts mandate teacher review (Approve/Edit/Dismiss) before communicating any loops back to students. No auto-send allowed.
- **Minimum Friction**: Checked. The 3-metric student pulse is designed for <20s completion with 3-4 taps. 
- **Adoption & Engagement**: Checked. Built-in variable rewards ("Class Vibe", loop closure) integrated for students to maintain engagement hooks. Teacher dashboards simplified to TL;DR blocks.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-ux-redesign/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Technical research and choices
├── data-model.md        # Database schema additions/modifications
├── quickstart.md        # How to run and test these changes
├── contracts/           # API and payload definitions for Next.js & n8n
```

### Source Code

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← shared sidebar + auth guard
│   │   ├── student/
│   │   │   ├── check-in/page.tsx
│   │   │   ├── check-in/success/page.tsx
│   │   │   ├── feedback/page.tsx
│   │   │   └── join/page.tsx
│   │   ├── teacher/
│   │   │   ├── page.tsx            ← Teacher dashboard
│   │   │   ├── class/[id]/page.tsx
│   │   │   ├── class/[id]/settings/page.tsx
│   │   │   ├── class/new/page.tsx
│   │   │   └── recommendations/page.tsx
│   │   └── admin/
│   │       ├── dashboard/page.tsx
│   │       ├── settings/page.tsx
│   │       └── audit/page.tsx
│   └── api/
│       ├── student/
│       │   ├── check-in/route.ts
│       │   └── feedback/route.ts
│       ├── teacher/
│       │   ├── dashboard/route.ts
│       │   └── class/[classId]/route.ts
│       └── n8n/
│           └── webhook/route.ts
├── components/
│   ├── domain/
│   │   ├── student/       # CheckInForm, ClimateCharts, ActionList
│   │   ├── teacher/       # ClassHealthRow, RiskIndicator, SparklineBar
│   │   └── admin/         # MetricCards
│   ├── charts/            # TrendChart (Recharts)
│   └── ui/                # shadcn/ui primitives
├── hooks/
│   └── useClimateHistory.ts
└── lib/
    ├── supabase/          # client.ts, server.ts, middleware.ts
    ├── microcopy.tsx       # BiText + MICROCOPY constants (Thai/EN)
    └── utils.ts
```

> ⚠️ Route wrapper `(dashboard)/` enforces shared layout and auth guard.
> Old `(student)/`, `(teacher)/` flat groups removed in D2 fix (2026-02-21).
> plan.md updated to match actual implementation — I1 fix, speckit.analyze v2.

**Structure Decision**: A single monolith Next.js 15 project structure categorized by domain-driven feature folders under `app/(role)`. `components` are also explicitly broken down by actor (student, teacher, admin) to enforce separation of concerns and avoid accidental data leaks between roles. N8N webhook syncs are handled via generic `api/n8n/webhook` endpoints.
