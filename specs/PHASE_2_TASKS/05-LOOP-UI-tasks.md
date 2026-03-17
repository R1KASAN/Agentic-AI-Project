# Phase 2 Loop Closure UI Enhancement Tasks
**Workstream**: Self-Evaluation & Loop Closure Dashboard  
**Duration**: Week 4-5 (Days 22-35)  
**Status**: Ready for Sprint Planning  
**Dependencies**: INFRA (all), DB-MIGRATIONS (all), W07 (full), W06 (full)

---

## Workstream Summary

Dashboard enhancement enabling the **self-evaluation loop (Loop4)** of the agentic system. Teachers mark recommendations "Done" with structured feedback, which feeds into metrics display + next briefing/alert personalization.

### What It Delivers
- ✅ ActionHistory page (`/teacher/class/[id]/actions`)
- ✅ ClosureModal component (5-option dropdown + feedback textarea)
- ✅ MetricsCard component (closure rate, response latency, top actions)
- ✅ Nightly aggregation job (compute engagement stats)
- ✅ API endpoints (history, close, stats)
- ✅ E2E closure flow testing

### Constitutional Alignment
- **Principle III**: Loop closure data tracked (closure_status, latency, feedback)
- **Principle IV**: Teacher agency in marking done + feedback
- **Principle VI**: Metrics visible (closure rate, action patterns) for reflection

### Risks & Mitigation
| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Low adoption** | Teachers don't mark done (closure rate <30%) | Simplify modal (2 inputs), inline placement, show impact metrics |
| **Nightly aggregation timeouts** | Metrics not computed; dashboard shows stale data | Use materialized view + incremental updates vs. full recompute |
| **Feedback text quality** | Teachers enter "ok" or empty; no learning signal | Optional feedback; show examples in modal ("e.g., 'Class responded well to energizer'") |

---

## Task Summary Table

| Task ID | Title | Effort | Dependencies | Assigned | Status |
|---------|-------|--------|--------------|----------|--------|
| LOOP-001 | Design closure workflow & feedback structure | 1 day | W06, W07 | Backend | Ready |
| LOOP-002 | Create API endpoints (history, close, stats) | 1.5 days | DB-022 | Backend | Ready |
| LOOP-003 | Build ClosureModal component | 1 day | LOOP-002 | Frontend | Ready |
| LOOP-004 | Build MetricsCard component | 1 day | LOOP-002 | Frontend | Ready |
| LOOP-005 | Build ActionHistory page + integration | 1.5 days | LOOP-003, LOOP-004 | Frontend | Ready |
| LOOP-006 | Design + implement nightly aggregation job | 1.5 days | DB-024 | Backend | Ready |
| LOOP-007 | Unit test: closure API + aggregation logic | 1.5 days | LOOP-002, LOOP-006 | QA | Ready |
| LOOP-008 | E2E test: teacher marks done → metrics updated | 1.5 days | LOOP-005 | QA | Ready |
| LOOP-009 | Feedback analysis & adoption metrics | 1 day | LOOP-008 | QA | Ready |

**Total Effort**: ~12 days (1.5 engineers across backend, frontend, QA)

---

## Detailed Task Cards

### LOOP-001: Design Closure Workflow & Feedback Structure
**Epic**: Foundation → Design  
**Status**: Not Started

#### Description
Design how teachers will mark recommendations as done + structure feedback for learning. Key decisions:
1. **Trigger**: When/where does teacher mark done? (inline dashboard, separate page, modal)
2. **Action types**: Which action categories to capture? (5 proposed: icebreaker, check-in, content revisit, pacing, other)
3. **Feedback**: Optional or required? Structure: free text? Pre-defined options?
4. **Metrics**: What to aggregate nightly? (closure rate, latency, action histogram)

#### Implementation Details

