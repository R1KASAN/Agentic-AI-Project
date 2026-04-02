"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RecommendationList } from "@/components/domain/teacher/RecommendationList";
import { restoreRecommendationAsDraft } from "@/lib/actions/teacher";
import type { RecommendationViewModel } from "@/types";

interface ResponsesClientProps {
  classId: string;
  recommendations: RecommendationViewModel[];
  featureFlags: {
    enableDecisionWorkspace: boolean;
    enableStructuredRecommendationPayload: boolean;
  };
  emptyStateTitle: string;
  emptyStateBody: string;
}

export default function ResponsesClient({
  classId,
  recommendations,
  featureFlags,
  emptyStateTitle,
  emptyStateBody,
}: ResponsesClientProps) {
  const router = useRouter();

  async function handleRestore(id: string) {
    const result = await restoreRecommendationAsDraft(id);

    if (!result.success) {
      toast.error(result.error ?? "ไม่สามารถ restore ข้อความนี้ได้");
      return;
    }

    toast.success("สร้างฉบับร่างใหม่จากข้อความเดิมแล้ว");
    router.push(`/teacher/class/${classId}`);
    router.refresh();
  }

  return (
    <RecommendationList
      recommendations={recommendations}
      onRestore={handleRestore}
      historyMode
      enableDecisionWorkspace={featureFlags.enableDecisionWorkspace}
      enableStructuredRecommendationPayload={
        featureFlags.enableStructuredRecommendationPayload
      }
      emptyStateTitle={emptyStateTitle}
      emptyStateBody={emptyStateBody}
    />
  );
}
