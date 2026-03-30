# Preview Demo Credentials

Use these credentials when verifying the Vercel preview for the demo environment.

- Teacher: `teacher@demo.com` / `password123`
- Student: `student1@demo.com` / `password123`

Expected landing pages:

- Teacher password or magic-link login -> `/teacher`
- Student password or magic-link login -> `/student/classes`

Verification checklist:

1. Open `/login` on the active preview alias in a clean browser session.
2. Sign in as the teacher and confirm redirect to `/teacher`.
3. Sign in as the student and confirm redirect to `/student/classes`.
4. Confirm the student can see class cards, open check-in for a chosen class, and open per-class feedback from the Feedback menu.
