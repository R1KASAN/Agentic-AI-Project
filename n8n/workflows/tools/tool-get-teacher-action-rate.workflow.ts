import { workflow, node, links } from '@n8n-as-code/core';

/**
 * Tool Sub-Workflow: Get Teacher Action Rate & Metrics
 * 
 * Purpose: Fetch teacher profile data for Inquiry Mode detection + tone adjustment
 * Called by: W06 Morning AI Briefing (ToolGetTeacherMetrics node)
 * Used by: LangChain Agent for context (detecting inquiry mode)
 * 
 * Returns:
 * {
 *   approval_rate: number (0-1),
 *   implementation_rate: number (0-1),
 *   teacher_flag_inquiry_mode: boolean,
 *   dismissal_count: number,
 *   dismissal_pattern_consecutive: number,
 *   dismissal_rate: number,
 *   inquiry_reason: string | null
 * }
 * 
 * Inquiry Mode Logic:
 * - Triggered when teacher dismissal rate > 60% for 2 consecutive weeks
 * - In inquiry mode, agent asks clarifying questions instead of making recommendations
 */

@workflow({
  name: 'Tool: Get Teacher Action Rate',
  active: true,
  description: 'Fetch teacher metrics including inquiry mode status'
})
export class ToolGetTeacherActionRate {
  /**
   * Input: teacher_id (UUID)
   */
  @node({
    name: 'Fetch Teacher Profile',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [50, 50]
  })
  FetchTeacherProfile = {
    operation: 'executeQuery',
    query: `
      SELECT 
        tp.teacher_id,
        tp.approval_rate_historical,
        tp.implementation_rate_historical,
        tp.dismissal_pattern_consecutive,
        tp.is_inquiry_mode,
        tp.inquiry_mode_triggered_at,
        tp.dismissal_count_7d,
        tp.dismissal_count_14d
      FROM teacher_profiles tp
      WHERE tp.teacher_id = $1::uuid
    `,
    parameters: {
      0: '{{ $json.teacher_id }}'
    }
  };

  /**
   * Parse Teacher Metrics
   * Apply inquiry mode logic:
   * - If dismissal rate > 60% AND consecutive weeks >= 2 → enable inquiry mode
   * - Otherwise, normal recommendation mode
   */
  @node({
    name: 'Apply Inquiry Mode Logic',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [250, 50]
  })
  ApplyInquiryModeLogic = {
    language: 'javascript',
    jsCode: `
const profile = $json;

if (!profile) {
  return {
    approval_rate: 0,
    implementation_rate: 0,
    is_inquiry_mode: false,
    dismissal_count: 0,
    dismissal_pattern_consecutive: 0,
    error: 'Teacher profile not found'
  };
}

const approvalRate = profile.approval_rate_historical || 0;
const implementationRate = profile.implementation_rate_historical || 0;
const dismissalCount = profile.dismissal_count_7d || 0;
const consecutivePattern = profile.dismissal_pattern_consecutive || 0;

// Calculate dismissal rate
const dismissalRate = 1 - approvalRate;  // If approval is 30%, dismissal is 70%

// Inquiry mode logic:
// Triggered if dismissal_rate > 60% AND pattern_consecutive >= 2
let isInquiryMode = profile.is_inquiry_mode || false;

if (dismissalRate > 0.6 && consecutivePattern >= 2) {
  isInquiryMode = true;
}

return {
  teacher_id: profile.teacher_id,
  approval_rate: parseFloat((approvalRate || 0).toFixed(2)),
  implementation_rate: parseFloat((implementationRate || 0).toFixed(2)),
  dismissal_rate: parseFloat(dismissalRate.toFixed(2)),
  dismissal_count: dismissalCount,
  dismissal_pattern_consecutive: consecutivePattern,
  is_inquiry_mode: isInquiryMode,
  teacher_flag_inquiry_mode: profile.is_inquiry_mode || false,
  inquiry_reason: profile.is_inquiry_mode
    ? 'teacher_flag'
    : dismissalRate > 0.6 && consecutivePattern >= 2
    ? 'dismissal_pattern'
    : null,
  inquiry_mode_triggered_at: profile.inquiry_mode_triggered_at || null
};
`
  };

  @links()
  defineRouting() {
    this.FetchTeacherProfile.out(0).to(this.ApplyInquiryModeLogic.in(0));
  }
}
