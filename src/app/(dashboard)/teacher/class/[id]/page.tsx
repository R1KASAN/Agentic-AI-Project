import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClassDetailClient from "./ClassDetailClient";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await supabase
        .from("classes")
        .select("name")
        .eq("id", id)
        .single();

    return { title: data?.name ?? "Class Detail" };
}

export default async function ClassDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    // Parallel data fetching — no waterfall
    const [classResult, countResult, climateResult, recsResult] =
        await Promise.all([
            supabase
                .from("classes")
                .select("name, risk_score, invite_code")
                .eq("id", id)
                .single(),
            supabase
                .from("class_enrollments")
                .select("*", { count: "exact", head: true })
                .eq("class_id", id),
            supabase.rpc("get_class_climate_summary", {
                p_class_id: id,
                p_weeks: 4,
            }),
            supabase
                .from("recommendations")
                .select("id, content, status, action_taken_note, created_at")
                .eq("class_id", id)
                .order("created_at", { ascending: false })
                .limit(10),
        ]);

    if (!classResult.data) {
        notFound();
    }

    const rawClimate = climateResult.data;
    const climateData = Array.isArray(rawClimate) ? rawClimate : [];

    return (
        <ClassDetailClient
            classId={id}
            className={classResult.data.name}
            inviteCode={classResult.data.invite_code}
            riskScore={classResult.data.risk_score}
            studentCount={countResult.count ?? 0}
            climate={climateData}
            initialRecommendations={recsResult.data ?? []}
        />
    );
}
