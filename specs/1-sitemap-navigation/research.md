# Research: Sitemap & Navigation

## Decision 1: k-anonymity Enforcement Layer
**Problem**: How to ensure k-anonymity (n >= 3) efficiently without leaking data?
**Options**:
1.  **Client-side filtering**: Fetch all, filter in JS. (UNSAFE - data reaches client).
2.  **API Layer (Next.js)**: Fetch count first, then data. (Safe, but extra round trips/complexity).
3.  **Database View / RPC**: Create a secure view or function that returns NULL/Empty if count < 3. (Safest & Fastest).

**Decision**: **Database View / RPC (PostgreSQL)**.
**Rationale**: "Privacy-by-Design" mandates strict controls. Doing it at the database level guarantees that even a buggy API endpoint won't leak data. Using a `SECURITY DEFINER` function or a View that checks `count(*)` is the most robust approach.

## Decision 2: State Management for "Check-in"
**Problem**: Managing the multi-step (or single extended) check-in form.
**Options**:
1.  **React Context / Local State**: Simple, fast.
2.  **URL Query Params**: Good for shareability (not relevant here).
3.  **Zustand/Redux**: Overkill for a simple form.

**Decision**: **React Local State (or React Hook Form)**.
**Rationale**: The check-in is a transient flow. `react-hook-form` is excellent for validation and performance (no re-renders).

## Decision 3: Role-Based Routing Implementation
**Problem**: Redirecting users to strict silos.
**Options**:
1.  **Middleware.ts (Next.js)**: Intercept requests at edge.
2.  **Higher Order Components**: Wrap pages.
3.  **Layout Checks**: Check in `layout.tsx`.

**Decision**: **Middleware.ts**.
**Rationale**: Best performance and security. We can check the Supabase session token and custom claims (role) *before* the page even renders, preventing "flash of unauthorized content" and reducing server load.

## Decision 4: Chart Library for Students
**Problem**: Visualizing aggregate data on mobile.
**Options**:
1.  **Recharts**: Standard for React, composable.
2.  **Chart.js**: Imperative, maybe heavy.
3.  **Tremor**: High-level, beautiful defaults.

**Decision**: **Recharts** (or **Tremor** if rapid UI needed).
**Rationale**: Recharts gives granular control which might be needed for specific "Climate" visualizations, but Tremor is great for "Teacher Sanity" dashboards (speed of impl). We will start with **Recharts** for flexibility in the "Student Feedback" view.

## Decision 5: Role-Based Layouts in App Router
**Problem**: Where to enforce role segregation inside the App Router?
**Options**:
1.  Per-route checks inside individual pages.
2.  Shared `(dashboard)` layout with conditional logic.
3.  Separate role-specific layouts under `(dashboard)/student`, `(dashboard)/teacher`, `(dashboard)/admin`.

**Decision**: Use **role-specific layouts** under `/app/(dashboard)/student`, `/teacher`, `/admin` combined with `middleware.ts`.
**Rationale**: Middleware enforces security at the edge (auth/role guard) while layouts provide consistent navigation and UX per role, avoiding duplicated access-control code in every page.

## Pending Questions
- [ ] Needs Clarification: Specific "Hybrid Scoring" algorithm implementation details (is it an API call to n8n? or internal logic?).
    - *Assumption*: For this sitemap feature, we only display the *result* (Risk Indicator). Calculation logic is a separate feature or mocked for now.
