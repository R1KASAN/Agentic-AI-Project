# Quickstart: Sitemap & Navigation Feature

## Goal
Verify the role-based routing and basic database schema for the Class Climate System.

## Prerequisites
- Node.js 18+
- Supabase Project (local or cloud)

## Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # For Admin/Edge Functions
```

## Setup Steps

1.  **Install Dependencies**:
    ```bash
    npm install @supabase/supabase-js @supabase/auth-helpers-nextjs lucide-react recharts
    ```

2.  **Apply Schema**:
    - Run the SQL migration in `supabase/migrations/` (to be created based on `data-model.md`).
    - Seed data: Create 1 Student, 1 Teacher, 1 Admin.

3.  **Run Dev Server**:
    ```bash
    npm run dev
    ```

4.  **Verify Routing**:
    - Login as Student -> Redirects to `/student`.
    - Login as Teacher -> Redirects to `/teacher`.
    - Login as Admin -> Redirects to `/admin`.
