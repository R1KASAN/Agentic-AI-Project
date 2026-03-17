# Loop Closure UI Enhancement — Technical Implementation Plan

**Feature Branch**: `005-closure-tracking`  
**Version**: 1.0  
**Risk Level**: Low (primarily UI/dashboard enhancement; data model extends existing recommendations)  
**Estimated Effort**: 2-3 weeks (dashboard UI + API endpoints + aggregation queries)

---

## Feature Summary

Dashboard enhancement that enables the **self-evaluation loop (Loop4)** by:
1. Displaying teacher's recommendation history (past 30 days)
2. Providing a "Mark as Done" workflow with structured feedback capture
3. Computing class-level closure metrics (% implemented, response times, action types)
4. Displaying metrics on dashboard to build awareness of loop closure
5. Feeding closure data into next briefing/alert LLM prompts for personalization

**Constitutional Alignment**: Loop4 (Self-Evaluate) — Teacher marks done + provides feedback → Loop5 (Learn) — Metrics aggregated → informs future briefing tone and recommendations.

**Data Flow**:
```
Recommendation sent
  ↓ (teacher sees in historical view)
Teacher marks "Done" + provides action type + feedback
  ↓ POST /api/recommendations/:id/close
  ↓ (webhook to n8n triggers audit log + aggregation)
Aggregation: closure_rate %, action_frequency histogram
  ↓ (displayed on dashboard + fed to next W06 LLM prompt)
Next briefing personalized based on prior high-trust actions
```

---

## Architecture & Data Flow

```
┌──────────────────────────────────────────────┐
│ /teacher/class/[id]/actions (RSC page)       │
│                                              │
│ Fetch: Recommendation history (past 30 days) │
│ Sort by created_at DESC                      │
│ Display table with columns:                  │
│  • Date sent | Recommendation | Status       │
│  • Your response? | Mark Done button         │
└──────────────────────────────────────────────┘
           ↓ (teacher clicks "Mark Done")
┌──────────────────────────────────────────────┐
│ Modal: "How'd it go?"                         │
│                                              │
│ Inputs:                                       │
│  • Action type (dropdown):                   │
│    - "Icebreaker / energizer"                │
│    - "One-on-one check-in"                   │
│    - "Revisit content / re-explain"          │
│    - "Adjusted pacing / breaks"              │
│    - "Other"                                 │
│  • Optional text: "What did you try?"        │
│  • Button: "Submit"                          │
└──────────────────────────────────────────────┘
           ↓ POST /api/recommendations/:id/close
┌──────────────────────────────────────────────┐
│ Backend: Update recommendations table         │
│ SET closure_status = 'implemented'           │
│     teacher_action_type = 'icebreaker'       │
│     teacher_feedback_text = '...'            │
│     closure_timestamp = now()                │
│     closure_latency_hours = calc()           │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ N8N Webhook Receiver (optional async)        │
│ • Update n8n_audit_log                       │
│ • Tag intervention with outcome signal       │
│ • (Phase 3: Learn & adapt thresholds)        │
└──────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────┐
│ Aggregation: Dashboard Metrics Card          │
│                                              │
│ Displays:                                     │
│  • "Recommendation Response Rate: 65%"       │
│  • "Most used action: Icebreaker (40%)"      │
│  • "Average time to implement: 2.3 hours"    │
│  • "Last 7 days: 8 recommendations sent"     │
│  • "Implemented: 5 (62%)"                    │
│  • "Pending: 2 | Dismissed: 1"               │
│                                              │
│ Sources:                                      │
│  • Query: recommendations table (group by)   │
│  • Query: n8n_audit_log (aggregate)          │
└──────────────────────────────────────────────┘
           ↓ (every night @ 01:00 UTC)
┌──────────────────────────────────────────────┐
│ N8N Aggregation Job (new sub-workflow)       │
│ Calculate metrics for each teacher:          │
│  • closure_rate_7d, closure_rate_30d         │
│  • avg_response_latency                      │
│  • action_type_histogram                     │
│  • high_trust_interventions (tagged)         │
│                                              │
│ Store in teacher_engagement_stats table      │
│ (for quick dashboard query)                  │
└──────────────────────────────────────────────┘
           ↓ (fed back into W06/W07)
┌──────────────────────────────────────────────┐
│ Next Briefing LLM Prompt (personalization)   │
│                                              │
│ Include context: "This teacher prefers       │
│ icebreaker activities; prior 5 recs about    │
│ energizers had 80% implementation rate"      │
│                                              │
│ Result: Next briefing recommends similar     │
│ interventions (vs. generic suggestions)      │
└──────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: Extend `recommendations` Table

```sql
-- ALTER existing recommendations table to add closure fields
ALTER TABLE recommendations ADD COLUMN (
  -- Status lifecycle
  closure_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'acknowledged', 'implemented', 'dismissed', 'expired' (>48h)
  
  -- Teacher action context
  teacher_action_type VARCHAR(100), -- 'icebreaker', 'one-on-one', 'revisit-content', 'adjusted-pacing', 'other'
  teacher_feedback_text TEXT, -- optional open feedback
  
  -- Timeline tracking
  closure_timestamp TIMESTAMP, -- when teacher marked done
  closure_latency_hours NUMERIC(5,2), -- hours from created_at to closure_timestamp
  
  -- Response patterns (for learning)
  teacher_first_viewed_at TIMESTAMP, -- when teacher first viewed recommendation
  response_latency_minutes INT, -- minutes from creation to first view
  
  CONSTRAINT valid_closure_status CHECK (closure_status IN ('pending', 'acknowledged', 'implemented', 'dismissed', 'expired')),
  CONSTRAINT valid_action_type CHECK (
    teacher_action_type IS NULL OR teacher_action_type IN (
      'icebreaker', 'one-on-one', 'revisit-content', 'adjusted-pacing', 'other'
    )
  )
);

