import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : W05 Weekly Teacher Email Summary
// Nodes   : 4  |  Connections: 3
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ScheduleTrigger3                   scheduleTrigger            
// GetTeachersWithPendingActions      postgres                   [onError→regular] [creds]
// SendEmailViaSendgrid               sendGrid                   [onError→regular]
// NotifyWebhook2                     httpRequest                [onError→regular] [creds]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger3
//    → GetTeachersWithPendingActions
//      → SendEmailViaSendgrid
//        → NotifyWebhook2
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "zRmZ8LHg0glp3NWi",
    name: "W05 Weekly Teacher Email Summary",
    active: false,
    settings: {executionOrder:"v1",binaryMode:"separate",availableInMCP:false,saveManualExecutions:true,saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner"}
})
export class W05WeeklyTeacherEmailSummaryWorkflow {

    // =====================================================================
// CONFIGURATION DES NOEUDS
// =====================================================================

    @node({
        name: "Schedule Trigger3",
        type: "n8n-nodes-base.scheduleTrigger",
        version: 1.3,
        position: [0, 0]
    })
    ScheduleTrigger3 = {
        "rule": {
            "interval": [
                {
                    "expression": "0 7 * * 1",
                    "field": "cronExpression"
                }
            ]
        }
    };

    @node({
        name: "Get Teachers With Pending Actions",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [200, 0],
        credentials: {postgres:{id:"4dT3BPrD8auyMzJj",name:"Postgres account"}},
        onError: "continueRegularOutput"
    })
    GetTeachersWithPendingActions = {
        "operation": "executeQuery",
        "query": "SELECT au.email, u.full_name as teacher_name, c.name as class_name, c.risk_score, c.id as class_id, COUNT(r.id) as pending_count FROM public.users u JOIN auth.users au ON u.id = au.id JOIN public.classes c ON u.id = c.teacher_id LEFT JOIN public.recommendations r ON c.id = r.class_id AND r.status = 'pending' WHERE u.role = 'teacher' GROUP BY au.email, u.full_name, c.name, c.risk_score, c.id HAVING COUNT(r.id) > 0;"
    };

    @node({
        name: "Send Email via SendGrid",
        type: "n8n-nodes-base.sendGrid",
        version: 1,
        position: [400, 0],
        onError: "continueRegularOutput"
    })
    SendEmailViaSendgrid = {
        "additionalFields": {},
        "fromEmail": "noreply@climateagent.edu",
        "contentType": "text",
        "resource": "mail",
        "contentValue": "=Hi {{ $json.teacher_name }},\\n\\nYour class {{ $json.class_name }} has a current risk score of {{ $json.risk_score }}. You have {{ $json.pending_count }} AI-drafted recommendations waiting for your approval.\\n\\nPlease review them here: {{ $env.NEXT_PUBLIC_APP_URL }}/teacher/actions\\n\\nClimate Agent",
        "subject": "=Weekly Climate Summary: {{ $json.class_name }}",
        "toEmail": "={{ $json.email }}"
    };

    @node({
        name: "Notify Webhook2",
        type: "n8n-nodes-base.httpRequest",
        version: 4.4,
        position: [600, 0],
        credentials: {httpHeaderAuth:{id:"Fm1dI06vj3sLz11Y",name:"Nextjs Webhook Secret"}},
        onError: "continueRegularOutput"
    })
    NotifyWebhook2 = {
        "authentication": "predefinedCredentialType",
        "specifyBody": "json",
        "method": "POST",
        "sendBody": true,
        "nodeCredentialType": "httpHeaderAuth",
        "bodyParameters": {
            "parameters": [
                {
                    "value": "teacher_email_sent",
                    "name": "event"
                }
            ]
        },
        "url": "http://host.docker.internal:3000/api/n8n/webhook"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.GetTeachersWithPendingActions.out(0).to(this.SendEmailViaSendgrid.in(0));
        this.SendEmailViaSendgrid.out(0).to(this.NotifyWebhook2.in(0));
        this.ScheduleTrigger3.out(0).to(this.GetTeachersWithPendingActions.in(0));
    }
}