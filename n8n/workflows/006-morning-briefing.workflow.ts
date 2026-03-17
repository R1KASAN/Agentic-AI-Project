import { workflow, node, links } from '@n8n-as-code/core';

/**
 * W06 Morning AI Briefing Workflow
 * 
 * Purpose: Deliver autonomous daily classroom climate briefing via LINE at 7:30 AM (M-F)
 * Features: Mood aggregation, trend analysis, LLM-generated teaching suggestions, loop closure metrics
 * 
 * High-level Flow:
 * 1. Schedule trigger (M-F 7:30 AM UTC)
 * 2. Gate: Check if today is a school day
 * 3. Gate: Fetch active teachers
 * 4. Loop per teacher → Loop per class
 * 5. Fetch climate summary (RPC call with k-anonymity guard)
 * 6. Check k-anonymity (n >= 3)
 * 7. Check notification frequency guard
 * 8. LangChain Agent + Gemini: Generate recommendation
 * 9. LINE Notify: Send briefing to teacher
 * 10. DB: Insert recommendation record + audit log
 */

@workflow({
  name: 'W06 Morning AI Briefing',
  active: false,
  description: 'Autonomous daily classroom climate briefing via LINE with k-anonymity protection and human-in-the-loop approval'
})
export class W06MorningBriefing {
  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 1: TRIGGER & TIMING
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * T017: Schedule Trigger
   * Fires at 7:30 AM every school day (Monday-Friday)
   * Cron: 30 7 * * 1-5 (7:30 AM UTC, M-F)
   */
  @node({
    name: 'Schedule Trigger: 7:30 AM M-F',
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1,
    position: [50, 50]
  })
  ScheduleTrigger = {
    mode: 'interval',
    interval: 'custom',
    triggerUnit: 'seconds',
    triggerAtTime: '30 7 * * 1-5',
    cronExpression: '30 7 * * 1-5'
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 2: SAFETY GATES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * T018: Check School Day Guard
   * Query: SELECT is_school_day FROM school_days WHERE school_id=X AND date=TODAY()
   * Decision: Skip workflow if today is not a school day
   * 
   * Branch 0 = not a school day → END
   * Branch 1 = is a school day → continue to fetch teachers
   */
  @node({
    name: 'Check School Day',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [250, 50]
  })
  CheckSchoolDay = {
    operation: 'executeQuery',
    query: `
      SELECT 
        sd.is_school_day,
        sd.school_id,
        sd.date,
        COALESCE(sd.reason, '') as reason
      FROM school_days sd
      WHERE sd.school_id = $1::uuid
        AND sd.date = CURRENT_DATE
      LIMIT 1
    `,
    parameters: {
      0: '{{ $json.school_id }}',  // Injected from context or hardcoded for test
    }
  };

  /**
   * School Day Decision Gate
   * IF is_school_day = true → Branch 1 (continue)
   * IF is_school_day = false OR no record → Branch 0 (skip)
   */
  @node({
    name: 'Is School Day?',
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: [450, 50]
  })
  IsSchoolDayDecision = {
    conditions: {
      booleanRules: [
        {
          condition: 'true',
          value1: '{{ $json.is_school_day }}',
          value2: true
        }
      ],
      combinator: 'and'
    }
  };

  /**
   * T019: Fetch Active Teachers
   * Get all teachers for the school who are:
   * - Active (is_active = true)
   * - Not on leave (availability_status != 'on_leave')
   */
  @node({
    name: 'Fetch Active Teachers',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [450, 200]
  })
  FetchActiveTeachers = {
    operation: 'executeQuery',
    query: `
      SELECT 
        u.id as teacher_id,
        u.email,
        tp.notification_frequency_pref,
        tp.notification_channel_pref,
        tp.is_inquiry_mode,
        tp.approval_rate_historical,
        tp.implementation_rate_historical
      FROM auth.users u
      JOIN teacher_profiles tp ON u.id = tp.teacher_id
      WHERE u.school_id = $1::uuid
        AND tp.is_active = true
        AND tp.availability_status != 'on_leave'
      ORDER BY u.created_at ASC
    `,
    parameters: {
      0: '{{ $json.school_id }}'
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 3: LOOP OVER TEACHERS & CLASSES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Loop 0: Split across all active teachers
   * Output: One iteration per teacher
   */
  @node({
    name: 'Loop: Split Teachers',
    type: 'n8n-nodes-base.splitInBatches',
    typeVersion: 1,
    position: [650, 200]
  })
  LoopSplitTeachers = {
    batchSize: 1,
    options: {
      reset: false,
      sourceData: 'input'
    }
  };

  /**
   * For each teacher, fetch their active classes
   */
  @node({
    name: 'Fetch Teacher Classes',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [850, 200]
  })
  FetchTeacherClasses = {
    operation: 'executeQuery',
    query: `
      SELECT 
        c.id as class_id,
        c.name as class_name,
        c.grade_level,
        c.teacher_id,
        COALESCE(c.active, true) as is_active
      FROM classes c
      WHERE c.teacher_id = $1::uuid
        AND c.school_id = $2::uuid
        AND c.active = true
      ORDER BY c.name ASC
    `,
    parameters: {
      0: '{{ $json.teacher_id }}',
      1: '{{ $json.school_id }}'
    }
  };

  /**
   * Loop 1: Split across teacher's classes
   * Output: One iteration per (teacher, class) combination
   */
  @node({
    name: 'Loop: Split Classes',
    type: 'n8n-nodes-base.splitInBatches',
    typeVersion: 1,
    position: [1050, 200]
  })
  LoopSplitClasses = {
    batchSize: 1,
    options: {
      reset: false,
      sourceData: 'input'
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 4: DATA FETCHING - TOOL SUB-WORKFLOWS
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * T020: Tool Sub-workflow - Get Class Climate Summary
   * 
   * Calls: get_class_climate_summary(class_id, '24h') RPC
   * Returns: {mean_mood, std_dev, n_students, mood_trend, k_anonymity_safe}
   * 
   * K-anonymity guard:
   * - If n_students < 3 → k_anonymity_safe = false, all aggregates = NULL
   * - If n_students >= 3 → k_anonymity_safe = true, return aggregates
   */
  @node({
    name: 'Call Tool: Get Climate Summary',
    type: '@n8n/n8n-nodes-langchain.toolWorkflow',
    typeVersion: 1,
    position: [1250, 100]
  })
  ToolGetClimateSummary = {
    workflowId: '{{ workflow.id }}',  // Reference to tool-get-class-climate-summary.workflow.ts
    mode: 'map_workflow_tool',
    toolName: 'get_class_climate_summary',
    description: 'Fetch classroom climate aggregate (mood mean, std dev, trend) with k-anonymity protection',
    inputs: {
      class_id: '{{ $json.class_id }}',
      period: '24h',
      school_id: '{{ $json.school_id }}'
    }
  };

  /**
   * T021: Tool Sub-workflow - Get Past Recommendations
   * 
   * Returns: {recommendations ARRAY, approval_rate_7d, implementation_rate_7d, closure_rate_7d}
   * Used by LLM agent to understand teacher response patterns
   */
  @node({
    name: 'Call Tool: Get Past Recommendations',
    type: '@n8n/n8n-nodes-langchain.toolWorkflow',
    typeVersion: 1,
    position: [1250, 250]
  })
  ToolGetPastRecommendations = {
    workflowId: '{{ workflow.id }}',
    mode: 'map_workflow_tool',
    toolName: 'get_past_recommendations',
    description: 'Fetch past 7-day recommendations and closure metrics for context',
    inputs: {
      class_id: '{{ $json.class_id }}',
      days: 7,
      teacher_id: '{{ $json.teacher_id }}'
    }
  };

  /**
   * T022: Tool Sub-workflow - Get Teacher Action Rate
   * 
   * Returns: {approval_rate, implementation_rate, is_inquiry_mode, dismissal_count}
   * Used to detect inquiry mode and adjust tone
   */
  @node({
    name: 'Call Tool: Get Teacher Metrics',
    type: '@n8n/n8n-nodes-langchain.toolWorkflow',
    typeVersion: 1,
    position: [1250, 400]
  })
  ToolGetTeacherMetrics = {
    workflowId: '{{ workflow.id }}',
    mode: 'map_workflow_tool',
    toolName: 'get_teacher_action_rate',
    description: 'Fetch teacher profile metrics and detection of inquiry mode',
    inputs: {
      teacher_id: '{{ $json.teacher_id }}'
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 5: DECISION GATES (K-ANONYMITY, FREQUENCY)
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * T023: Check K-Anonymity Guard
   * 
   * Condition: n_students >= 3 AND k_anonymity_safe = true
   * Branch 0 (false): Skip this class → set action='SKIP', skip_reason='insufficient_data'
   * Branch 1 (true): Continue to frequency guard
   */
  @node({
    name: 'K-Anonymity Check',
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: [1600, 200]
  })
  KAnonymityCheck = {
    conditions: {
      booleanRules: [
        {
          condition: 'and',
          comparator: '>=',
          value1: '{{ $json.climate_summary.n_students }}',
          value2: 3
        },
        {
          condition: 'and',
          comparator: '==',
          value1: '{{ $json.climate_summary.k_anonymity_safe }}',
          value2: true
        }
      ],
      combinator: 'and'
    }
  };

  /**
   * T024: Check Notification Frequency Guard
   * 
   * Prevent spam:
   * - Max 2 notifications per day per teacher
   * - Max 5 notifications per week per teacher
   */
  @node({
    name: 'Check Frequency Guard',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [1800, 200]
  })
  CheckFrequencyGuard = {
    operation: 'executeQuery',
    query: `
      SELECT 
        COUNT(CASE WHEN nal.created_at > NOW() - INTERVAL '1 day' THEN 1 END) as today_count,
        COUNT(CASE WHEN nal.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as week_count
      FROM n8n_audit_log nal
      WHERE nal.teacher_id = $1::uuid
        AND nal.workflow_id = 'W06'
        AND nal.action_taken = 'SEND_LINE_NOTIFICATION'
    `,
    parameters: {
      0: '{{ $json.teacher_id }}'
    }
  };

  /**
   * Frequency Guard Decision
   * IF today_count < 2 AND week_count < 5 → Branch 1 (continue)
   * ELSE → Branch 0 (skip)
   */
  @node({
    name: 'Is Within Frequency Limits?',
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: [2000, 200]
  })
  FrequencyGuardDecision = {
    conditions: {
      booleanRules: [
        {
          condition: 'and',
          comparator: '<',
          value1: '{{ $json.today_count }}',
          value2: 2
        },
        {
          condition: 'and',
          comparator: '<',
          value1: '{{ $json.week_count }}',
          value2: 5
        }
      ],
      combinator: 'and'
    }
  };

  /**
   * T025 (Optional): Check Teacher Availability
   * IF availability_status = 'on_leave' → skip
   * This could be integrated above or as separate gate
   */
  @node({
    name: 'Check Teacher Availability',
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: [2000, 50]
  })
  CheckTeacherAvailability = {
    conditions: {
      booleanRules: [
        {
          condition: 'true',
          value1: '{{ $json.availability_status }}',
          value2: 'on_leave',
          operation: 'notEqual'
        }
      ]
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 6: LANGCHAIN AGENT - AGENTIC REASONING
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * T026-T029: LangChain Agent Node
   * 
   * Autonomous reasoning engine using:
   * - LLM: Gemini (gemini-2.0-flash)
   * - Tools: tool-get-past-recommendations, tool-get-teacher-action-rate (already called above)
   * - System Prompt: Climate advisor framing
   * - Output: {content, confidence, policy, trigger_reason}
   * 
   * System Prompt:
   * "You are a supportive classroom climate advisor. Based on the classroom mood data provided,
   *  analyze the climate and suggest ONE teaching intervention (max 150 chars). 
   *  Think like a compassionate partner, not an auditor.
   *  Frame suggestions with 'Let's try...' or 'Consider...' language.
   *  Return JSON: {content: string, confidence: 0-1, rationale: string}"
   */
  @node({
    name: 'LangChain Agent: Generate Recommendation',
    type: '@n8n/n8n-nodes-langchain.agent',
    typeVersion: 1,
    position: [2200, 200]
  })
  LangChainAgent = {
    ai_languageModel: '{{ node[Gemini-LLM].output }}',  // Reference to Gemini credential
    ai_memory: '{{ node[BufferMemory].output }}',  // Optional: conversation memory
    tools: [
      '{{ node[ToolGetPastRecommendations].output }}',
      '{{ node[ToolGetTeacherMetrics].output }}'
    ],
    agentType: 'tool-calling',
    temperature: 0.8,
    maxRetries: 1,
    maxIterations: 5,
    systemPrompt: `You are a supportive classroom climate advisor working with teachers to improve student engagement and well-being.

**Your Goal**: Suggest ONE specific teaching intervention based on classroom mood data.

**Instruction**:
- Analyze the classroom mood aggregate (mean, std dev, trend)
- Consider teacher's past response patterns (approval/implementation rates)
- If teacher is in Inquiry Mode (dismissal rate > 60%), ask clarifying questions instead
- Frame suggestions with empowering language: "Let's try...", "Consider...", "What if..."
- Never use words like "warning", "alert", "critical" (use "opportunity", "invitation")
- Keep suggestion to 1-2 sentences max (150 chars)
- Return a JSON object with fields:
  - content: string (the suggestion)
  - confidence: number (0-1, how confident you are in this suggestion)
  - rationale: string (why you chose this suggestion)
  - use_inquiry_mode: boolean (if true, ask clarifying question instead)

**Context**:
- Classroom Mean Mood: {{ $json.climate_summary.mean_mood }}/5 (±{{ $json.climate_summary.std_dev }})
- Mood Trend: {{ $json.climate_summary.mood_trend }}
- Students with data: {{ $json.climate_summary.n_students }}
- Teacher Approval Rate (past 7d): {{ $json.teacher_metrics.approval_rate }}%
- Teacher Implementation Rate (past 7d): {{ $json.teacher_metrics.implementation_rate }}%
- Teacher in Inquiry Mode: {{ $json.teacher_metrics.is_inquiry_mode }}

Be concise, empathetic, and actionable. Respond only with the JSON object.`
  };

  /**
   * Gemini LLM Model Node
   * Credential: Google Gemini API
   * Model: gemini-2.0-flash
   */
  @node({
    name: 'Gemini-LLM',
    type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
    typeVersion: 1,
    position: [1900, 400]
  })
  GeminiLLM = {
    googleGenerativeAi_credential: '{{ credentials.googleGenerativeAi }}',
    modelName: 'gemini-2.0-flash',
    temperature: 0.8,
    topK: 3,
    topP: 0.95,
    maxOutputTokens: 256
  };

  /**
   * Fallback & Validation Logic
   * 
   * IF LLM output lacks confidence >= 0.65:
   * - Use rule-based fallback suggestions
   * - Set confidence = 0.5, source = 'fallback'
   */
  @node({
    name: 'Validate & Fallback',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [2400, 200]
  })
  ValidateAndFallback = {
    language: 'javascript',
    jsCode: `
// Parse LLM output
let lmOutput = $json.lm_output;
let recommendation = null;
let fallbackUsed = false;

try {
  if (lmOutput && lmOutput.confidence >= 0.65) {
    recommendation = {
      content: lmOutput.content,
      confidence: lmOutput.confidence,
      source: 'lm',
      rationale: lmOutput.rationale
    };
  } else {
    throw new Error('Low confidence or invalid output');
  }
} catch(e) {
  // Fallback suggestions (rule-based)
  const fallbacks = [
    'Consider a 5-min mood check—quick way to understand the climate.',
    'Try a collaborative problem-solving activity to rebuild connection.',
    'Take 2 mins to share something positive about each student today.'
  ];
  const idx = Math.floor(Math.random() * fallbacks.length);
  recommendation = {
    content: fallbacks[idx],
    confidence: 0.5,
    source: 'fallback',
    lm_error: e.message
  };
  fallbackUsed = true;
}

return {
  recommendation: recommendation,
  fallback_used: fallbackUsed
};
`
  };

  /**
   * Policy Classification
   * 
   * Rules:
   * - IF mood_trend DOWN > 15% → policy='WARNING'
   * - ELSE IF confidence < 0.5 → policy='ROUTINE'
   * - ELSE → policy='ROUTINE' (default)
   */
  @node({
    name: 'Classify Policy',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [2400, 350]
  })
  ClassifyPolicy = {
    language: 'javascript',
    jsCode: `
const trend = $json.climate_summary.mood_trend || '';
const confidence = $json.recommendation.confidence || 0.5;
const trendMagnitude = parseFloat(trend) || 0;

let policy = 'ROUTINE';
let triggerReason = '';

if (trendMagnitude < -15) {
  policy = 'WARNING';
  triggerReason = 'Significant mood decline detected (>' + Math.abs(trendMagnitude) + '%) vs baseline';
} else if (confidence < 0.5) {
  policy = 'ROUTINE';
  triggerReason = 'Low confidence in recommendation; offering general guidance';
} else {
  policy = 'ROUTINE';
  triggerReason = 'Daily climate briefing per schedule';
}

return {
  policy: policy,
  trigger_reason: triggerReason
};
`
  };

  /**
   * T030: Tone Audit (Anti-patterns scan)
   * 
   * Verify recommendation doesn't contain alert-like language
   * Flag if keywords found: "warning", "danger", "alert", "failing", "critical"
   */
  @node({
    name: 'Tone Audit',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [2600, 200]
  })
  ToneAudit = {
    language: 'javascript',
    jsCode: `
const alertKeywords = ['warning', 'danger', 'alert', 'failing', 'critical'];
const content = $json.recommendation.content.toLowerCase();

let toneWarning = false;
let flaggedKeywords = [];

for (const keyword of alertKeywords) {
  if (content.includes(keyword)) {
    toneWarning = true;
    flaggedKeywords.push(keyword);
  }
}

return {
  tone_warning: toneWarning,
  flagged_keywords: flaggedKeywords,
  recommendation: toneWarning 
    ? $json.recommendation.content.replace(/warning|danger|alert|failing|critical/, word => 'Let\\'s ' + word)
    : $json.recommendation.content
};
`
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // PHASE 7: NOTIFICATION & RECORDING
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * T031: Prepare LINE Notif Message
   * 
   * Template:
   * "☀️ Good Morning, {teacher}!
   *  📊 Classroom Climate (past 24h)
   *  Mean Mood: 3.5/5 (±0.8)
   *  Change vs. last week: ↓ down 15%
   *  💡 I suggest: {recommendation}
   *  ✅ Last week: {total} → {approved} → {implemented} ({closure%})
   *  [Approve & Try] [Dismiss] [More...]"
   */
  @node({
    name: 'Prepare LINE Message',
    type: 'n8n-nodes-base.code',
    typeVersion: 1,
    position: [2800, 200]
  })
  PrepareLineMessage = {
    language: 'javascript',
    jsCode: `
const climate = $json.climate_summary || {};
const rec = $json.recommendation || {};
const closure = $json.closure_metrics || {};
const teacher = $json.teacher_name || 'Teacher';

const message = \`☀️ Good Morning, \${teacher}!

📊 Classroom Climate (past 24h)
Mean Mood: \${climate.mean_mood?.toFixed(1) || '?'}/5 (±\${climate.std_dev?.toFixed(1) || '?'})
Change vs. last week: \${climate.mood_trend || '→'}

💡 I suggest: \${rec.content || 'Check in with your class today.'}
Confidence: \${(rec.confidence * 100).toFixed(0) || '?'}%

✅ Last week: \${closure.total || 0} suggestions → \${closure.approved || 0} approved → \${closure.implemented || 0} implemented (\${closure.closure_rate ? (closure.closure_rate * 100).toFixed(0) : 0}%)

Ready to try?
\`;

// LINE Notify limits message to 1000 chars
const trimmed = message.length > 1000 ? message.substring(0, 997) + '...' : message;

return {
  line_message: trimmed,
  message_length: trimmed.length
};
`
  };

  /**
   * T032: Send LINE Notify
   * 
   * Method: POST to https://notify-api.line.me/api/notify
   * Auth: Bearer token from LINE Notify credential
   * Error handling: Retry 3x with backoff
   */
  @node({
    name: 'Send LINE Notify',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [3000, 200]
  })
  SendLineNotify = {
    url: 'https://notify-api.line.me/api/notify',
    method: 'POST',
    authentication: 'predefinedCredentialType',
    nodeCredentialType: 'lineNotifyOAuth2Api',
    sendHeaders: true,
    headerParameters: {
      'Authorization': 'Bearer {{ $json.line_notify_token }}'
    },
    sendBody: true,
    bodyParameters: {
      message: '{{ $json.line_message }}'
    },
    bodyParametersUi: 'keyvalue',
    options: {
      retryOnStatusCodeError: [429, 500, 502, 503],
      retryMaxTries: 3,
      retryWaitTime: 2000
    }
  };

  /**
   * T033: Insert Recommendation Record
   * 
   * Captures: climate data, recommendation, confidence, policy, trigger reason
   * For loop closure tracking and audit
   */
  @node({
    name: 'Insert Recommendation',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [3200, 100]
  })
  InsertRecommendation = {
    operation: 'insert',
    table: 'recommendations',
    columns: [
      'id',
      'class_id',
      'teacher_id',
      'school_id',
      'content',
      'confidence_score',
      'policy',
      'ai_model',
      'trigger_reason',
      'climate_snapshot',
      'teacher_response_pattern',
      'sent_via',
      'teacher_notification_sent_at',
      'created_at'
    ],
    values: {
      id: '{{ uuid() }}',
      class_id: '{{ $json.class_id }}',
      teacher_id: '{{ $json.teacher_id }}',
      school_id: '{{ $json.school_id }}',
      content: '{{ $json.recommendation.content }}',
      confidence_score: '{{ $json.recommendation.confidence }}',
      policy: '{{ $json.policy }}',
      ai_model: 'gemini-2.0-flash',
      trigger_reason: '{{ $json.trigger_reason }}',
      climate_snapshot: '{{ stringify($json.climate_summary) }}',
      teacher_response_pattern: '{{ stringify($json.past_recommendations) }}',
      sent_via: 'LINE',
      teacher_notification_sent_at: '{{ now() }}',
      created_at: '{{ now() }}'
    }
  };

  /**
   * T034: Insert Audit Log Entry
   * 
   * High-fidelity decision path logging for transparency
   * Captures all gates, tool invocations, and agentic decisions
   */
  @node({
    name: 'Insert Audit Log',
    type: 'n8n-nodes-base.postgres',
    typeVersion: 1,
    position: [3200, 350]
  })
  InsertAuditLog = {
    operation: 'insert',
    table: 'n8n_audit_log',
    columns: [
      'id',
      'timestamp',
      'workflow_id',
      'workflow_name',
      'execution_id',
      'school_id',
      'class_id',
      'teacher_id',
      'decision_path_json',
      'policy_applied',
      'confidence_score',
      'gates_passed',
      'tools_invoked',
      'tool_outputs',
      'action_taken',
      'recommendation_id',
      'notification_sent_at'
    ],
    values: {
      id: '{{ uuid() }}',
      timestamp: '{{ now() }}',
      workflow_id: 'W06',
      workflow_name: 'Morning AI Briefing',
      execution_id: '{{ $json.execution_id }}',
      school_id: '{{ $json.school_id }}',
      class_id: '{{ $json.class_id }}',
      teacher_id: '{{ $json.teacher_id }}',
      decision_path_json: '{{ stringify($json.full_decision_path) }}',
      policy_applied: '{{ $json.policy }}',
      confidence_score: '{{ $json.recommendation.confidence }}',
      gates_passed: '{{ stringify({k_anonymity: $json.k_anonymity_check, frequency: $json.frequency_check, availability: $json.availability_check}) }}',
      tools_invoked: '{{ stringify(["get_class_climate_summary", "get_past_recommendations", "get_teacher_action_rate"]) }}',
      tool_outputs: '{{ stringify({climate: $json.climate_summary, recommendations: $json.past_recommendations, teacher: $json.teacher_metrics}) }}',
      action_taken: 'SEND_LINE_NOTIFICATION',
      recommendation_id: '{{ $json.recommendation_id }}',
      notification_sent_at: '{{ now() }}'
    }
  };

  /**
   * T035: Dashboard Cache Revalidation Webhook
   * 
   * Trigger ISR on Next.js dashboard to update briefing widget
   * Notify dashboard that new recommendation is available
   */
  @node({
    name: 'Revalidate Dashboard',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4,
    position: [3400, 200]
  })
  RevalidateDashboard = {
    url: 'http://localhost:3000/api/n8n/webhook',  // Change to prod URL in deployment
    method: 'POST',
    sendHeaders: true,
    sendBody: true,
    headerParameters: {
      'Content-Type': 'application/json',
      'X-n8n-signature': '{{ signature() }}'  // Optional: implement signature verification
    },
    bodyParameters: {
      workflow: 'W06',
      action: 'briefing_sent',
      teacher_id: '{{ $json.teacher_id }}',
      class_id: '{{ $json.class_id }}',
      recommendation_id: '{{ $json.recommendation_id }}',
      sent_at: '{{ now() }}',
      policy: '{{ $json.policy }}'
    },
    options: {
      continueOnFail: true  // Don't fail workflow if revalidation fails
    }
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // ROUTING & CONNECTIONS
  // ──────────────────────────────────────────────────────────────────────────────

  @links()
  defineRouting() {
    // Schedule Trigger → Check School Day
    this.ScheduleTrigger.out(0).to(this.CheckSchoolDay.in(0));

    // Check School Day → Decide if today is school day
    this.CheckSchoolDay.out(0).to(this.IsSchoolDayDecision.in(0));

    // IS School Day gate
    // Branch 1 (true) → Get Teachers
    this.IsSchoolDayDecision.out(1).to(this.FetchActiveTeachers.in(0));
    // Branch 0 (false) → END (skip entire workflow)
    // this.IsSchoolDayDecision.out(0).to(this.End.in(0));

    // Get Teachers → Loop: Split Teachers
    this.FetchActiveTeachers.out(0).to(this.LoopSplitTeachers.in(0));

    // Loop: Split Teachers → Get Classes for each teacher
    this.LoopSplitTeachers.out(0).to(this.FetchTeacherClasses.in(0));

    // Fetch Classes → Loop: Split Classes
    this.FetchTeacherClasses.out(0).to(this.LoopSplitClasses.in(0));

    // Loop: Split Classes → Parallel fetch (climate, past recs, teacher metrics)
    this.LoopSplitClasses.out(0).to(this.ToolGetClimateSummary.in(0));
    this.LoopSplitClasses.out(0).to(this.ToolGetPastRecommendations.in(0));
    this.LoopSplitClasses.out(0).to(this.ToolGetTeacherMetrics.in(0));

    // All tools → K-Anonymity Check gate
    this.ToolGetClimateSummary.out(0).to(this.KAnonymityCheck.in(0));

    // K-Anonymity gate
    // Branch 1 (true) → Check Frequency
    this.KAnonymityCheck.out(1).to(this.CheckFrequencyGuard.in(0));
    // Branch 0 (false) → END (skip this class)

    // Check Frequency → Decision gate
    this.CheckFrequencyGuard.out(0).to(this.FrequencyGuardDecision.in(0));

    // Frequency Gate
    // Branch 1 (true) → Check Availability
    this.FrequencyGuardDecision.out(1).to(this.CheckTeacherAvailability.in(0));
    // Branch 0 (false) → END (skip, too many notifications today)

    // Check Availability
    // Branch 1 (true) → LangChain Agent
    this.CheckTeacherAvailability.out(1).to(this.LangChainAgent.in(0));
    // Branch 0 (false) → END (teacher on leave)

    // LangChain Agent also uses Gemini LLM
    this.GeminiLLM.out(0).uses({
      ai_languageModel: this.GeminiLLM.output
    });

    // LangChain Agent → Validate & Fallback
    this.LangChainAgent.out(0).to(this.ValidateAndFallback.in(0));

    // Validate → Classify Policy (parallel)
    this.ValidateAndFallback.out(0).to(this.ClassifyPolicy.in(0));
    this.ValidateAndFallback.out(0).to(this.ToneAudit.in(0));

    // Policy Classification + Tone Audit → Prepare LINE Message
    this.ClassifyPolicy.out(0).to(this.PrepareLineMessage.in(0));
    this.ToneAudit.out(0).to(this.PrepareLineMessage.in(1));

    // Prepare LINE Message → Send LINE Notify
    this.PrepareLineMessage.out(0).to(this.SendLineNotify.in(0));

    // Send LINE → Insert Recommendation (parallel)
    this.SendLineNotify.out(0).to(this.InsertRecommendation.in(0));

    // Send LINE → Insert Audit Log (parallel)
    this.SendLineNotify.out(0).to(this.InsertAuditLog.in(0));

    // Insert Recommendation → Revalidate Dashboard
    this.InsertRecommendation.out(0).to(this.RevalidateDashboard.in(0));

    // Insert Audit Log → Revalidate Dashboard
    this.InsertAuditLog.out(0).to(this.RevalidateDashboard.in(0));

    // Revalidate Dashboard → End (loop back to next teacher/class iteration)
    // For loop handling, this returns to LoopSplitClasses for next iteration
  }
}
