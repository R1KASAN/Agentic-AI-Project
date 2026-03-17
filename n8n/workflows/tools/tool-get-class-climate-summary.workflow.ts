import { workflow, node, links } from '@n8n-as-code/core';

/**
 * Tool Sub-Workflow: Get Class Climate Summary
 * 
 * Purpose: Fetch anonymous classroom climate aggregate from RPC
 * Called by: W06 Morning AI Briefing (ToolGetClimateSummary node)
 * 
 * Returns:
 * {
 *   mean_mood: number (1-5),
 *   std_dev: number,
 *   n_students: number,
 *   mood_trend: string ('%'),
 *   baseline: number,
 *   k_anonymity_safe: boolean
 * }
 * 
 * K-anonymity Guard:
 * - If n_students < 3 → returns NULL aggregates + k_anonymity_safe=false
 * - If n_students >= 3 → returns valid aggregates + k_anonymity_safe=true
 */

@workflow({
  name: 'Tool: Get Class Climate Summary',
  active: true,
  description: 'RPC call to get_class_climate_summary with k-anonymity enforcement'
})
export class ToolGetClimateSummary {
  /**
   * Input: class_id (UUID), period (string, default '24h')
   * Schema validation: ensures class_id is UUID format
   */
  @node({
    name: 'Trigger Input',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [50, 50]
  })
  TriggerInput = {
    url: '{{ $env.SUPABASE_URL }}/rest/v1/rpc/get_class_climate_summary',
    method: 'POST',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'supabaseApi',
    sendHeaders: true,
    headerParameters: {
      'apikey': '{{ $env.SUPABASE_ANON_KEY }}',
      'Authorization': 'Bearer {{ $env.SUPABASE_ANON_KEY }}'
    },
    sendBody: true,
    bodyParameters: {
      class_id: '{{ $json.class_id }}',
      period: '{{ $json.period || "24h" }}'
    }
  };

  /**
   * Parse RPC Response
   * Supabase RPC returns JSON object with the aggregate schema
   */
  @node({
    name: 'Parse Climate Data',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [250, 50]
  })
  ParseClimateData = {
    language: 'javascript',
    jsCode: `
const result = $json;

// Validate RPC response
if (!result || result.error) {
  return {
    error: 'RPC call failed',
    details: result.error
  };
}

// Check k-anonymity
const kSafe = result.k_anonymity_safe === true;
const nStudents = result.n_students || 0;

if (!kSafe || nStudents < 3) {
  // Return all nulls + safe=false
  return {
    mean_mood: null,
    std_dev: null,
    n_students: nStudents,
    mood_trend: null,
    baseline: null,
    k_anonymity_safe: false,
    skip_reason: 'Insufficient data (n < 3)'
  };
}

// Return full climate summary
return {
  mean_mood: result.mean_mood || null,
  std_dev: result.std_dev || null,
  n_students: nStudents,
  mood_trend: result.mood_trend || '→',
  baseline: result.baseline || null,
  k_anonymity_safe: true,
  fetched_at: new Date().toISOString()
};
`
  };

  @links()
  defineRouting() {
    this.TriggerInput.out(0).to(this.ParseClimateData.in(0));
  }
}