**Closure Workflow Pseudocode**:
```
Teacher views ActionHistory page
  → See past 30 days recommendations
  → Status: Pending, Implemented, Dismissed
  → Sort by date, filter by status

Teacher clicks "Mark as Done" on recommendation
  → Modal opens: "How'd it go?"
  → Required: Select action type (dropdown)
     - Icebreaker / energizer
     - One-on-one check-in
     - Revisit content / re-explain
     - Adjusted pacing / breaks
     - Other
  → Optional: Text feedback ("What did you try?")
  → Button: "Submit"

On submit:
  → POST /api/recommendations/:id/close
  → Update DB: closure_status='implemented', teacher_action_type, teacher_feedback_text, closure_timestamp
  → N8N webhook: log decision to audit trail
  → Dashboard: show success toast + reload metrics

Nightly (01:00 UTC):
  → Aggregate: closure_rate_7d%, closure_rate_30d%, avg_latency, action_histogram
  → Store in teacher_engagement_stats table
  → Available for next day's briefing personalization
```

**Feedback Structure**:
- Optional text: allows rich context ("tried energizer but class was tired")
- Required action type: provides taxonomy for learning
- Timestamp: allows latency analysis (how quickly did teacher act?)

**Why This Task Exists**: Closure workflow design prevents scope creep + ensures UX is simple.

**Loop Stage**: Self-Evaluate (teacher reflection), Learn (feedback collected)  
**Constitutional Principle**: III (loop closure), IV (teacher agency + feedback), VI (reflection mechanism)

#### Acceptance Criteria
1. ✅ Workflow documented with pseudocode + sequence diagram
2. ✅ 5 action types defined with clear distinctions
3. ✅ Metrics to aggregate defined (6+ metrics)
4. ✅ UI flow designed (where does modal appear?)
5. ✅ Feedback structure: required vs. optional fields clear

#### DoD
- [ ] Design document: `docs/LOOP_CLOSURE_WORKFLOW.md`
- [ ] UI wireframe: `docs/LOOP_UI_WIREFRAME.md`
- [ ] Sample feedback: `docs/LOOP_FEEDBACK_EXAMPLES.md`

---

### LOOP-002: Create API Endpoints (History, Close, Stats)
**Epic**: Backend → API Layer  
**Status**: Not Started

#### Description
Three REST endpoints for closure tracking:
1. `GET /api/recommendations/history?classId=:classId` — Fetch recommendation history
2. `POST /api/recommendations/:id/close` — Mark recommendation done + store feedback
3. `GET /api/classrooms/:classId/stats` — Fetch closure metrics

#### Implementation Details
```typescript
// src/app/api/recommendations/history/route.ts
export async function GET(request: Request) {
  const { classId } = Object.fromEntries(new URL(request.url).searchParams);
  
  const history = await supabase
    .from('recommendations')
    .select('*')
    .eq('class_id', classId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000))
    .order('created_at', { ascending: false });
  
  return Response.json(history.data);
}

// src/app/api/recommendations/[id]/close/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { action_type, feedback_text, class_id } = await request.json();
  
  // Validate action_type
  const validTypes = ['icebreaker_energizer', 'one_on_one_checkin', 'content_revisit', 'pacing_breaks', 'other'];
  if (action_type && !validTypes.includes(action_type)) {
    return Response.json({ error: 'Invalid action type' }, { status: 400 });
  }
  
  // Calculate closure latency
  const created = await supabase
    .from('recommendations')
    .select('created_at')
    .eq('id', params.id)
    .single();
  
  const latencyHours = (Date.now() - new Date(created.data.created_at).getTime()) / (1000 * 3600);
  
  // Update recommendation
  const updated = await supabase
    .from('recommendations')
    .update({
      closure_status: 'implemented',
      closure_timestamp: new Date(),
      closure_latency_hours: latencyHours,
      teacher_action_type: action_type,
      teacher_feedback_text: feedback_text || null
    })
    .eq('id', params.id);
  
  // Log to audit trail
  await logAuditEvent('recommendation_closed', {
    recommendation_id: params.id,
    action_type,
    latency_hours: latencyHours
  });
  
  // Revalidate cache
  revalidatePath(`/teacher/class/${class_id}`);
  
  return Response.json({ success: true, closureLatencyHours: latencyHours });
}

// src/app/api/classrooms/[classId]/stats/route.ts
export async function GET(request: Request, { params }: { params: { classId: string } }) {
  const classId = params.classId;
  
  // Fetch from teacher_engagement_stats (updated nightly)
  const stats = await supabase
    .from('teacher_engagement_stats')
    .select('*')
    .eq('class_id', classId)
    .order('stat_date', { ascending: false })
    .limit(1)
    .single();
  
  return Response.json({
    closure_rate_7d: stats.data?.closure_rate_7d_percent || 0,
    closure_rate_30d: stats.data?.closure_rate_30d_percent || 0,
    avg_closure_latency_hours: stats.data?.avg_closure_latency_hours_30d || 0,
    action_type_histogram: stats.data?.action_type_histogram || {},
    recommendations_sent_7d: stats.data?.recommendations_sent_7d || 0,
    recommendations_implemented_7d: stats.data?.recommendations_implemented_7d || 0
  });
}
```

