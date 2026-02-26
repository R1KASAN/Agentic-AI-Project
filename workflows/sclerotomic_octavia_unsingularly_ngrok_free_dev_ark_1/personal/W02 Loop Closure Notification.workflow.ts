import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : W02 Loop Closure Notification
// Nodes   : 4  |  Connections: 3
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// Reason                             stickyNote                 
// Webhook                            webhook                    
// CreateNotifications                postgres                   
// NotifyAppWebhook                   httpRequest                
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// Reason
//    → Webhook
//      → CreateNotifications
//        → NotifyAppWebhook
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: "OJY4DmzzvK1XLcWj",
    name: "W02 Loop Closure Notification",
    active: false,
    settings: {executionOrder:"v1",saveDataErrorExecution:"all",saveDataSuccessExecution:"all",saveManualExecutions:true,saveExecutionProgress:true,callerPolicy:"workflowsFromSameOwner",availableInMCP:false}
})
export class W02LoopClosureNotificationWorkflow {

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
        "content": "Dummy node for strict JSON schema requirement",
        "reason": ""
    };

    @node({
        name: "Webhook",
        type: "n8n-nodes-base.webhook",
        version: 1.1,
        position: [200, 200]
    })
    Webhook = {
        "httpMethod": "POST",
        "reason": "",
        "path": "loop-closure-communicated"
    };

    @node({
        name: "Create Notifications",
        type: "n8n-nodes-base.postgres",
        version: 2.6,
        position: [400, 200]
    })
    CreateNotifications = {
        "reason": "",
        "operation": "executeQuery",
        "query": "=INSERT INTO public.notifications (user_id, type, message, class_id)\nSELECT DISTINCT\n    sp.user_id, \n    'loop_closure'::public.notification_type, \n    'Your teacher has taken action to improve the classroom: ' || {{ $json.body.recommendation_text }}, \n    {{ $json.body.class_id }}\nFROM public.student_pulses sp\nWHERE sp.class_id = '{{ $json.body.class_id }}'\n  AND sp.created_at >= now() - interval '2 weeks';"
    };

    @node({
        name: "Notify App Webhook",
        type: "n8n-nodes-base.httpRequest",
        version: 4.4,
        position: [600, 200]
    })
    NotifyAppWebhook = {
        "bodyParameters": {
            "parameters": [
                {
                    "name": "event",
                    "value": "loop_closure_communicated"
                }
            ]
        },
        "authentication": "none",
        "headerParameters": {
            "parameters": [
                {
                    "value": "=Bearer {{ $env[\"N8N_WEBHOOK_SECRET\"] }}",
                    "name": "Authorization"
                }
            ]
        },
        "url": "http://host.docker.internal:3000/api/n8n/webhook",
        "options": {},
        "requestMethod": "POST",
        "sendBody": true,
        "reason": "",
        "sendHeaders": true,
        "specifyBody": "json"
    };


    // =====================================================================
// ROUTAGE ET CONNEXIONS
// =====================================================================

    @links()
    defineRouting() {
        this.CreateNotifications.out(0).to(this.NotifyAppWebhook.in(0));
        this.Reason.out(0).to(this.Webhook.in(0));
        this.Webhook.out(0).to(this.CreateNotifications.in(0));
    }
}