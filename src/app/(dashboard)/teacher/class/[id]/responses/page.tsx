import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import ResponsesClient from "./ResponsesClient";
import {
  getClassMetrics,
  listRecommendationHistory,
  mapRecommendationsToViewModels,
} from "@/lib/teacherDashboard";
import { getFeatureFlags } from "@/lib/featureFlags";

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const teacherId = session?.user?.id;

  if (!teacherId) {
    redirect("/login");
  }

  const [classResult, historyRows, climateResult, metrics] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("id", id)
      .eq("teacher_id", teacherId)
      .maybeSingle(),
    listRecommendationHistory(id),
    supabase.rpc("get_class_climate_summary", {
      p_class_id: id,
      p_weeks: 4,
    }),
    getClassMetrics(id),
  ]);

  if (classResult.error) {
    console.error("[teacher/class/responses][class_error]", {
      classId: id,
      teacherId,
      message: classResult.error.message,
      code: classResult.error.code,
      details: classResult.error.details,
      hint: classResult.error.hint,
    });

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            กลับไปหน้าภาพรวม
          </Link>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              ประวัติข้อความและการตอบสนอง
            </h1>
          </div>
        </div>

        <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="py-6">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              ไม่สามารถโหลดหน้าประวัติการตอบสนองได้
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {process.env.NODE_ENV === "development"
                ? classResult.error.message
                : "เกิดข้อผิดพลาดระหว่างโหลดข้อมูล กรุณาลองใหม่อีกครั้ง"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!classResult.data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            กลับไปหน้าภาพรวม
          </Link>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-sky-500" />
            <h1 className="text-2xl font-bold tracking-tight">
              ประวัติข้อความและการตอบสนอง
            </h1>
          </div>
        </div>

        <Card className="border-[color:var(--teacher-dashboard-border)] bg-[var(--teacher-dashboard-surface-soft)]">
          <CardContent className="py-6">
            <p className="text-sm font-medium text-[var(--teacher-dashboard-text)]">
              ยังไม่พบข้อมูลห้องเรียนนี้ในรอบนี้
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ห้องเรียนอาจถูกลบ เปลี่ยนสิทธิ์การเข้าถึง หรือ session ปัจจุบันยังไม่ตรงกับข้อมูลล่าสุด
              คุณสามารถกลับไปที่หน้าภาพรวมแล้วเข้าใหม่อีกครั้งได้
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const climateData = Array.isArray(climateResult.data) ? climateResult.data : [];
  const recommendationViewModels = mapRecommendationsToViewModels(
    historyRows,
    climateData,
    metrics
  );
  const featureFlags = getFeatureFlags();

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

      <ResponsesClient
        classId={id}
        recommendations={recommendationViewModels}
        featureFlags={featureFlags}
        emptyStateTitle="ยังไม่มีประวัติการตอบกลับสำหรับห้องนี้"
        emptyStateBody="เมื่อครูอนุมัติหรือข้าม draft แล้ว รายการจะย้ายมาแสดงที่หน้านี้"
      />
    </div>
  );
}