**Why This Task Exists**: Frontend needs API to fetch/update closure data. Without API, dashboard can't support closure workflow.

**Loop Stage**: Self-Evaluate (storing closure), Learn (reading metrics)  
**Constitutional Principle**: III (closure tracking)

#### Acceptance Criteria
1. ✅ GET history: returns 30-day recommendation history, sorted by date DESC
2. ✅ POST close: validates action_type, calculates latency, updates DB
3. ✅ GET stats: returns aggregated metrics from teacher_engagement_stats
4. ✅ All endpoints: proper error handling, permission checks, audit logging

#### DoD
- [ ] Unit test: `__tests__/api/recommendations.test.ts`
- [ ] All endpoints tested with sample data

---

### LOOP-003: Build ClosureModal Component
**Epic**: Frontend → UI Components  
**Status**: Not Started

#### Description
Modal dialog that appears when teacher clicks "Mark Done" on a recommendation. Contains:
- Action type dropdown (5 options)
- Optional feedback textarea
- Submit button
- Cancel button

#### Implementation Details
```typescript
// src/components/domain/teacher/ClosureModal.tsx
'use client';

import { useState } from 'react';

const ACTION_TYPES = [
  { value: 'icebreaker_energizer', label: 'Icebreaker / energizer' },
  { value: 'one_on_one_checkin', label: 'One-on-one check-in' },
  { value: 'content_revisit', label: 'Revisit content / re-explain' },
  { value: 'pacing_breaks', label: 'Adjusted pacing / breaks' },
  { value: 'other', label: 'Other' }
];

export function ClosureModal({ recommendation, onClose, onSubmit }) {
  const [actionType, setActionType] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!actionType) {
      alert('Please select an action');
      return;
    }

    setLoading(true);
    await onSubmit({
      action_type: actionType,
      feedback_text: feedback
    });
    setLoading(false);
    onClose();
  };

  return (
    <dialog open className="modal">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg">How'd it go?</h3>
        
        <div className="py-4">
          <p className="text-sm text-gray-600 mb-4">
            Mark <span className="font-semibold">{recommendation.recommendation_title}</span> as done.
          </p>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">What action did you take?</span>
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="select select-bordered"
              required
            >
              <option value="">Select an action...</option>
              {ACTION_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">Feedback (optional)</span>
              <span className="label-text-alt text-xs text-gray-500">
                e.g., "Class responded well to energizer"
              </span>
            </label>
            <textarea
              placeholder="What happened? How did students respond?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="textarea textarea-bordered h-24"
              maxLength={500}
            />
            <label className="label">
              <span className="label-text-alt">{feedback.length}/500 characters</span>
            </label>
          </div>
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={loading || !actionType}
            className="btn btn-primary"
          >
            {loading ? 'Saving...' : 'Mark Done'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

**Why This Task Exists**: Modal collects structured closure feedback. Simple UX with clear labels + examples.

**Loop Stage**: Self-Evaluate (teacher reflection)  
**Constitutional Principle**: III (closure data capture), IV (teacher feedback mechanism)

#### Acceptance Criteria
1. ✅ Dropdown shows all 5 action types
2. ✅ Feedback textarea: max 500 chars, optional
3. ✅ Submit button: disabled until action_type selected
4. ✅ Character counter visible for textarea
5. ✅ Examples shown inline (helpful hints)

#### DoD
- [ ] Component created in `src/components/domain/teacher/ClosureModal.tsx`
- [ ] Unit test: renders, dropdown works, submit validates

---

### LOOP-004: Build MetricsCard Component
**Epic**: Frontend → UI Components  
**Status**: Not Started

#### Description
Dashboard card that displays closure metrics:
- Closure rate (7d, 30d)
- Most used action type
- Average closure latency (hours)
- Engagement trend (sparkline or simple bar)

#### Implementation Details
```typescript
// src/components/domain/teacher/MetricsCard.tsx
'use client';

