import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RecommendationList } from "@/components/domain/teacher/RecommendationList";
import {
  getClassMetrics,
  mapRecommendationsToViewModels,
} from "@/lib/teacherDashboard";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("name")
    .eq("id", id)
    .single();

  return { title: data?.name ? `${data.name} Responses` : "Response History" };
}

export default async function TeacherClassResponsesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [classResult, responsesResult, climateResult, metrics] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("id", id)
      .single(),
    supabase
      .from("recommendations")
      .select(
        "id, class_id, content, status, dismissal_reason, action_taken_note, teacher_action_note, communicated_to_students, created_at, updated_at, policy_level, ai_message_draft, actions_json, confidence_score, reasoning, inquiry_mode, fallback_used, priority, alert_sent_at"
      )
      .eq("class_id", id)
      .in("status", ["approved", "dismissed"])
      .order("created_at", { ascending: false }),
    supabase.rpc("get_class_climate_summary", {
      p_class_id: id,
      p_weeks: 4,
    }),
    getClassMetrics(id),
  ]);

  if (!classResult.data) {
    notFound();
  }

  const climateData = Array.isArray(climateResult.data) ? climateResult.data : [];
  const recommendationViewModels = mapRecommendationsToViewModels(
    responsesResult.data ?? [],
    climateData,
    metrics
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={`/teacher/class/${id}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          กลับไปหน้าห้องเรียน
        </Link>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-sky-500" />
          <h1 className="text-2xl font-bold tracking-tight">
            ประวัติข้อความและการตอบสนอง
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          ดูข้อความที่เคยอนุมัติหรือข้ามไปแล้วของห้อง {classResult.data.name}
        </p>
      </div>

      <RecommendationList
        recommendations={recommendationViewModels}
        emptyStateTitle="ยังไม่มีประวัติการตอบกลับสำหรับห้องนี้"
        emptyStateBody="เมื่อครูอนุมัติหรือข้าม draft แล้ว รายการจะย้ายมาแสดงที่หน้านี้"
      />
    </div>
  );
}
