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
    - Response:
      ```json
      {
        "class_id": "uuid",
        "class_name": "string | null",
        "latest_check_in_at": "ISO timestamp | null",
        "current_week": {
          "week_start": "YYYY-MM-DD",
          "summary": "string",
          "comparison_label": "better | similar | worse | insufficient"
        },
        "last_week": {
          "week_start": "YYYY-MM-DD | null",
          "summary": "string",
          "metrics": {
            "week_start": "YYYY-MM-DD",
            "avg_mood": 1,
            "avg_pace": 1,
            "avg_fairness": 1,
            "total_responses": 3
          }
        },
        "climate": [
          {
            "week_start": "YYYY-MM-DD",
            "avg_mood": 1,
            "avg_pace": 1,
            "avg_fairness": 1,
            "total_responses": 3
          }
        ],
        "recent_action": {
          "id": "uuid",
          "note": "ครูขอบคุณสำหรับ feedback...",
          "logged_at": "ISO timestamp",
          "status_label": "ครูได้ดำเนินการแล้ว"
        }
      }
      ```
    - `current_week.summary` และ `last_week.summary` เป็นข้อความสรุปอัตโนมัติที่สร้างจาก aggregate-only signals ของห้อง ไม่ใช้ raw student data
    - `current_week.comparison_label` ใช้เปรียบเทียบภาพรวมของอาทิตย์นี้กับ `last_week.metrics`
      - `better` = ดีขึ้นเล็กน้อย
      - `similar` = คล้ายเดิม
      - `worse` = ตึงเครียดขึ้น
      - `insufficient` = ข้อมูลยังไม่พอ
    - `last_week.metrics` จะเป็น `null` ถ้ายังไม่มีสัปดาห์ก่อนที่มี aggregate-safe signal เพียงพอ
    - `recent_action` จะเป็น `null` ถ้ายังไม่มี teacher action ที่ถูกสื่อสารถึงนักเรียน
    - student-visible loop closure เกิดเฉพาะเมื่อ recommendation:
      - อยู่ใน `class_id` นั้น
      - `communicated_to_students = true`
      - มี note จริงใน `teacher_action_note` หรือ `action_taken_note`
    - `status_label` เป็นค่าที่ derive จาก `teacher_approval_status` / `status` ไม่ได้เก็บเป็นคอลัมน์ตรง
    - Returns:
      - `401` ถ้ายังไม่ login
      - `403` ถ้าไม่มีสิทธิ์เข้าถึงห้องนั้น
      - `404` ถ้ายัง resolve ห้องเป้าหมายไม่ได้

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
- `recommendation.approved` -> Triggers side effects (audit/notification). Student visibility is gated by `communicated_to_students`, not by webhook completion.