export function MetricsCard({ classId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const res = await fetch(`/api/classrooms/${classId}/stats`);
      setStats(await res.json());
      setLoading(false);
    };
    fetch();
  }, [classId]);

  if (loading) return <div className="skeleton h-40"></div>;
  if (!stats) return null;

  const topAction = stats.action_type_histogram
    ? Object.entries(stats.action_type_histogram).sort((a, b) => b[1] - a[1])[0]
    : null;

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="card-title flex items-center gap-2">
          📊 Engagement Metrics
          <span className="badge badge-sm badge-primary">Last 30 days</span>
        </h3>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Closure Rate */}
          <div className="stat">
            <div className="stat-title text-xs">Closure Rate (7d)</div>
            <div className="stat-value text-2xl text-primary">
              {Math.round(stats.closure_rate_7d)}%
            </div>
            <div className="stat-desc text-xs">
              {stats.recommendations_implemented_7d} of {stats.recommendations_sent_7d}
            </div>
          </div>

          {/* Avg Latency */}
          <div className="stat">
            <div className="stat-title text-xs">Avg Response Time</div>
            <div className="stat-value text-2xl text-accent">
              {Math.round(stats.avg_closure_latency_hours)}h
            </div>
            <div className="stat-desc text-xs">From send to done</div>
          </div>
        </div>

        {/* Top Action Type */}
        {topAction && (
          <div className="mt-4 p-3 bg-base-200 rounded">
            <p className="text-xs text-gray-600">Most Used Action</p>
            <p className="font-semibold">
              {topAction[0].replace(/_/g, ' ').toUpperCase()}
            </p>
            <p className="text-xs text-gray-600">{topAction[1]} times</p>
          </div>
        )}

        {/* Helpful Note */}
        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <p>💡 Higher closure rates and shorter response times help us personalize your briefings better.</p>
        </div>
      </div>
    </div>
  );
}
```

**Why This Task Exists**: Teachers need visibility into their engagement patterns. Metrics motivate adoption + show impact of closure feedback.

**Loop Stage**: Self-Evaluate (metrics reflection), Learn (informing next steps)  
**Constitutional Principle**: III (transparency in loop closure data), VI (teacher partnership metrics)

#### Acceptance Criteria
1. ✅ Card displays closure rate (7d, 30d)
2. ✅ Shows avg latency + recommendation count
3. ✅ Top action type highlighted
4. ✅ Responsive: works on mobile + desktop
5. ✅ Loads stats via API; handles loading state

#### DoD
- [ ] Component created & integrated with dashboard
- [ ] Unit test: renders, fetches data, displays metrics

---

### LOOP-005: Build ActionHistory Page + Integration
**Epic**: Frontend → Dashboard Page  
**Status**: Not Started

#### Description
Create RSC page (`/teacher/class/[id]/actions`) that displays:
1. Recommendation history table (30 days, sortable by date/status)
2. Status filters (All, Pending, Implemented, Dismissed)
3. "Mark Done" button per recommendation (opens ClosureModal)
4. MetricsCard at top

#### Implementation Details
```typescript
// src/app/(dashboard)/teacher/class/[id]/actions/page.tsx (RSC)

