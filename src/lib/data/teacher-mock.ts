export interface ClassSummaryResponse {
  class_id: string;
  name: string;
  description?: string | null;
  risk_level: 'CRITICAL' | 'WARNING' | 'ROUTINE' | 'NO_DATA';
  student_count: number;
  pending_recommendations: number;
  inquiry_mode_suggested?: boolean;
  blocked_reason?: "frequency_limit_exceeded" | "k_anonymity" | null;
  total_decided?: number;
  dismissal_rate?: number;
  latest_policy_selected?: string | null;
}

export interface TeacherRecommendation {
  id: string;
  class_id: string;
  class_name: string;
  policy_level: 'CRITICAL' | 'WARNING' | 'ROUTINE';
  content: string;
  inquiry_mode: boolean;
  reasoning?: string;
  status: 'pending' | 'approved' | 'dismissed' | 'edited';
  teacher_approval_status?: 'pending' | 'approved' | 'dismissed' | null;
  confidence_score?: number;
  created_at: string;
}

export interface TeacherResponsePayload {
  recommendation_id: string;
  class_id: string;
  action: 'approved' | 'dismissed';
  teacher_note?: string;
}

export async function getTeacherClassesSummaryMock(_teacherId: string): Promise<ClassSummaryResponse[]> {
  void _teacherId;
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return [
    {
      class_id: "10000000-0000-0000-0000-000000000001",
      name: "CS101 Intro to Computer Science",
      description: "Intro to computing with weekly lab work and project reviews.",
      risk_level: "WARNING",
      student_count: 45,
      pending_recommendations: 2,
    },
    {
      class_id: "20000000-0000-0000-0000-000000000002",
      name: "MATH201 Calculus II",
      description: "Focuses on integration techniques and exam preparation.",
      risk_level: "ROUTINE",
      student_count: 38,
      pending_recommendations: 0,
    },
    {
      class_id: "30000000-0000-0000-0000-000000000003",
      name: "PHYS101 Physics Mechanics",
      description: null,
      risk_level: "CRITICAL",
      student_count: 52,
      pending_recommendations: 1,
    },
    {
        class_id: "40000000-0000-0000-0000-000000000004",
        name: "CHEM101 General Chemistry",
        description: "General chemistry with weekly check-ins and lab reflections.",
        risk_level: "NO_DATA",
        student_count: 40,
        pending_recommendations: 0,
    }
  ];
}

export async function getTeacherRecommendationsMock(_teacherId: string): Promise<TeacherRecommendation[]> {
  void _teacherId;
  await new Promise(resolve => setTimeout(resolve, 600));

  return [
    {
      id: "rec-001",
      class_id: "10000000-0000-0000-0000-000000000001",
      class_name: "CS101 Intro to Computer Science",
      policy_level: "CRITICAL",
      content: "Several students reported feeling overwhelmed by the recent assignment pacing. Recommend extending the deadline by 2 days.",
      inquiry_mode: false,
      reasoning: "High correlation with negative pacing feedback over the last 3 days.",
      status: "pending",
      created_at: new Date().toISOString()
    },
    {
      id: "rec-002",
      class_id: "30000000-0000-0000-0000-000000000003",
      class_name: "PHYS101 Physics Mechanics",
      policy_level: "WARNING",
      content: "Participation was notably low today. Was there an external factor affecting the class atmosphere?",
      inquiry_mode: true,
      reasoning: "Recommendation generated via fallback policy engine due to lack of recent positive pulses.",
      status: "pending",
      created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: "rec-003",
      class_id: "10000000-0000-0000-0000-000000000001",
      class_name: "CS101 Intro to Computer Science",
      policy_level: "ROUTINE",
      content: "Consider acknowledging the class for their strong collaborative effort on yesterday's group task.",
      inquiry_mode: false,
      status: "pending",
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    }
  ];
}
