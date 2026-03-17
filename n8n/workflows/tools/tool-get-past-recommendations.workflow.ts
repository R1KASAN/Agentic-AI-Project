import { workflow, node, links } from '@n8n-as-code/core';

/**
 * Tool Sub-Workflow: Get Past Recommendations
 * 
 * Purpose: Fetch teacher's past recommendations + closure metrics
 * Called by: W06 Morning AI Briefing (ToolGetPastRecommendations node)
 * Used by: LangChain Agent for context (understanding teacher patterns)
 * 
 * Returns:
 * {
 *   recommendations: Array<{id, content, status, created_at}>,
 *   approval_rate_7d: number (0-1),
 *   implementation_rate_7d: number (0-1),
 *   closure_rate_7d: number (0-1),
 *   total_recommendations: number
 * }
 */

@workflow({
  name: 'Tool: Get Past Recommendations',
  active: true,
  description: 'Fetch teacher closure metrics and past 7-day recommendations for context'
})
export class ToolGetPastRecommendations {
  /**
   * Input: class_id (UUID), days (number, default 7), teacher_id (UUID)
   */
  @node({
    name: 'Fetch Past Recommendations DB',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [50, 50]
  })
  FetchPastRecommendations = {
    operation: 'executeQuery',
    query: `
      SELECT 
        r.id,
        r.content,
        r.status,
        r.teacher_approval_status,
        r.teacher_implemented_at,
        r.policy,
        r.confidence_score,
        r.created_at,
        r.teacher_approval_at,
        EXTRACT(EPOCH FROM (r.teacher_implemented_at - r.created_at)) / 3600 as latency_hours
      FROM recommendations r
      WHERE r.class_id = $1::uuid
        AND r.created_at > NOW() - INTERVAL '1 day' * $2::int
      ORDER BY r.created_at DESC
    `,
    parameters: {
      0: '{{ $json.class_id }}',
      1: '{{ $json.days || 7 }}'
    }
  };

  /**
   * Calculate Closure Metrics
   * 
   * Metrics:
   * - approval_rate: COUNT(approved) / COUNT(total)
   * - implementation_rate: COUNT(implemented) / COUNT(total)
   * - closure_rate: COUNT(implemented) / COUNT(total) [final measure]
   */
  @node({
    name: 'Calculate Closure Metrics',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [250, 50]
  })
  CalculateClosureMetrics = {
    language: 'javascript',
    jsCode: `
const recommendations = $json || [];
const total = recommendations.length || 0;

let approved = 0;
let implemented = 0;

recommendations.forEach(r => {
  if (r.teacher_approval_status && r.teacher_approval_status !== 'PENDING' && r.teacher_approval_status !== 'DISMISSED') {
    approved++;
  }
  if (r.teacher_implemented_at) {
    implemented++;
  }
});

const approvalRate = total > 0 ? approved / total : 0;
const implementationRate = total > 0 ? implemented / total : 0;
const closureRate = implementationRate;

const avgLatency = recommendations.length > 0
  ? recommendations.reduce((sum, r) => sum + (r.latency_hours || 0), 0) / recommendations.length
  : 0;

return {
  recommendations: recommendations,
  total_recommendations: total,
  approved_count: approved,
  implemented_count: implemented,
  approval_rate_7d: parseFloat(approvalRate.toFixed(2)),
  implementation_rate_7d: parseFloat(implementationRate.toFixed(2)),
  closure_rate_7d: parseFloat(closureRate.toFixed(2)),
  avg_closure_latency_hours: parseFloat(avgLatency.toFixed(1))
};
`
  };

  @links()
  defineRouting() {
    this.FetchPastRecommendations.out(0).to(this.CalculateClosureMetrics.in(0));
  }
}
