# Next.js API & Server Actions Contracts

## 1. Student Check-in Server Action

**Action:** `submitPulse(data: PulseFormData)`
**Location:** `src/app/(student)/check-in/actions.ts`

**Payload:**
```typescript
interface PulseFormData {
  classId: string;
  mood: 'great' | 'okay' | 'stressed' | 'bored';
  pace: number; // 1 (too slow) to 5 (too fast)
  fairness: number; // 1 (unfair) to 5 (very fair)
  optionalText?: string;
}
```

**Response:**
```typescript
interface SubmitResponse {
  success: boolean;
  pulseId?: string;
  error?: string;
}
```

## 2. Teacher AI Draft Actions

**Action:** `updateRecommendationStatus(id: string, status: string, reason?: string)`
**Location:** `src/app/(teacher)/class/[id]/actions.ts`

**Payload:**
```typescript
interface UpdateActionData {
  recommendationId: string;
  status: 'approved' | 'dismissed' | 'edited';
  newContent?: string; // If edited
  dismissalReason?: string; // Optional reasoning for audit
}
```

**Response:**
```typescript
interface UpdateResponse {
  success: boolean;
  error?: string;
}
```

## 3. N8N Generic Webhook Receiver (REST API)

**Route:** `POST /api/n8n/webhook`
**Security:** Requires Bearer token matching `N8N_WEBHOOK_SECRET`

**Payload (from N8N to Next.js):**
```typescript
interface N8NWebhookPayload {
  event: 'recommendations_generated' | 'loop_closure_communicated' | 'health_score_updated';
  class_id?: string;
  summary?: unknown;
}
```

**Response:**
```json
{
  "ok": true
}
```
*Note: Successful requests will trigger Next.js cache `revalidatePath()` for the relevant teacher or student pages.*