-- Index for fast queries on teacher's action history
CREATE INDEX idx_teacher_closure (teacher_id, closure_status, closure_timestamp);
CREATE INDEX idx_class_closure (class_id, closure_status, created_at);
```

### Table 2: New `teacher_engagement_stats` Table

```sql
-- Nightly aggregation (filled by n8n job)
CREATE TABLE teacher_engagement_stats (
  id BIGSERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- 7-day metrics
  period_start_date DATE NOT NULL,
  closure_rate_7d NUMERIC(5,2), -- % of recommendations → marked done in past 7 days
  closure_rate_30d NUMERIC(5,2), -- % of recommendations → marked done in past 30 days
  avg_response_latency_hours NUMERIC(6,2), -- avg hours from recommendation to "marked done"
  
  -- Action type distribution (past 30 days)
  action_type_histogram JSONB, -- {"icebreaker": 40, "one-on-one": 30, "other": 30} (percentages)
  
  -- High-trust interventions (>70% closure rate)
  high_trust_actions JSONB, -- ["icebreaker", "one-on-one"]
  
  -- Volume stats
  recommendations_sent_7d INT,
  recommendations_implemented_7d INT,
  recommendations_dismissed_7d INT,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(teacher_id, period_start_date)
);

-- RLS: Teachers see only their own stats
ALTER TABLE teacher_engagement_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY teacher_engagement_read ON teacher_engagement_stats
  FOR SELECT USING (teacher_id = auth.uid());