export default async function ActionHistoryPage({ params }: { params: { id: string } }) {
  const history = await fetch(`http://localhost:3000/api/recommendations/history?classId=${params.id}`, {
    headers: { cookie: cookies().toString() }
  }).then(r => r.json());

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Recommendation History</h1>

      {/* Metrics Card */}
      <MetricsCard classId={params.id} />

      {/* History Table */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Past 30 Days</h2>
        <ActionHistoryTable recommendations={history} classId={params.id} />
      </div>
    </div>
  );
}

// Client component for interactivity
'use client';

function ActionHistoryTable({ recommendations, classId }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);
  const [filter, setFilter] = useState('all'); // all, pending, implemented, dismissed

  const filtered = recommendations.filter(r => {
    if (filter === 'all') return true;
    return r.closure_status === filter;
  });

  const handleMarkDone = (rec) => {
    setSelectedRec(rec);
    setShowModal(true);
  };

  const handleSubmitClosure = async (data) => {
    await fetch(`/api/recommendations/${selectedRec.id}/close`, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        class_id: classId
      })
    });
    setShowModal(false);
    window.location.reload(); // Reload to update table + metrics
  };

  return (
    <div>
      {/* Filters */}
      <div className="tabs mb-4">
        {['all', 'pending', 'implemented', 'dismissed'].map(status => (
          <button
            key={status}
            className={`tab ${filter === status ? 'tab-active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>Date</th>
              <th>Recommendation</th>
              <th>Status</th>
              <th>Your Response</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(rec => (
              <tr key={rec.id}>
                <td>{new Date(rec.created_at).toLocaleDateString()}</td>
                <td>
                  <p className="font-semibold">{rec.recommendation_title}</p>
                  <p className="text-sm text-gray-600">{rec.description}</p>
                </td>
                <td>
                  <badge className={`badge badge-${getStatusColor(rec.closure_status)}`}>
                    {rec.closure_status}
                  </badge>
                </td>
                <td>
                  {rec.teacher_feedback_text && (
                    <p className="text-sm italic">"{rec.teacher_feedback_text}"</p>
                  )}
                  {!rec.teacher_feedback_text && rec.closure_status === 'pending' && (
                    <p className="text-xs text-gray-400">Not yet responded</p>
                  )}
                </td>
                <td>
                  {rec.closure_status === 'pending' && (
                    <button
                      onClick={() => handleMarkDone(rec)}
                      className="btn btn-sm btn-primary"
                    >
                      Mark Done
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && selectedRec && (
        <ClosureModal
          recommendation={selectedRec}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitClosure}
        />
      )}
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'implemented': return 'success';
    case 'pending': return 'warning';
    case 'dismissed': return 'neutral';
    default: return 'default';
  }
}
```

**Why This Task Exists**: ActionHistory page is where teachers spend time marking done. Easy access + clear UX are critical for adoption.

**Loop Stage**: Self-Evaluate (full history + metrics visibility)  
**Constitutional Principle**: III (closure transparency), VI (reflection on teacher actions)

#### Acceptance Criteria
1. ✅ Page loads history + metrics
2. ✅ Filters work: All, Pending, Implemented, Dismissed
3. ✅ "Mark Done" button opens ClosureModal
4. ✅ Table shows feedback text where provided
5. ✅ Responsive + accessible

#### DoD
- [ ] Page created at `/teacher/class/[id]/actions`
- [ ] Integrated with main dashboard navigation
- [ ] Unit/E2E test: page loads, filters work, modal opens

---

### LOOP-006: Design + Implement Nightly Aggregation Job
**Epic**: Backend → Data Pipeline  
**Status**: Not Started

#### Description
Nightly job (01:00 UTC) that computes teacher engagement metrics for the next day's briefing personalization. Source: `recommendations` + `n8n_audit_log`. Outputs: `teacher_engagement_stats` table.

#### Implementation Details

**Option 1: N8N Sub-Workflow (recommended)**
```json
{
  "name": "nightly-engagement-aggregation",
  "trigger": "cron(0 1 * * *, # 01:00 UTC)",
  "nodes": [
    {
      "type": "n8n-nodes-base.postgres",
      "name": "Get All Active Teachers",
      "parameters": {
        "query": "SELECT DISTINCT teacher_id FROM class_enrollments WHERE role='teacher' AND created_at < NOW() - INTERVAL '30 days'"
      }
    },
    {
      "type": "n8n-nodes-base.splitInBatches",
      "name": "Loop Teachers"
    },
    {
      "type": "n8n-nodes-base.postgres",
      "name": "Calculate Closure Stats (7d)",
      "parameters": {
        "query": "SELECT teacher_id, class_id, COUNT(*) as sent_7d, COUNT(CASE WHEN closure_status='implemented' THEN 1 END) as impl_7d, ROUND(100.0 * COUNT(CASE WHEN closure_status='implemented' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as closure_rate_7d... FROM recommendations WHERE teacher_id=$1 AND created_at >= NOW() - INTERVAL '7 days' GROUP BY teacher_id, class_id"
      }
    },
    {
      "type": "n8n-nodes-base.postgres",
      "name": "Upsert teacher_engagement_stats",
      "parameters": {
        "operation": "upsert",
        "table": "teacher_engagement_stats"
      }
    }
  ]
}
```

**Option 2: Next.js API Route + Scheduled Task**
```typescript
// src/app/api/admin/compute-engagement-stats/route.ts
export async function POST(request: Request) {
  // Validate admin API key
  if (request.headers.get('x-admin-secret') !== process.env.ADMIN_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all active teachers
  const teachers = await supabase.rpc('get_all_active_teachers');

  for (const teacher of teachers.data) {
    // Calculate 7-day stats
    const stats7d = await supabase.rpc('calculate_closure_stats_7d', {
      p_teacher_id: teacher.id
    });

    // Calculate 30-day stats
    const stats30d = await supabase.rpc('calculate_closure_stats_30d', {
      p_teacher_id: teacher.id
    });

    // Upsert into teacher_engagement_stats
    await supabase
      .from('teacher_engagement_stats')
      .upsert({
        teacher_id: teacher.id,
        class_id: stats7d.class_id,
        stat_date: new Date().toISOString().split('T')[0],
        recommendations_sent_7d: stats7d.sent,
        recommendations_implemented_7d: stats7d.implemented,
        closure_rate_7d_percent: stats7d.rate,
        ...stats30d
      }, {
        onConflict: ['teacher_id', 'class_id', 'stat_date']
      });
  }

  return Response.json({ success: true });
}
```

**Scheduled trigger** (via GitHub Actions or cron):
```yaml
name: Nightly Engagement Aggregation
on:
  schedule:
    - cron: '0 1 * * *' # Daily at 01:00 UTC

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - name: Compute engagement stats
        run: |
          curl -X POST https://climate-agent.vercel.app/api/admin/compute-engagement-stats \
            -H "x-admin-secret: ${{ secrets.ADMIN_SECRET }}"
```

**Why This Task Exists**: W06 LLM needs fresh teacher engagement data for personalization. Nightly aggregation ensures data is ready before 7:30 AM briefing generation.

**Loop Stage**: Learn (aggregating engagement metrics)  
**Constitutional Principle**: III (collecting loop closure data), VI (feeding back into personalization)

#### Acceptance Criteria
1. ✅ Job runs nightly at 01:00 UTC
2. ✅ Computes all 8 metrics from recommendations table
3. ✅ Stores in teacher_engagement_stats (upsert, no duplicates)
4. ✅ Execution time <5 minutes (100 teachers × 5 classes avg)
5. ✅ Rollback: can recompute missed days

#### DoD
- [ ] N8N sub-workflow OR API route + scheduler configured
- [ ] Test run: compute stats for 10 test teachers; verify metrics
- [ ] Scheduled job setup documented

---

### LOOP-007: Unit Test: Closure API + Aggregation Logic
**Epic**: QA → Testing  
**Status**: Not Started

#### Description
Unit tests for closure API endpoints + aggregation logic.

#### Test Cases (15+ total)
```typescript
// __tests__/api/recommendations.test.ts

test('POST /api/recommendations/:id/close updates record + calculates latency', async () => {
  const created = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  const rec = await createTestRec({ created_at: created });

  const res = await fetch(`/api/recommendations/${rec.id}/close`, {
    method: 'POST',
    body: JSON.stringify({
      action_type: 'icebreaker_energizer',
      feedback_text: 'Class loved it'
    })
  });

  expect(res.status).toBe(200);
  const updated = await getRec(rec.id);
  expect(updated.closure_status).toBe('implemented');
  expect(updated.closure_latency_hours).toBeCloseTo(1, 0);
  expect(updated.teacher_action_type).toBe('icebreaker_energizer');
});

test('aggregation computes closure_rate_7d correctly', async () => {
  const teacher = await createTestTeacher();
  const class1 = await createTestClass();

  // Create 10 recommendations, implement 7
  for (let i = 0; i < 10; i++) {
    const rec = await createTestRec({ teacher_id: teacher.id, class_id: class1.id });
    if (i < 7) {
      await markDone(rec.id, 'icebreaker_energizer');
    }
  }

  await runAggregation(teacher.id, class1.id);
  const stats = await getStats(teacher.id, class1.id);

  expect(stats.closure_rate_7d_percent).toBe(70);
  expect(stats.recommendations_implemented_7d).toBe(7);
});

test('aggregation builds action_type_histogram', async () => {
  // Create 10 recs: 5 icebreaker, 3 check-in, 2 other
  // Mark done with action types
  // Aggregate
  // Verify histogram: { icebreaker_energizer: 5, one_on_one_checkin: 3, other: 2 }

  const stats = await getStats(teacher.id, class1.id);
  expect(stats.action_type_histogram).toEqual({
    icebreaker_energizer: 5,
    one_on_one_checkin: 3,
    other: 2
  });
});
```

**Why This Task Exists**: Closure API + aggregation are critical for Loop data flow. Testing ensures data integrity.

**Loop Stage**: Self-Evaluate (testing closure data capture), Learn (testing aggregation)  
**Constitutional Principle**: III (verifying loop closure data quality)

#### Acceptance Criteria
1. ✅ 15+ test cases covering API + aggregation paths
2. ✅ All tests pass
3. ✅ Code coverage >85%

#### DoD
- [ ] Test file: `__tests__/api/recommendations-closure.test.ts`
- [ ] Aggregation tests: `__tests__/lib/engagement-aggregation.test.ts`

---

### LOOP-008: E2E Test: Teacher Marks Done → Metrics Updated
**Epic**: QA → E2E Testing  
**Status**: Not Started

#### Description
Full user journey: teacher opens ActionHistory → marks recommendation done → modal processes → dashboard metrics updated.

#### Test Flow
1. Create test class with 10 students + 5 recommendations
2. Log in as teacher
3. Navigate to `/teacher/class/[id]/actions`
4. Verify ActionHistory page loads with 5 pending recommendations
5. Click "Mark Done" on first recommendation
6. Modal opens; select action type + add feedback
7. Submit; verify API call + success toast
8. Verify recommendation status changed to "implemented" in table
9. Verify MetricsCard updated (closure rate changed)
10. Audit log: decision_type='recommendation_closed' entry created

#### Acceptance Criteria
1. ✅ ActionHistory page loads correctly
2. ✅ Modal opens + closes properly
3. ✅ Form submission: action_type required, feedback optional
4. ✅ API call made + DB updated
5. ✅ Metrics card reflects new closure rate
6. ✅ Audit trail recorded

#### DoD
- [ ] E2E test: `e2e/loop-closure-flow.spec.ts` (Playwright)
- [ ] Test passes in staging

---

### LOOP-009: Feedback Analysis & Adoption Metrics
**Epic**: QA → Feedback & Iteration  
**Status**: Not Started

#### Description
Analyze closure adoption & feedback quality during Week 4-5. Metrics:
1. **Adoption rate**: % of pending recommendations marked done within 48h
2. **Feedback utility**: % of closures with feedback text + feedback quality
3. **Action type distribution**: Most common actions (validates hypothesis)
4. **Latency**: How long from recommendation to closure?

Use findings to:
- Identify barriers to adoption (if <30%, simplify modal)
- Validate personalization assumptions (if certain actions dominate, personalize to match)
- Improve next iteration (Phase 3)

#### Acceptance Criteria
1. ✅ Dashboard report: `docs/LOOP_ADOPTION_METRICS.md`
2. ✅ 20+ recommendations marked done (across pilot classes)
3. ✅ Feedback analysis: quality + actionability assessed
4. ✅ Recommendations for Phase 3 documented

#### DoD
- [ ] Adoption metrics report created
- [ ] Feedback examples included (anonymized)

---

## Dependency Graph

```
LOOP-001 (Design Workflow)
  ↓
LOOP-002 (API Endpoints) ──→ LOOP-007 (Unit Test)
  ↓
LOOP-003 (ClosureModal)
  ↓
LOOP-004 (MetricsCard)
  ↓
LOOP-005 (ActionHistory Page) ──→ LOOP-008 (E2E Test)
  ↓
LOOP-006 (Nightly Aggregation) ──→ LOOP-009 (Adoption Metrics)
```

All tasks depend on W07 and W06 being complete + ready for integration.

---

## Team Assignments (Recommended)

| Role | Assigned Tasks | Effort | Timeline |
|------|----------------|--------|----------|
| Backend Engineer (0.5) | LOOP-002, LOOP-006 | 3 days | Week 4–5 |
| Frontend Engineer (1) | LOOP-003–005 | 4.5 days | Week 4–5 |
| QA Engineer (1) | LOOP-007–009 | 4 days | Week 4–5 |

---

## Success Criteria (Workstream Level)

✅ All 9 tasks completed & tested  
✅ LOOP-008 E2E test passes (full closure flow works)  
✅ LOOP-009 Adoption metrics: >40% of recommendations marked done, feedback quality >3/5  
✅ Nightly aggregation job running successfully  
✅ Metrics visible on dashboard + feeding into W06 personalization  

---

## Artifacts Delivered

| Artifact | Location | Owner |
|----------|----------|-------|
| Workflow Design | `docs/LOOP_CLOSURE_WORKFLOW.md` | Backend |
| API Endpoints | `src/app/api/recommendations/`, `src/app/api/classrooms/` | Backend |
| ClosureModal Component | `src/components/domain/teacher/ClosureModal.tsx` | Frontend |
| MetricsCard Component | `src/components/domain/teacher/MetricsCard.tsx` | Frontend |
| ActionHistory Page | `src/app/(dashboard)/teacher/class/[id]/actions/page.tsx` | Frontend |
| Aggregation Job | N8N sub-workflow OR API route + scheduler | Backend |
| Adoption Metrics Report | `docs/LOOP_ADOPTION_METRICS.md` | QA |

