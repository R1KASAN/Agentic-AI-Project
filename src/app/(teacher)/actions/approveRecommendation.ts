'use server';

import { approveRecommendation } from '@/lib/actions/recommendations';

export async function approveRecommendationAction(input: {
  classId: string;
  recommendationId: string;
  note?: string;
  shareWithStudents?: boolean;
}) {
  try {
    const result = await approveRecommendation({
      id: input.recommendationId,
      note: input.note ?? '',
      shareWithStudents: input.shareWithStudents ?? true,
    });

    return {
      success: true as const,
      webhookFailed: result.webhookFailed ?? false,
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'APPROVE_FAILED',
    };
  }
}
