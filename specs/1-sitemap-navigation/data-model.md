# Data Model: Sitemap & Navigation

## Entities

### 1. User Profile (`public.users`)
*Extends Supabase Auth*
- `id`: UUID (FK to auth.users)
- `role`: Enum (`student`, `teacher`, `admin`)
- `full_name`: String (Optional)
- `avatar_url`: String (Optional)
- `created_at`: Timestamp

### 2. Class (`public.classes`)
- `id`: UUID (PK)
- `teacher_id`: UUID (FK to public.users)
- `name`: String
- `description`: Text (Optional)
- `risk_score`: Float (0.0 - 1.0) - *Hybrid Score Cache*
- `pilot_status`: Boolean (Default: false)
- `created_at`: Timestamp

### 3. Class Enrollment (`public.class_enrollments`)
*Junction table for access control*
- `class_id`: UUID (FK)
- `student_id`: UUID (FK)
- `created_at`: Timestamp
- **Constraint**: Unique(class_id, student_id)

### 4. Check-In (`public.check_ins`)
- `id`: UUID (PK)
- `class_id`: UUID (FK)
- `student_hash`: String (SHA-256 of student_id + daily_salt?) -> *Decision: Use RLS to insert `auth.uid()` but policy prevents generic SELECT. Aggregation uses `SECURITY DEFINER` view.*
- `mood`: Enum/Int (1-5)
- `pace`: Enum/Int (1-5)
- `fairness`: Enum/Int (1-5)
- `content`: Text (Optional) -> *Retention Policy applied here*
- `created_at`: Timestamp

### 5. Recommendation (`public.recommendations`)
*AI-generated suggestions*
- `id`: UUID (PK)
- `class_id`: UUID (FK)
- `content`: Text (The suggestion)
- `status`: Enum (`pending`, `approved`, `dismissed`)
- `dismissal_reason`: Text (Optional)
- `action_taken_note`: Text (For closing the loop)
- `communicated_to_students`: Boolean (Default: false) - *Indicates whether the teacher’s action has been explicitly communicated back to students (for loop-closure tracking).*
- `created_at`: Timestamp
- `updated_at`: Timestamp

### 6. Action Log (`public.action_logs`)
*Audit trail*
- `id`: UUID (PK)
- `actor_id`: UUID (FK)
- `action_type`: String (e.g., `LOGIN`, `LOGOUT`, `APPROVE_RECOMMENDATION`, `DISMISS_RECOMMENDATION`, `UPDATE_CLASS_SETTINGS`)
- `target_id`: UUID (Optional)
- `metadata`: JSONB
- `created_at`: Timestamp

## RLS Policies (Draft)

1.  **Users**: readable by self. Admin reads all.
2.  **Classes**: Teachers read own. Students read enrolled. Admin reads all.
3.  **Check-Ins**: 
    - Students INSERT their own check-ins.
    - Option A: Students may SELECT only their own check-ins (to support a "My History" view).
    - Option B: Check-ins are write-only and only exposed via aggregate views.
    - Teachers and Admins CANNOT SELECT raw rows in any case (privacy-by-design).
    - *Aggregation View*: `public.class_stats` (Security Definer) calculates avgs/counts. Returns NULL if count < 3.

## Database Views

### `v_class_climate_summary`
- Aggregates Check-Ins by Class/Week.
- Columns: `class_id`, `week_start`, `avg_mood`, `avg_pace`, `check_in_count`.
- Logic: `CASE WHEN count < 3 THEN NULL ELSE average END`.
