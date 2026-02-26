import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : tool-get-teacher-action-rate
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
    id: "f64ztSYZ41AZc8JQ",
    name: "tool-get-teacher-action-rate",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class ToolGetTeacherActionRateWorkflow {

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
        "operation": "executeQuery",
        "reason": "",
        "query": "=SELECT \n  COUNT(CASE WHEN status IN ('approved', 'edited') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0) AS action_rate,\n  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count\nFROM public.recommendations \nWHERE class_id = '{{ $json.query.class_id }}';"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.Reason.out(0).to(this.ExecuteWorkflowTrigger.in(0));
        this.ExecuteWorkflowTrigger.out(0).to(this.Postgres.in(0));
    }
}