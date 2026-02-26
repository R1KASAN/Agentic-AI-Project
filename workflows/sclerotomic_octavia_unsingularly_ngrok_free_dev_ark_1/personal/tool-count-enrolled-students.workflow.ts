import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : tool-count-enrolled-students
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
    id: "roM4WCNpr0k4NMNa",
    name: "tool-count-enrolled-students",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class ToolCountEnrolledStudentsWorkflow {

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
        "content": "This is a dummy node to pass schema validation",
        "reason": ""
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
        "query": "=SELECT COUNT(*) FROM public.users u JOIN public.class_enrollments ce ON u.id = ce.student_id WHERE ce.class_id = '{{ $json.query.class_id }}' AND u.role = 'student';",
        "reason": ""
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