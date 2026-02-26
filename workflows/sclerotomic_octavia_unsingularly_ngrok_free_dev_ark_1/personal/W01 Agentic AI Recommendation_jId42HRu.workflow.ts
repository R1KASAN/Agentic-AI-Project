import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : W01 Agentic AI Recommendation
// Nodes   : 14  |  Connections: 6
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Reason                             stickyNote                 
// ScheduleTrigger                    scheduleTrigger            
// GetActiveClasses                   postgres                   [creds]
// LoopOverClasses                    splitInBatches             
// NotifyWebhook                      httpRequest                
// BuildAgentContext                  code                       
// AiRecommendationAgent              agent                      [AI]
// GoogleGeminiChatModel              lmChatGoogleGemini         [creds]
// ToolGetClimateSummary              toolWorkflow               
// ToolGetPastRecommendations         toolWorkflow               
// ToolGetTrendComparison             toolWorkflow               
// ToolCountEnrolledStudents          toolWorkflow               
// ToolGetTeacherActionRate           toolWorkflow               
// ToolSubmitRecommendation           toolWorkflow               
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger
//    → GetActiveClasses
//      → LoopOverClasses
//        → NotifyWebhook
//       .out(1) → BuildAgentContext
//          → AiRecommendationAgent
//            → LoopOverClasses (↩ loop)
//
// AI CONNECTIONS
// GoogleGeminiChatModel.uses({ ai_languageModel: AiRecommendationAgent })
// ToolGetClimateSummary.uses({ ai_tool: [ToolGetClimateSummary, ToolGetPastRecommendations, ToolGetTrendComparison, ToolCountEnrolledStudents, ToolGetTeacherActionRate, ToolSubmitRecommendation] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "jId42HRuqekDno9w",
    name: "W01 Agentic AI Recommendation",
    active: false,
    settings: {executionOrder:"v1",binaryMode:"separate",availableInMCP:false}
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
        "content": "This is a dummy node to pass schema validation"
    };

    @node({
        name: "Schedule Trigger",
        type: "n8n-nodes-base.scheduleTrigger",
        version: 1.3,
        position: [256, 0]
    })
    ScheduleTrigger = {
        "rule": {
            "interval": [
                {
                    "field": "cronExpression",
                    "expression": "0 6 * * 1"
                }
            ]
        }
    };

    @node({
        name: "Get Active Classes",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [512, 0],
        credentials: {postgres:{id:"4dT3BPrD8auyMzJj",name:"Postgres account"}}
    })
    GetActiveClasses = {
        "operation": "executeQuery",
        "query": "=SELECT id AS class_id, name, school_id FROM public.classes WHERE risk_score >= 0;",
        "options": {}
    };

    @node({
        name: "Loop Over Classes",
        type: "n8n-nodes-base.splitInBatches",
        version: 3,
        position: [752, 0]
    })
    LoopOverClasses = {
        "options": {}
    };

    @node({
        name: "Notify Webhook",
        type: "n8n-nodes-base.httpRequest",
        version: 4.4,
        position: [1008, 0]
    })
    NotifyWebhook = {
        "url": "http://host.docker.internal:3000/api/n8n/webhook",
        "sendHeaders": true,
        "headerParameters": {
            "parameters": [
                {
                    "name": "Authorization",
                    "value": "=Bearer {{ $env[\"N8N_WEBHOOK_SECRET\"] }}"
                }
            ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "options": {}
    };

    @node({
        name: "Build Agent Context",
        type: "n8n-nodes-base.code",
        version: 2,
        position: [752, 208]
    })
    BuildAgentContext = {
        "jsCode": "const classId = $input.item.json.class_id;\nconst className = $input.item.json.name;\n\nreturn {\n  json: {\n    system_prompt: `You are an AI assistant designed to help teachers improve their classroom climate...`,\n    user_prompt: `Please evaluate the classroom climate for class: ${className} (ID: ${classId}) and suggest actionable recommendations.`,\n    class_id: classId\n  }\n};"
    };

    @node({
        name: "AI Recommendation Agent",
        type: "@n8n/n8n-nodes-langchain.agent",
        version: 3.1,
        position: [1008, 208]
    })
    AiRecommendationAgent = {
        "text": "={{ $json.user_prompt }}",
        "options": {
            "systemMessage": "={{ $json.system_prompt }}"
        }
    };

    @node({
        name: "Google Gemini Chat Model",
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        version: 1,
        position: [1008, 464],
        credentials: {googlePalmApi:{id:"1bR2g1H2lNVJZdj9",name:"Google Gemini(PaLM) Api account"}}
    })
    GoogleGeminiChatModel = {
        "options": {}
    };

    @node({
        name: "Tool: Get Climate Summary",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1200, 400]
    })
    ToolGetClimateSummary = {
        "workflowId": "sePmJECuRJZRzuNA"
    };

    @node({
        name: "Tool: Get Past Recommendations",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1408, 400]
    })
    ToolGetPastRecommendations = {
        "workflowId": "m4Q2PTyEymdrPtk7"
    };

    @node({
        name: "Tool: Get Trend Comparison",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1600, 400]
    })
    ToolGetTrendComparison = {
        "workflowId": "VtrnbinNk13QvRTF"
    };

    @node({
        name: "Tool: Count Enrolled Students",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1200, 608]
    })
    ToolCountEnrolledStudents = {
        "workflowId": "roM4WCNpr0k4NMNa"
    };

    @node({
        name: "Tool: Get Teacher Action Rate",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1408, 608]
    })
    ToolGetTeacherActionRate = {
        "workflowId": "f64ztSYZ41AZc8JQ"
    };

    @node({
        name: "Tool: Submit Recommendation",
        type: "@n8n/n8n-nodes-langchain.toolWorkflow",
        version: 2.2,
        position: [1600, 608]
    })
    ToolSubmitRecommendation = {
        "workflowId": "tURaOxy7GFTbqPis"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
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