```

### Table 3: `recommendation_feedback` (Optional Future Extension)

```sql
-- Explicit feedback collection (Phase 3 enhancement)
CREATE TABLE recommendation_feedback (
  id BIGSERIAL PRIMARY KEY,
  recommendation_id BIGINT NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  feedback_type VARCHAR(50), -- 'helpful', 'not_relevant', 'too_quick', 'unclear'
  rating INT, -- 1-5 stars
  text TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### View: recommendation_history (for dashboard)

```sql
CREATE VIEW recommendation_history AS
SELECT
  r.id,
  r.class_id,
  r.teacher_id,
  r.title,
  r.description,
  r.closure_status,
  r.teacher_action_type,
  r.teacher_feedback_text,
  r.created_at,
  r.closure_timestamp,
  EXTRACT(HOUR FROM (r.closure_timestamp - r.created_at))::INT as closure_latency_hours,
  -- Correlate with mood if action → student mood improved
  CASE
    WHEN r.closure_timestamp IS NOT NULL
    THEN (SELECT AVG(mood_score) FROM student_pulses 
          WHERE class_id = r.class_id 
          AND created_at BETWEEN r.closure_timestamp AND r.closure_timestamp + INTERVAL '1 hour')
    ELSE NULL
  END as mood_post_action
FROM recommendations r
ORDER BY r.created_at DESC;
```

---

## API Endpoints

### 1. GET /api/recommendations/history

**Purpose**: Fetch recommendation history for a specific class

**Route Handler**: `src/app/api/recommendations/history/route.ts`

```typescript
export async function GET(request: Request) {
  const session = await verifySession(await cookies());
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const days = parseInt(searchParams.get('days') || '30');
  
  // Verify teacher owns class
  const classVerify = await supabase
    .from('class_enrollments')
    .select('id')
    .eq('class_id', classId)
    .eq('teacher_id', session.user.id)
    .single();
  
  if (!classVerify.data) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // Fetch history
  const history = await supabase
    .from('recommendation_history')
    .select('*')
    .eq('class_id', classId)
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString())
    .order('created_at', { ascending: false });
  
  return NextResponse.json({
    recommendations: history.data,
    total: history.data?.length || 0,
    closure_rate: calculateClosureRate(history.data)
  });
}

function calculateClosureRate(recs: any[]): number {
  if (recs.length === 0) return 0;
  const implemented = recs.filter(r => r.closure_status === 'implemented').length;
  return Math.round((implemented / recs.length) * 100);
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "title": "Start with a quick check-in",
      "closure_status": "implemented",
      "teacher_action_type": "one-on-one",
      "teacher_feedback_text": "Worked well, students opened up",
      "created_at": "2026-03-16T07:35:00Z",
      "closure_timestamp": "2026-03-16T09:15:00Z",
      "closure_latency_hours": 2,
      "mood_post_action": 3.5
    }
  ],
  "total": 12,
  "closure_rate": 65
}
```

### 2. POST /api/recommendations/:id/close

**Purpose**: Teacher marks recommendation as "Done" with optional action details

**Route Handler**: `src/app/api/recommendations/[id]/close/route.ts`

```typescript
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await verifySession(await cookies());
  const { action_type, feedback_text } = await request.json();
  
  // 1. Fetch recommendation to verify ownership
  const rec = await supabase
    .from('recommendations')
    .select('*, classes(teacher_id)')
    .eq('id', params.id)
    .single();
  
  if (rec.data?.classes.teacher_id !== session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  // 2. Calculate latency
  const now = new Date();
  const createdAt = new Date(rec.data.created_at);
  const closureLatencyHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  // 3. Update recommendation
  await supabase
    .from('recommendations')
    .update({
      closure_status: 'implemented',
      teacher_action_type: action_type,
      teacher_feedback_text: feedback_text,
      closure_timestamp: now.toISOString(),
      closure_latency_hours: closureLatencyHours
    })
    .eq('id', params.id);
  
  // 4. Audit log for n8n learning
  await supabase
    .from('n8n_audit_log')
    .insert({
      workflow_name: 'Loop_Closure_UI',
      decision_type: 'closure_recorded',
      class_id: rec.data.class_id,
      teacher_id: session.user.id,
      teacher_action_type: action_type,
      closure_latency_hours: closureLatencyHours,
      payload: {
        recommendation_id: params.id,
        action_type,
        feedback: feedback_text
      },
      action_taken: 'teacher marked recommendation done'
    });
  
  // 5. (Optional) Trigger n8n job to check if mood improved post-action
  // await fetch('http://localhost:5678/webhook/recommendation-closed', {...})
  
  // 6. Revalidate dashboard
  revalidatePath(`/teacher/class/${rec.data.class_id}`);
  
  return NextResponse.json({
    success: true,
    closure_latency_hours: closureLatencyHours,
    recommendation_id: params.id
  });
}
```

**Request**:
```json
{
  "action_type": "icebreaker",
  "feedback_text": "Did a quick 2-minute mood check; students were more open after"
}
```

**Response**:
```json
{
  "success": true,
  "closure_latency_hours": 2.3,
  "recommendation_id": "uuid"
}
```

### 3. GET /api/recommendations/closure-stats

**Purpose**: Class-level and teacher-level metrics

**Route Handler**: `src/app/api/recommendations/closure-stats/route.ts`

```typescript
export async function GET(request: Request) {
  const session = await verifySession(await cookies());
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('class_id');
  const days = parseInt(searchParams.get('days') || '7');
  
  // Fetch precomputed stats (from nightly job)
  const stats = await supabase
    .from('teacher_engagement_stats')
    .select('*')
    .eq('teacher_id', session.user.id)
    .gte('period_start_date', new Date(Date.now() - days * 86400000)
      .toISOString()
      .split('T')[0])
    .order('period_start_date', { ascending: false })
    .limit(1);
  
  if (stats.data?.length === 0) {
    // Fallback: compute on-the-fly if stats not yet generated
    const computed = await computeStatsOnTheFly(session.user.id, classId, days);
    return NextResponse.json(computed);
  }
  
  return NextResponse.json(stats.data[0]);
}

async function computeStatsOnTheFly(
  teacherId: string,
  classId: string,
  days: number
): Promise<any> {
  const recs = await supabase
    .from('recommendations')
    .select('*')
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
    .gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
  
  const data = recs.data || [];
  const implemented = data.filter(r => r.closure_status === 'implemented');
  
  const actionTypeHistogram = data.reduce((acc: any, r) => {
    if (r.teacher_action_type) {
      acc[r.teacher_action_type] = (acc[r.teacher_action_type] || 0) + 1;
    }
    return acc;
  }, {});
  
  // Convert counts to percentages
  const total = Object.values(actionTypeHistogram).reduce((a: number, b: any) => a + b, 0) || 1;
  const histogram = Object.fromEntries(
    Object.entries(actionTypeHistogram).map(([k, v]: [string, any]) => [k, Math.round((v / total) * 100)])
  );
  
  return {
    period_start_date: new Date(Date.now() - days * 86400000).toISOString().split('T')[0],
    closure_rate_7d: Math.round((implemented.length / data.length) * 100),
    avg_response_latency_hours: (data.reduce((sum, r) => sum + (r.closure_latency_hours || 0), 0) / implemented.length).toFixed(1),
    action_type_histogram: histogram,
    recommendations_sent_7d: data.length,
    recommendations_implemented_7d: implemented.length
  };
}
```

**Response**:
```json
{
  "period_start_date": "2026-03-09",
  "closure_rate_7d": 65,
  "closure_rate_30d": 58,
  "avg_response_latency_hours": "2.3",
  "action_type_histogram": {
    "icebreaker": 40,
    "one-on-one": 30,
    "other": 30
  },
  "high_trust_actions": ["icebreaker", "one-on-one"],
  "recommendations_sent_7d": 10,
  "recommendations_implemented_7d": 6,
  "recommendations_dismissed_7d": 1
}
```

---

## Frontend Components

### Page: /teacher/class/[id]/actions

**File**: `src/app/(dashboard)/teacher/class/[id]/actions/page.tsx` (RSC)

```typescript
import { cookies } from 'next/headers';
import { RecommendationHistory } from '@/components/domain/teacher/RecommendationHistory';
import { ClosureMetricsCard } from '@/components/domain/teacher/ClosureMetricsCard';
import { verifySession } from '@/lib/supabase/server';

export const metadata = { title: 'Recommendation History | Climate Agent' };

interface Props {
  params: { id: string };
}

export default async function ActionsPage({ params }: Props) {
  const session = await verifySession(await cookies());
  
  const [historyRes, statsRes] = await Promise.all([
    fetch(`http://localhost:3000/api/recommendations/history?class_id=${params.id}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    }),
    fetch(`http://localhost:3000/api/recommendations/closure-stats?class_id=${params.id}&days=7`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    })
  ]);
  
  const history = await historyRes.json();
  const stats = await statsRes.json();
  
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-6">Your Actions & Impact</h1>
      
      {/* Metrics Summary */}
      <ClosureMetricsCard stats={stats} />
      
      {/* Recommendation History */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recommendation History</h2>
        <RecommendationHistory recommendations={history.recommendations} />
      </section>
    </main>
  );
}
```

### Component: RecommendationHistoryTable (use client)

**File**: `src/components/domain/teacher/RecommendationHistory.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClosureModal } from '@/components/domain/teacher/ClosureModal';
import { format } from 'date-fns';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  closure_status: 'pending' | 'acknowledged' | 'implemented' | 'dismissed';
  teacher_action_type?: string;
  teacher_feedback_text?: string;
  created_at: string;
  closure_timestamp?: string;
  closure_latency_hours?: number;
}

