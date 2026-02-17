# Implementation Plan: Sitemap & Navigation

**Branch**: `1-sitemap-navigation` | **Date**: 2026-02-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/1-sitemap-navigation/spec.md`

## Summary

Implement the core sitemap and navigation structure for the Class Climate AI System, establishing role-based routing (Student, Teacher, Admin), the "Daily Pulse" check-in flow, and the "Teacher Sanity" dashboard structure. This feature lays the foundation for all subsequent modules.
This feature focuses on **routing, layouts, and placeholder views** only; business logic (hybrid scoring, AI calls, retention jobs) will be mocked or left as stubs.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+ (Next.js runtime)
**Primary Dependencies**: Next.js 14+ (App Router), Tailwind CSS, Supabase JS Client, Lucide React (icons)
**Storage**: Supabase (PostgreSQL) - Auth, RLS, Tables
**Testing**: Jest + React Testing Library (Standard for Next.js)
**Target Platform**: Vercel (Web / Edge Functions)
**Project Type**: Web Application (Next.js)
**Performance Goals**: Login redirect < 1s, Check-in < 20s, Dashboard load < 2s
**Constraints**: 
- **Privacy**: k-anonymity (n >= 3) enforcement in API/Views.
- **No Surveillance**: No tracking libraries or invasive sensors.
- **NO Invasive Inputs**: No camera, microphone, biometric, or attention-tracking integrations. Only explicit form inputs are in scope.
- **Retention**: Data pruning logic needed (future task, but schema must support timestamps).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Privacy-by-Design
- [x] **RLS**: Schema must use RLS. (Plan: specific policies for `check_ins` and `users`).
- [x] **k-anonymity**: Aggregation logic must hide n<3. (Plan: Implement via Database View or Secure RPC, never raw select).
- [x] **No Invasive Monitoring**: UI/Logic will only accept explicit form inputs.

### II. Human-in-the-Loop
- [x] **AI as Assistant**: Spec defines "AI Draft" for teacher dashboard. (Plan: Dashboard has explicit "Approve/Diff" UI).
- [x] **Teacher Autonomy**: Teachers can dismiss suggestions.

### III. Minimum Friction
- [x] **Speed**: Check-in UI check (< 20s). (Plan: Minimalist mobile-first UI).

### IV. Adoption & Engagement (USP)
- [x] **Daily Pulse**: integrated into routine.
- [x] **Teacher Sanity**: Dashboard limited to top 3 actions.
- [x] **Loop Closure**: "Action Taken" visibility.

### Anti-Patterns
- [x] **No Ranking**: Metrics are aggregate only.
- [x] **No Predictive Policing**: No individual risk scores.
- [x] **No Surveillance UI**: No UI elements or flows should suggest real-time monitoring of individual students.

## Project Structure

### Documentation (this feature)

```text
specs/1-sitemap-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── app/                  # App Router
│   ├── (auth)/           # Login route
│   ├── (dashboard)/      # Protected routes layout
│   │   ├── student/      # Student routes
│   │   ├── teacher/      # Teacher routes
│   │   └── admin/        # Admin routes
│   └── api/              # API Routes
├── components/           # Shared components
│   ├── ui/               # Shadcn/Tailwind UI
│   └── domain/           # Feature specific components
├── lib/
│   ├── supabase/         # Supabase client & server utils
│   └── utils/            # Helper functions
└── types/                # Global types
```

**Structure Decision**: Using Next.js App Router for robust layout handling (Role-Based Access Control in Layouts) and server components for performance.
