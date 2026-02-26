import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : W04 Sunday Health Score
// Nodes   : 3  |  Connections: 2
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ScheduleTrigger                    scheduleTrigger            [creds]
// UpdateHealthScores                 postgres                   [onError→regular] [creds]
// NotifyWebhook                      httpRequest                [onError→regular] [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger
//    → UpdateHealthScores
//      → NotifyWebhook
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "a14iWR631kx158D5",
    name: "W04 Sunday Health Score",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class W04SundayHealthScoreWorkflow {

    // =====================================================================
// CONFIGURATION DES NOEUDS
// =====================================================================

    @node({
        name: "Schedule Trigger",
        type: "n8n-nodes-base.scheduleTrigger",
        version: 1.3,
        position: [0, 0],
        credentials: {reason:"Required parameter"}
    })
    ScheduleTrigger = {
        "rule": {
            "interval": [
                {
                    "expression": "0 9 * * 0",
                    "field": "cronExpression"
                }
            ]
        }
    };

    @node({
        name: "Update Health Scores",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [200, 0],
        credentials: {postgres:{name:"Supabase Postgres",id:"K6OaMmdyQhXmXq0q"}},
        onError: "continueRegularOutput"
    })
    UpdateHealthScores = {
        "operation": "executeQuery",
        "query": "UPDATE public.schools s\\nSET \\n  health_score = 100 - COALESCE((\\n    SELECT AVG(risk_score)::INTEGER \\n    FROM public.classes c \\n    WHERE c.school_id = s.id\\n  ), 0),\\n  last_calculated = now()\\nRETURNING id as school_id;"
    };

    @node({
        name: "Notify Webhook",
        type: "n8n-nodes-base.httpRequest",
        version: 4.4,
        position: [400, 0],
        credentials: {httpHeaderAuth:{id:"Fm1dI06vj3sLz11Y",name:"Nextjs Webhook Secret"}},
        onError: "continueRegularOutput"
    })
    NotifyWebhook = {
        "method": "POST",
        "url": "http://host.docker.internal:3000/api/n8n/webhook",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "specifyBody": "json",
        "sendBody": true,
        "bodyParameters": {
            "parameters": [
                {
                    "name": "event",
                    "value": "health_score_updated"
                },
                {
                    "name": "school_id",
                    "value": "={{ $json.school_id }}"
                }
            ]
        }
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.UpdateHealthScores.out(0).to(this.NotifyWebhook.in(0));
        this.ScheduleTrigger.out(0).to(this.UpdateHealthScores.in(0));
    }
}