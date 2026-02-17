# API Contracts: Sitemap & Navigation

## Endpoints

### Auth & Role Check
- **GET /api/auth/me**
    - Returns: `{ user: { id, role, ... } }`
    - Used by: Middleware / Client Guards

### Student
- **POST /api/student/check-in**
    - Body: `{ classId, mood, pace, fairness, content? }`
    - Response: `201 Created`
- **GET /api/student/feedback?classId={id}**
    - Response: `{ summary: { mood, pace, ... }, actions: [ ... ] }`
    - *Note*: Returns 403 or specific "Privacy Protected" code if n < 3.

### Teacher
- **GET /api/teacher/classes**
    - Response: `[{ id, name, riskScore, pilotStatus, ... }]`
- **GET /api/teacher/class/{id}/dashboard**
    - Response: `{ summary: {...}, recommendations: [{ id, content, status }] }`
- **PATCH /api/teacher/recommendations/{id}**
    - Body: `{ status: 'approved' | 'dismissed', actionTakenNote?: string, dismissalReason?: string }`
    - Response: `200 OK`

### Admin
- **GET /api/admin/metrics**
    - Response: `{ engagement: { checkInRate, dashboardOpenRate }, adoption: { loopClosureRate } }`

## Events (Internal/n8n Triggers)
- `check_in.created` -> Triggers Risk Calculation (Async).
- `recommendation.approved` -> Triggers Notification to Students (via App/Email).
