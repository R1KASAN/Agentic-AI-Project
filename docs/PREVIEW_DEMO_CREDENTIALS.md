# Preview Demo Credentials

Use these credentials when verifying the Vercel preview for the demo environment.

- Teacher: `teacher@demo.com` / `password123`
- Student: `student1@demo.com` / `password123`

Setup note:

- Apply the latest Supabase migrations first.
- Provision demo auth accounts with `npm run demo:provision-auth`.
- Seed the domain demo data with `supabase/seed/presentation-dataset.sql`.

Expected landing pages:

- Teacher password login -> `/teacher`
- Student password login -> `/student/classes`
- Magic link remains a fallback path if password auth is unavailable in a dev-only environment

Verification checklist:

1. Open `/login` on the active preview alias in a clean browser session.
2. Sign in as the teacher and confirm redirect to `/teacher`.
3. Sign in as the student and confirm redirect to `/student/classes`.
4. Confirm the student can see class cards, open check-in for a chosen class, and open per-class feedback from the Feedback menu.
