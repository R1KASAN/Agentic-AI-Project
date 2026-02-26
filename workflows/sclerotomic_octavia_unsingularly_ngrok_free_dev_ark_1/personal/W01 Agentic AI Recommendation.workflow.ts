import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : W01 Agentic AI Recommendation
// Nodes   : 14  |  Connections: 7
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Reason                             stickyNote                 
// ScheduleTrigger                    scheduleTrigger            
// GetActiveClasses                   postgres                   
// LoopOverClasses                    splitInBatches             
// NotifyWebhook                      httpRequest                
// BuildAgentContext                  code                       
// AiRecommendationAgent              agent                      [AI]
// GoogleGeminiChatModel              lmChatGoogleGemini         
// ToolGetClimateSummary              toolWorkflow               
// ToolGetPastRecommendations         toolWorkflow               
// ToolGetTrendComparison             toolWorkflow               
// ToolCountEnrolledStudents          toolWorkflow               
// ToolGetTeacherActionRate           toolWorkflow               
// ToolSubmitRecommendation           toolWorkflow               
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// Reason
//    → ScheduleTrigger
//      → GetActiveClasses
//        → LoopOverClasses
//          → NotifyWebhook
//         .out(1) → BuildAgentContext
//            → AiRecommendationAgent
//              → LoopOverClasses (↩ loop)
//
// AI CONNECTIONS
// GoogleGeminiChatModel.uses({ ai_languageModel: AiRecommendationAgent })
// ToolGetClimateSummary.uses({ ai_tool: [ToolGetClimateSummary, ToolGetPastRecommendations, ToolGetTrendComparison, ToolCountEnrolledStudents, ToolGetTeacherActionRate, ToolSubmitRecommendation] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "8GRng9RuVvzJeERG",
    name: "W01 Agentic AI Recommendation",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class W01AgenticAiRecommendationWorkflow {

    // =====================================================================
// CONFIGURATION DES NOEUDS
// =====================================================================

    @node({
        name: "reason",
        type: "n8n-nodes-base.stickyNote",
        version: 1,
        position: [0, 0]
    })
    Reason = {
        "reason": "",
        "content": "This is a dummy node to pass schema validation"
    };

    @node({
        name: "Schedule Trigger",
        type: "n8n-nodes-base.scheduleTrigger",
        version: 1.3,
        position: [250, 0]
    })
    ScheduleTrigger = {
        "rule": {
            "interval": [
                {
                    "field": "cronExpression",
                    "expression": "0 6 * * 1"
                }
            ]
        },
        "reason": ""
    };

    @node({
        name: "Get Active Classes",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [500, 0]
    })
    GetActiveClasses = {
        "operation": "executeQuery",
        "query": "=SELECT id AS class_id, name, school_id FROM public.classes WHERE risk_score >= 0;",
        "reason": ""
    };

    @node({
        name: "Loop Over Classes",
        type: "n8n-nodes-base.splitInBatches",
        version: 3,
        position: [750, 0]
    })
    LoopOverClasses = {
        "batchSize": 1,
        "options": {}
    };

    @node({
        name: "Notify Webhook",
        type: "n8n-nodes-base.httpRequest",
        version: 4.4,
        position: [1000, 0]
    })
    NotifyWebhook = {
        "specifyBody": "json",
        "authentication": "none",
        "sendBody": true,
        "headerParameters": {
            "parameters": [
                {
                    "value": "=Bearer {{ $env[\"N8N_WEBHOOK_SECRET\"] }}",
                    "name": "Authorization"
                }
            ]
        },
        "sendHeaders": true,
        "url": "http://host.docker.internal:3000/api/n8n/webhook",
        "options": {},
        "bodyParameters": {
            "parameters": [
                {
                    "value": "recommendations_generated",
                    "name": "event"
                }
            ]
        },
        "reason": "",
        "requestMethod": "POST"
    };

    @node({
        name: "Build Agent Context",
        type: "n8n-nodes-base.code",
        version: 2,
        position: [750, 200]
    })
    BuildAgentContext = {
        "jsCode": "const classId = $input.item.json.class_id;\nconst className = $input.item.json.name;\n\nreturn {\n  json: {\n    system_prompt: `You are an AI assistant designed to help teachers improve their classroom climate...`,\n    user_prompt: `Please evaluate the classroom climate for class: ${className} (ID: ${classId}) and suggest actionable recommendations.`,\n    class_id: classId\n  }\n};"
    };

    @node({
        name: "AI Recommendation Agent",
        type: "@n8n/n8n-nodes-langchain.agent",
        version: 3.1,
        position: [1000, 200]
    })
    AiRecommendationAgent = {
        "reason": "",
        "options": {
            "systemMessage": "={{ $json.system_prompt }}"
        },
        "text": "={{ $json.user_prompt }}"
    };

    @node({
        name: "Google Gemini Chat Model",
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        version: 1,
        position: [1000, 450]
    })
    GoogleGeminiChatModel = {
        "options": {},
        "model": "gemini-2.0-flash",
        "reason": ""
    };

    @node({
        name: "Tool: Get Climate Summary",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1200, 400]
    })
    ToolGetClimateSummary = {
        "toolDescription": "Fetches the current week's climate summary for a specific class (pace, fairness, mood). Use this to understand current student sentiment. Requires class_id.",
        "name": "get_climate_summary",
        "workflowId": "sePmJECuRJZRzuNA"
    };

    @node({
        name: "Tool: Get Past Recommendations",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1400, 400]
    })
    ToolGetPastRecommendations = {
        "workflowId": "m4Q2PTyEymdrPtk7",
        "name": "get_past_recommendations",
        "toolDescription": "Fetches the 5 most recent recommendations made for a specific class. Use this to ensure you do not repeat recent advice. Requires class_id."
    };

    @node({
        name: "Tool: Get Trend Comparison",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1600, 400]
    })
    ToolGetTrendComparison = {
        "workflowId": "VtrnbinNk13QvRTF",
        "name": "get_trend_comparison",
        "toolDescription": "Compares this week's climate metrics to last week's for a specific class. Use this to identify if things are improving or degrading. Requires class_id."
    };

    @node({
        name: "Tool: Count Enrolled Students",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1200, 600]
    })
    ToolCountEnrolledStudents = {
        "workflowId": "roM4WCNpr0k4NMNa",
        "name": "count_enrolled_students",
        "toolDescription": "Counts the total number of enrolled students in a specific class. Requires class_id."
    };

    @node({
        name: "Tool: Get Teacher Action Rate",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1400, 600]
    })
    ToolGetTeacherActionRate = {
        "toolDescription": "Calculates the percentage of recommendations the teacher has acted on (approved or edited) vs ignored. Use this to gauge teacher engagement. Requires class_id.",
        "name": "get_teacher_action_rate",
        "workflowId": "f64ztSYZ41AZc8JQ"
    };

    @node({
        name: "Tool: Submit Recommendation",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1600, 600]
    })
    ToolSubmitRecommendation = {
        "toolDescription": "Submits a new actionable recommendation for the teacher. Requires class_id, content (the recommendation text), category (engagement, wellbeing, collaboration, or academic), and priority (high, medium, or low).",
        "workflowId": "tURaOxy7GFTbqPis",
        "name": "submit_recommendation"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.Reason.out(0).to(this.ScheduleTrigger.in(0));
        this.GetActiveClasses.out(0).to(this.LoopOverClasses.in(0));
        this.ScheduleTrigger.out(0).to(this.GetActiveClasses.in(0));
        this.BuildAgentContext.out(0).to(this.AiRecommendationAgent.in(0));
        this.AiRecommendationAgent.out(0).to(this.LoopOverClasses.in(0));
        this.LoopOverClasses.out(0).to(this.NotifyWebhook.in(0));
        this.LoopOverClasses.out(1).to(this.BuildAgentContext.in(0));

        this.AiRecommendationAgent.uses({
            ai_languageModel: this.GoogleGeminiChatModel.output,
            ai_tool: [this.ToolGetClimateSummary.output, this.ToolGetPastRecommendations.output, this.ToolGetTrendComparison.output, this.ToolCountEnrolledStudents.output, this.ToolGetTeacherActionRate.output, this.ToolSubmitRecommendation.output]
        });
    }
}