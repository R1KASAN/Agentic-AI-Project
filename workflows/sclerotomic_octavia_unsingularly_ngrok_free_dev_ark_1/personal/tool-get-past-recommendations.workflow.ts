import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : tool-get-past-recommendations
// Nodes   : 3  |  Connections: 2
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Reason                             stickyNote                 
// ExecuteWorkflowTrigger             executeWorkflowTrigger     
// Postgres                           postgres                   
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// Reason
//    → ExecuteWorkflowTrigger
//      → Postgres
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "m4Q2PTyEymdrPtk7",
    name: "tool-get-past-recommendations",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class ToolGetPastRecommendationsWorkflow {

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
        name: "Execute Workflow Trigger",
        type: "n8n-nodes-base.executeWorkflowTrigger",
        version: 1.1,
        position: [200, 200]
    })
    ExecuteWorkflowTrigger = {
        "reason": ""
    };

    @node({
        name: "Postgres",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [400, 200]
    })
    Postgres = {
        "reason": "",
        "query": "=SELECT * FROM public.recommendations WHERE class_id = '{{ $json.query.class_id }}' ORDER BY created_at DESC LIMIT 5;",
        "operation": "executeQuery"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.ExecuteWorkflowTrigger.out(0).to(this.Postgres.in(0));
        this.Reason.out(0).to(this.ExecuteWorkflowTrigger.in(0));
    }
}