interface Props {
  recommendations: Recommendation[];
}

export function RecommendationHistory({ recommendations }: Props) {
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [showModal, setShowModal] = useState(false);

  const statusColor = (status: string) => {
    return {
      pending: 'bg-gray-100 text-gray-800',
      acknowledged: 'bg-blue-100 text-blue-800',
      implemented: 'bg-green-100 text-green-800',
      dismissed: 'bg-red-100 text-red-800'
    }[status];
  };

  return (
    <>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Date Sent</th>
              <th className="px-4 py-3 text-left">Recommendation</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Your Response</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec) => (
              <tr key={rec.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{format(new Date(rec.created_at), 'MMM d, HH:mm')}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{rec.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{rec.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor(rec.closure_status)}`}>
                    {rec.closure_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {rec.teacher_action_type ? (
                    <div className="text-xs">
                      <div className="font-medium">{rec.teacher_action_type}</div>
                      <div className="text-gray-600 mt-1">{rec.teacher_feedback_text}</div>
                      <div className="text-gray-500 mt-1">
                        {rec.closure_latency_hours?.toFixed(1)}h to implement
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {rec.closure_status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRec(rec);
                        setShowModal(true);
                      }}
                      className="bg-green-600 text-white text-xs"
                    >
                      ✓ Mark Done
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedRec && (
        <ClosureModal
          recommendation={selectedRec}
          onClose={() => setShowModal(false)}
          onSubmit={async (actionType, feedback) => {
            await fetch(`/api/recommendations/${selectedRec.id}/close`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action_type: actionType,
                feedback_text: feedback
              })
            });
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
```

### Component: ClosureModal (use client)

**File**: `src/components/domain/teacher/ClosureModal.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const ACTION_TYPES = [
  { label: '🎉 Icebreaker / Energizer', value: 'icebreaker' },
  { label: '💬 One-on-One Check-in', value: 'one-on-one' },
  { label: '📖 Revisit Content', value: 'revisit-content' },
  { label: '⏸️ Adjusted Pacing/Breaks', value: 'adjusted-pacing' },
  { label: '✏️ Other', value: 'other' }
];

interface Props {
  recommendation: { id: string; title: string };
  onClose: () => void;
  onSubmit: (actionType: string, feedback: string) => Promise<void>;
}

export function ClosureModal({ recommendation, onClose, onSubmit }: Props) {
  const [actionType, setActionType] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!actionType) {
      alert('Please select an action type');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(actionType, feedback);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">How'd it go?</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          You tried: <span className="font-medium">{recommendation.title}</span>
        </p>

        {/* Action Type Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">What did you implement?</label>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          >
            <option value="">— Select action type —</option>
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Feedback Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Optional feedback</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What worked? What didn't? Any observations?"
            className="w-full border rounded-lg p-2 text-sm resize-none"
            rows={4}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !actionType}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Saving...' : '✓ Mark as Done'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Component: ClosureMetricsCard

**File**: `src/components/domain/teacher/ClosureMetricsCard.tsx`

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  closure_rate_7d: number;
  closure_rate_30d: number;
  avg_response_latency_hours: string;
  action_type_histogram: Record<string, number>;
  recommendations_sent_7d: number;
  recommendations_implemented_7d: number;
}

export function ClosureMetricsCard({ stats }: { stats: Stats }) {
  const chartData = Object.entries(stats.action_type_histogram).map(([action, percent]) => ({
    name: action,
    percentage: percent
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* Closure Rate */}
      <div className="border rounded-lg p-6 bg-gradient-to-br from-green-50 to-white">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Response Rate</h3>
        <div className="text-4xl font-bold text-green-600">{stats.closure_rate_7d}%</div>
        <p className="text-sm text-gray-600 mt-2">
          {stats.recommendations_implemented_7d} of {stats.recommendations_sent_7d} last 7 days
        </p>
        <p className="text-xs text-gray-500 mt-2">30-day: {stats.closure_rate_30d}%</p>
      </div>

      {/* Response Latency */}
      <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Avg Time to Implement</h3>
        <div className="text-4xl font-bold text-blue-600">{stats.avg_response_latency_hours}h</div>
        <p className="text-sm text-gray-600 mt-2">From recommendation to action</p>
      </div>

      {/* Most Used Action */}
      <div className="border rounded-lg p-6 bg-gradient-to-br from-purple-50 to-white">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Top Action Type</h3>
        <div className="text-3xl font-bold text-purple-600">
          {Object.entries(stats.action_type_histogram).sort(([,a], [,b]) => b - a)[0]?.[0] || '—'}
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {Object.entries(stats.action_type_histogram).sort(([,a], [,b]) => b - a)[0]?.[1]}% of actions
        </p>
      </div>
    </div>
  );
}
```

---

## N8N Workflow: Recommendation Closure Tracking

### Metadata
- **Name**: Recommendation Closure Tracker (optional helper workflow)
- **Trigger**: Webhook from POST /api/recommendations/:id/close
- **Purpose**: Async aggregation and mood correlation
- **Expected Runtime**: <30 seconds per closure event

### Simple Webhook Handler

```json
{
  "name": "RecommendationClosureHandler",
  "type": "n8n-nodes-base.webhookTrigger",
  "typeVersion": 1,
  "parameters": {
    "path": "recommendation-closed",
    "httpMethod": "POST"
  },
  "position": [50, 100]
}
```

**Payload received** (from `/api/recommendations/:id/close`):
```json
{
  "recommendation_id": "uuid",
  "teacher_id": "uuid",
  "class_id": "uuid",
  "action_type": "icebreaker",
  "feedback": "Students responded well...",
  "closure_latency_hours": 2.3
}
```

### Subsequent Nodes (Simple)

1. **Log to n8n_audit_log** (already done in API endpoint, this is optional async enhancement)
2. **Trigger nightly aggregation** (if not already scheduled)
3. **Tag high-trust interventions** (for future LLM prompts)

---

## Nightly Aggregation Job (n8n Scheduled Sub-Workflow)

**When**: Daily at 01:00 UTC  
**Purpose**: Refresh `teacher_engagement_stats` table for dashboard queries

```json
{
  "name": "DailyMetricsAggregation",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1,
  "parameters": {
    "interval": [
      {
        "triggerAtHour": 1,
        "triggerAtMinute": 0
      }
    ]
  },
  "position": [50, 100]
}
```

### Aggregation Logic (PostgreSQL)

```sql
-- Nightly job: compute and store metrics
INSERT INTO teacher_engagement_stats (
  school_id,
  teacher_id,
  period_start_date,
  closure_rate_7d,
  closure_rate_30d,
  avg_response_latency_hours,
  action_type_histogram,
  recommendations_sent_7d,
  recommendations_implemented_7d,
  recommendations_dismissed_7d
)
-- For each active teacher
SELECT
  c.school_id,
  r.teacher_id,
  CURRENT_DATE,
  -- 7-day closure rate
  ROUND(
    COUNT(*) FILTER (WHERE r.closure_status = 'implemented' AND r.created_at >= NOW() - INTERVAL '7 days')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '7 days'), 0) * 100,
    2
  ) as closure_rate_7d,
  -- 30-day closure rate
  ROUND(
    COUNT(*) FILTER (WHERE r.closure_status = 'implemented' AND r.created_at >= NOW() - INTERVAL '30 days')::NUMERIC /
    NULLIF(COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days'), 0) * 100,
    2
  ) as closure_rate_30d,
  -- Avg latency
  ROUND(
    AVG(EXTRACT(HOUR FROM (r.closure_timestamp - r.created_at)))::NUMERIC,
    2
  ) as avg_response_latency_hours,
  -- Action type histogram (30-day)
  json_object_agg(
    r.teacher_action_type,
    ROUND(COUNT(*) * 100.0 / NULLIF(COUNT(*) FILTER (WHERE r.teacher_action_type IS NOT NULL), 0), 0)::INT
  ) FILTER (WHERE r.created_at >= NOW() - INTERVAL '30 days' AND r.teacher_action_type IS NOT NULL')
    as action_type_histogram,
  -- Counts
  COUNT(*) FILTER (WHERE r.created_at >= NOW() - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE r.closure_status = 'implemented' AND r.created_at >= NOW() - INTERVAL '7 days'),
  COUNT(*) FILTER (WHERE r.closure_status = 'dismissed' AND r.created_at >= NOW() - INTERVAL '7 days')
FROM recommendations r
JOIN classes c ON r.class_id = c.id
WHERE r.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.school_id, r.teacher_id
ON CONFLICT (teacher_id, period_start_date)
DO UPDATE SET
  closure_rate_7d = EXCLUDED.closure_rate_7d,
  closure_rate_30d = EXCLUDED.closure_rate_30d,
  avg_response_latency_hours = EXCLUDED.avg_response_latency_hours,
  action_type_histogram = EXCLUDED.action_type_histogram,
  recommendations_sent_7d = EXCLUDED.recommendations_sent_7d,
  recommendations_implemented_7d = EXCLUDED.recommendations_implemented_7d,
  recommendations_dismissed_7d = EXCLUDED.recommendations_dismissed_7d,
  updated_at = NOW();
```

---

## Testing Strategy

### Unit Tests: Closure Calculation

```typescript
describe('Loop Closure Metrics', () => {
  test('calculates closure rate correctly', () => {
    const recs = [
      { closure_status: 'implemented' },
      { closure_status: 'implemented' },
      { closure_status: 'pending' },
      { closure_status: 'dismissed' }
    ];
    expect(calculateClosureRate(recs)).toBe(50);
  });

  test('calculates latency histogram correctly', () => {
    const recs = [
      { teacher_action_type: 'icebreaker' },
      { teacher_action_type: 'icebreaker' },
      { teacher_action_type: 'one-on-one' }
    ];
    const histogram = buildHistogram(recs);
    expect(histogram).toEqual({ icebreaker: 67, 'one-on-one': 33 });
  });
});
```

### E2E Test: Full Mark-Done Flow

```typescript
test('Teacher marks recommendation done and sees updated metrics', async ({ page }) => {
  // 1. Navigate to actions page
  await page.goto('http://localhost:3000/teacher/class/test-class/actions');
  
  // 2. Find pending recommendation
  const pendingRec = await page.locator('[data-testid="status-pending"]').first();
  const markDoneBtn = await pendingRec.locator('[data-testid="mark-done-btn"]');
  
  // 3. Click "Mark Done"
  await markDoneBtn.click();
  
  // 4. Select action type in modal
  await page.selectOption('select[name="action_type"]', 'icebreaker');
  await page.fill('textarea[name="feedback"]', 'Great response from students');
  await page.click('[data-testid="submit-btn"]');
  
  // 5. Verify metrics updated
  await page.waitForTimeout(1000); // wait for revalidation
  const closureRate = await page.locator('[data-testid="closure-rate"]').textContent();
  expect(closureRate).toMatch(/\d+%/);
});
```

### Aggregation Test: Nightly Job

```typescript
test('Nightly aggregation computes metrics correctly', async () => {
  // 1. Create test data: 10 recommendations, 6 implemented (60% closure)
  const recs = await createTestRecommendations(10);
  await markImplemented(recs.slice(0, 6));
  
  // 2. Run aggregation job
  await fetch('http://localhost:5678/webhook/test-nightly-aggregation', { method: 'POST' });
  
  // 3. Verify stats in teacher_engagement_stats
  const stats = await supabase
    .from('teacher_engagement_stats')
    .select('*')
    .eq('teacher_id', testTeacherId)
    .single();
  
  expect(stats.data.closure_rate_7d).toBe(60);
  expect(stats.data.recommendations_implemented_7d).toBe(6);
});
```

---

## Integration with W06 & W07 Personalization

### W06 LLM Prompt Enhancement

The nightly aggregation stats feed into the LLM context for more personalized briefings:

```
Prior system prompt:
"Generate a daily briefing with climate summary + 1-2 recommendations."

Enhanced prompt (Phase 2):
"Generate a daily briefing. Context: This teacher favors ${action_type_histogram['icebreaker']}% 
icebreaker activities, with ${closure_rate_7d}% implementation rate.
Prior 5 icebreaker recommendations were implemented within ${avg_latency_hours} hours on average.
Boost icebreaker-type interventions in today's suggestions."
```

Result: Next briefing recommends interventions matching teacher's preferences and high-trust patterns.

---

## Deployment Steps

1. **Database Migrations**:
   ```bash
   # In supabase/migrations/:
   # 022_recommendation_enhancements.sql (alter recommendations table)
   # 023_teacher_engagement_stats.sql (create stats table + view)
   supabase db push
   ```

2. **API Route Updates**:
   ```bash
   # Update/create:
   # src/app/api/recommendations/history/route.ts
   # src/app/api/recommendations/[id]/close/route.ts
   # src/app/api/recommendations/closure-stats/route.ts
   ```

3. **Frontend Components**:
   ```bash
   npm install recharts date-fns
   # Add components to src/components/domain/teacher/
   ```

4. **Schedule Nightly Aggregation Job**:
   ```bash
   # n8n: Create "Daily Metrics Aggregation" workflow
   # Cron: 01:00 UTC daily
   # Postgres query: See "Nightly Aggregation Job" section above
   ```

5. **Add Dashboard Navigation**:
   ```bash
   # Update src/components/layout/TeacherNav.tsx
   # Add link: /teacher/class/[id]/actions
   ```

---

## Success Criteria for Loop Closure UI

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Teacher adoption | ≥60% mark ≥1 recommendation "Done" in 7 days | recommendations.closure_status aggregation |
| Closure rate | ≥60% of recommendations → marked done within 48h | Loop3 closure metric |
| Feedback quality | >70% provide action_type + feedback text | recommendations.teacher_feedback_text NOT NULL |
| Average latency | 2-4 hours (time from recommendation to "done") | avg(closure_latency_hours) |
| Metrics accuracy | <5% discrepancy vs. manual count | Audit: spot-check 10 teachers |
| Dashboard load time | <1 second (with precomputed stats) | Synthetic monitoring |
| Personalization effectiveness | ≥20% improvement in implementation rate when briefing customized by prior actions | A/B test metrics pre/post aggregation |

---

## Phase 3 Extensions (Not in Phase 2)

- **Mood correlation**: Did mood improve post-intervention? Tag interventions as "effective" vs. "ineffective"
- **Teacher policy profiles**: Per-teacher adaptive thresholds (e.g., "Jane prefers icebreakers; Robert prefers written reflection")
- **Bidirectional feedback**: Students see "Your feedback prompted us to [teacher action]" — visible loop closure to students
- **Historical comparison**: "Your closure rate improved 15% vs. last month" trend chart

---

**Plan Status**: Ready for Implementation  
**Risk Level**: Low  
**Next Step**: Plan migrations + update agent context with dashboard patterns  
**Review Date**: 2026-03-23
