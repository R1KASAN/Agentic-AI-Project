import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : W03 Friday Student Reminder
// Nodes   : 4  |  Connections: 3
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ScheduleTrigger                    scheduleTrigger            
// GetUncheckedStudents               postgres                   [onError→regular] [creds]
// NotifyStudents                     postgres                   [onError→regular] [creds]
// NotifyWebhook                      httpRequest                [onError→regular] [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger
//    → GetUncheckedStudents
//      → NotifyStudents
//        → NotifyWebhook
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "0CU8EgjCKxf2b3VU",
    name: "W03 Friday Student Reminder",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class W03FridayStudentReminderWorkflow {

    // =====================================================================
// CONFIGURATION DES NOEUDS
// =====================================================================

    @node({
        name: "Schedule Trigger",
        type: "n8n-nodes-base.scheduleTrigger",
        version: 1.3,
        position: [0, 0]
    })
    ScheduleTrigger = {
        "rule": {
            "interval": [
                {
                    "field": "cronExpression",
                    "expression": "0 15 * * 5"
                }
            ]
        }
    };

    @node({
        name: "Get Unchecked Students",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [200, 0],
        credentials: {postgres:{id:"K6OaMmdyQhXmXq0q",name:"Supabase Postgres"}},
        onError: "continueRegularOutput"
    })
    GetUncheckedStudents = {
        "query": "SELECT u.id AS user_id, c.id AS class_id\\nFROM public.users u\\nJOIN public.class_enrollments ce ON u.id = ce.user_id\\nJOIN public.classes c ON ce.class_id = c.id\\nWHERE u.role = 'student' AND c.risk_score >= 0\\n  AND NOT EXISTS (\\n      SELECT 1 FROM public.student_pulses sp\\n      WHERE sp.student_id = u.id AND sp.class_id = c.id\\n        AND sp.created_at >= date_trunc('week', now())\\n  );",
        "operation": "executeQuery"
    };

    @node({
        name: "Notify Students",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [400, 0],
        credentials: {postgres:{id:"K6OaMmdyQhXmXq0q",name:"Supabase Postgres"}},
        onError: "continueRegularOutput"
    })
    NotifyStudents = {
        "operation": "executeQuery",
        "query": "=INSERT INTO public.notifications (user_id, type, message, class_id)\\nVALUES ('{{ $json.user_id }}', 'reminder', 'Please complete your weekly check-in.', '{{ $json.class_id }}')\\nON CONFLICT DO NOTHING;"
    };

    @node({
        name: "Notify Webhook",
        type: "n8n-nodes-base.httpRequest",
        version: 4.4,
        position: [600, 0],
        credentials: {httpHeaderAuth:{id:"Fm1dI06vj3sLz11Y",name:"Nextjs Webhook Secret"}},
        onError: "continueRegularOutput"
    })
    NotifyWebhook = {
        "authentication": "predefinedCredentialType",
        "sendBody": true,
        "specifyBody": "json",
        "url": "http://host.docker.internal:3000/api/n8n/webhook",
        "nodeCredentialType": "httpHeaderAuth",
        "method": "POST"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.GetUncheckedStudents.out(0).to(this.NotifyStudents.in(0));
        this.ScheduleTrigger.out(0).to(this.GetUncheckedStudents.in(0));
        this.NotifyStudents.out(0).to(this.NotifyWebhook.in(0));
    }
}