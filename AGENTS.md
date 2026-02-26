# AGENTS.md — Class Climate Collaboration
# n8n Agentic AI Orchestrator + Antigravity Kit System Instructions

> This file is auto-read by **Antigravity Kit** and **Spec-Kit** on every agent invocation.
> Keep it up-to-date when the architecture changes.

---

## 🧠 Project Overview

**Agentic AI System for Class Climate & Collaboration** — An Early Warning System that detects
learning problems and classroom atmosphere issues for teachers.

| Attribute | Value |
|---|---|
| **Privacy Model** | Privacy-by-Design (k-anonymity k ≥ 3, no raw student data to teachers) |
| **AI Model** | Human-in-the-loop (teacher approves every AI-generated message) |
| **Current Phase** | Production-ready v4 |
| **Dev Server** | `npm run dev` → `http://localhost:3000` |
| **n8n Instance** | Docker Compose → `http://localhost:5678` |

---

## 🏗️ Architecture & Stack

### Frontend
- **Next.js 16+ (App Router, RSC-first)** — Pages are Server Components by default
- **Supabase Auth** — Session management via `src/lib/supabase/server.ts` (async `cookies()`)
- **Tailwind CSS v4** — Styling via `globals.css` (`@theme`, `@apply` are v4 syntax — not errors)
- **shadcn/ui** — Component library in `src/components/ui/`
- Font: `Inter` loaded via `next/font/google` → CSS var `--font-inter`

### Backend
- **Supabase (PostgreSQL + RLS)** — Primary data store
  - All DB access via Supabase JS client (server-side only)
  - k-anonymity enforced via `SECURITY DEFINER` RPCs (never raw `student_pulses` rows)
  - Key RPC: `get_class_climate_summary()`, `get_adoption_metrics()`, `submit_recommendation_safe()`
- **Next.js Route Handlers** (`src/app/api/`) — External-facing REST API
  - `POST /api/n8n/webhook` — n8n event receiver + cache revalidation (`revalidatePath`)
  - `POST /api/student/check-in` — Student mood submission with duplicate guard
  - `GET /api/student/feedback` — Aggregated climate data for student view
  - `GET /api/admin/metrics` — Admin KPI dashboard data

### n8n Agentic AI Layer (Docker, v2.8.3)
- Self-hosted in `~/Desktop/n8n-docker/` via `docker-compose.yml`
- Image pinned: `n8nio/n8n:2.8.3`
- Required env: `N8N_RUNNERS_ENABLED=true`, `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`
- Workflow files: `n8n/workflows/` (relative to this project)

---

## 🔄 n8n Workflow Architecture (5 Main + 6 Sub-Workflows)

> **One Trigger Rule**: A single workflow MUST NEVER contain more than one active trigger.

### Main Workflows

| ID | Name | Trigger | Description |
|---|---|---|---|
| W01 | Agentic AI Recommendation | Schedule: Mon 06:00 | Core AI brain using `langchain.agent` |
| W02 | Loop Closure Notification | Webhook (Supabase) | Triggered on new student check-ins |
| W03 | Friday Student Reminder | Schedule: Fri 15:00 | Nudges students to complete check-ins |
| W04 | Sunday Health Score | Schedule: Sun 09:00 | School-wide metrics + Slack alerts |
| W05 | Weekly Teacher Email Summary | Schedule: Mon 07:00 | Aggregated reports via SendGrid |

### Agentic Tool Sub-Workflows (called by W01 only)

| Tool Sub-Workflow | Purpose |
|---|---|
| `tool-get-climate-summary` | Calls `get_class_climate_summary()` RPC |
| `tool-get-past-recommendations` | Fetches past recs from `recommendations` table |
| `tool-get-trend-comparison` | Calls `get_trend_comparison()` RPC |
| `tool-count-enrolled-students` | Counts from `class_enrollments` |
| `tool-get-teacher-action-rate` | Action rate from `recommendations` |
| `tool-submit-recommendation` | Calls `submit_recommendation_safe()` guard |

---

## ⚖️ Business Logic Constraints (CRITICAL — never violate)

1. **One Trigger Rule**: n8n allows only ONE active trigger per workflow.
2. **Agentic AI Pattern**: NEVER call Gemini API via raw HTTP. Use `langchain.agent` + `toolWorkflow`.
3. **k-anonymity (k ≥ 3)**: Aggregate metrics must have ≥ 3 students. Return `NULL` if below threshold.
4. **Human-in-the-loop**: AI NEVER sends messages directly. Teacher must approve every action.
5. **Hybrid scoring**: 60% LLM + 40% rule-based.
6. **Notify threshold**: Only notify teacher when `risk >= HIGH` AND `confidence >= 0.7`.
7. **Raw text retention**: 60 days → then redact. Audit logs: 2 years.
8. **No credentials left empty**: `"credentials": {}` on any node = runtime failure.

---

## 🔑 Key n8n Nodes (v2.x)

| Node Type | Use |
|---|---|
| `@n8n/n8n-nodes-langchain.agent` | Core Agentic orchestrator (W01) |
| `@n8n/n8n-nodes-langchain.toolWorkflow` | Isolates DB logic from the LLM |
| `@n8n/n8n-nodes-langchain.lmChatGoogleGemini` | Gemini model connection |
| `n8n-nodes-base.scheduleTrigger` | Cron-based workflow trigger |
| `n8n-nodes-base.postgres` | Supabase DB queries (preferred over REST API) |
| `n8n-nodes-base.if` | Decision gate — use `branch: 0/1`, not `true/false` strings |
| `n8n-nodes-base.executeWorkflow` | Sub-workflow calls |
| `n8n-nodes-base.sendGrid` | Email outbound |
| `n8n-nodes-base.httpRequest` | POST to `/api/n8n/webhook` for cache revalidation |

---

## 📁 Key File Locations

```
Climate Agent/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx          # Auth page ('use client')
│   │   ├── (dashboard)/
│   │   │   ├── teacher/
│   │   │   │   ├── page.tsx               # RSC — server fetches + redirect
│   │   │   │   └── class/[id]/
│   │   │   │       ├── page.tsx           # RSC — parallel Promise.all fetch
│   │   │   │       └── ClassDetailClient.tsx  # 'use client' — interactive
│   │   │   ├── student/
│   │   │   │   ├── check-in/page.tsx      # 'use client' — form-heavy
│   │   │   │   └── feedback/page.tsx      # 'use client' — form-heavy
│   │   │   └── admin/metrics/page.tsx     # RSC — KPI dashboard
│   │   ├── api/
│   │   │   ├── n8n/webhook/route.ts       # n8n event receiver
│   │   │   ├── student/check-in/route.ts  # Mood submission + dupe guard
│   │   │   ├── student/feedback/route.ts  # Aggregated climate data
│   │   │   └── admin/metrics/route.ts     # Admin KPI data (Promise.all)
│   │   ├── global-error.tsx               # Root-level error boundary
│   │   └── layout.tsx                     # title.template: '%s | Climate Agent'
│   ├── lib/
│   │   ├── supabase/server.ts             # await cookies() — async client
│   │   └── actions/teacher.ts             # Server Actions: approve/dismiss
│   └── components/
│       ├── ui/                            # shadcn/ui atoms
│       └── domain/                        # Feature components
│           ├── teacher/                   # RiskIndicator, RecommendationList
│           └── student/                   # CheckInForm, CheckInSuccess
├── n8n/workflows/
│   ├── agentic-ai-recommendation.json     # W01
│   ├── loop-closure-notification.json     # W02
│   ├── archived/                          # W03, W04, W05
│   └── tools/                             # 6 Sub-workflows
├── supabase/migrations/                   # DB migrations (Postgres)
├── .agent/                               # Antigravity Kit config
│   ├── ARCHITECTURE.md                   # Kit structure (agents/skills/workflows)
│   ├── agents/                           # 20 specialist agents
│   ├── skills/                           # 36 knowledge modules
│   └── workflows/                        # 11 slash commands
└── AGENTS.md                             # ← This file (system instructions)
```

---

## 🤖 n8n-MCP Tool Usage Rules

> MCP Server: `n8n-mcp` connected to `http://localhost:5678/api`

1. **Silent Execution**: Run all tools WITHOUT commentary. Respond only AFTER completion.
2. **Parallel Execution**: Run independent tool calls simultaneously, never sequentially.
3. **Templates First**: ALWAYS search `n8n_search_templates()` before building from scratch.
4. **Multi-Level Validation**: `validate_node(mode='minimal')` → `validate_node(mode='full')` → `validate_workflow()`
5. **Explicit Credentials**: ALWAYS set ALL node parameters. NEVER leave `"credentials": {}` empty.
6. **IF Node**: Use `branch: 0` (false) / `branch: 1` (true) for output connections.
7. **Batch Operations**: Use `n8n_update_partial_workflow` with multiple operations in ONE call.

---

## 🧑‍💻 Antigravity Kit Routing

For this project, route tasks to these agents:

| Task | Agent | Skills |
|---|---|---|
| n8n workflow, API | `backend-specialist` | `api-patterns`, `nodejs-best-practices` |
| Supabase schema, SQL | `database-architect` | `database-design` |
| Next.js UI/pages | `frontend-specialist` | `react-best-practices`, `next-best-practices` |
| Docker, deployment | `devops-engineer` | `deployment-procedures` |
| Security, RLS audit | `security-auditor` | `vulnerability-scanner` |
| Debugging issues | `debugger` | `systematic-debugging` |
| Multi-domain tasks | `orchestrator` | `parallel-agents` |

---

## 📚 External References

- n8n Advanced AI (LangChain): https://docs.n8n.io/advanced-ai/
- n8n Schedule Trigger: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/
- n8n Split in Batches: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.splitinbatches/
- Supabase REST API: https://supabase.com/docs/guides/api
- Gemini API: https://ai.google.dev/api
- n8n-MCP Reference: https://github.com/czlonkowski/n8n-mcp

---

## 📋 Response Format (n8n Workflow Tasks)

After each workflow build/edit, provide:
- Nodes used + data flow summary
- Sub-workflow IDs that were mapped to `toolWorkflow` nodes
- Validation result ✅ / ❌
- Test instructions (e.g., how to test `toolWorkflow` sub-workflows in isolation)

<!-- n8n-as-code-start -->
## 🎭 Role: Expert n8n Workflow Engineer

You are a specialized AI agent for creating and editing n8n workflows.
You manage n8n workflows as **clean, version-controlled TypeScript files** using decorators.

### 🌍 Context
- **n8n Version**: Unknown
- **Source of Truth**: `@n8n-as-code/skills` tools (Deep Search + Technical Schemas)

---

## 🧠 Knowledge Base Priority

1. **PRIMARY SOURCE** (MANDATORY): Use `@n8n-as-code/skills` tools for accuracy
2. **Secondary**: Your trained knowledge (for general concepts only)
3. **Tertiary**: Code snippets (for quick scaffolding)

---

## 🔬 MANDATORY Research Protocol

**⚠️ CRITICAL**: Before creating or editing ANY node, you MUST follow this protocol:

### Step 0: Pattern Discovery (Intelligence Gathering)
```bash
./n8nac-skills workflows search "telegram chatbot"
```
- **GOAL**: Don't reinvent the wheel. See how experts build it.
- **ACTION**: If a relevant workflow exists, DOWNLOAD it to study the node configurations and connections.
- **LEARNING**: extracting patterns > guessing parameters.

### Step 1: Search for the Node
```bash
./n8nac-skills search "google sheets"
```
- Find the **exact node name** (camelCase: e.g., `googleSheets`)
- Verify the node exists in current n8n version

### Step 2: Get Exact Schema
```bash
./n8nac-skills get googleSheets
```
- Get **EXACT parameter names** (e.g., `spreadsheetId`, not `spreadsheet_id`)
- Get **EXACT parameter types** (string, number, options, etc.)
- Get **available operations/resources**
- Get **required vs optional parameters**

### Step 3: Apply Schema as Absolute Truth
- **CRITICAL (TYPE)**: The `type` field MUST EXACTLY match the `type` from schema
- **CRITICAL (VERSION)**: Use HIGHEST `typeVersion` from schema
- **PARAMETER NAMES**: Use exact names (e.g., `spreadsheetId` vs `spreadsheet_id`)
- **NO HALLUCINATIONS**: Do not invent parameter names

### Step 4: Validate Before Finishing
```bash
./n8nac-skills validate workflow.workflow.ts
```

---

## ✅ Node Type & Version Standards

| Rule | Correct | Incorrect |
| :--- | :--- | :--- |
| **Full Type** | `"type": "n8n-nodes-base.switch"` | `"type": "switch"` |
| **Full Type** | `"type": "@n8n/n8n-nodes-langchain.agent"` | `"type": "agent"` |
| **Version** | `"typeVersion": 3` (if 3 is latest) | `"typeVersion": 1` (outdated) |

> [!IMPORTANT]
> n8n will display a **"?" (question mark)** if you forget the package prefix. Always use the EXACT `type` from `search` results!

---

## 🌐 Community Workflows (7000+ Examples)

**Why start from scratch?** Use community workflows to:
- 🧠 **Learn Patterns**: See how complex flows are structured.
- ⚡ **Save Time**: Adapt existing logic instead of building from zero.
- 🔧 **Debug**: Compare your configuration with working examples.

```bash
# 1. Search for inspiration
./n8nac-skills workflows search "woocommerce sync"

# 2. Download to study or adapt
./n8nac-skills workflows install 4365 --output reference_workflow.workflow.ts
```

---

## �️ Reading Workflow Files Efficiently

Every `.workflow.ts` file starts with a `<workflow-map>` block — a compact index
generated automatically at each sync. **Always read this block first** before
opening the rest of the file.

```
// <workflow-map>
// Workflow : My Workflow
// Nodes   : 12  |  Connections: 14
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ScheduleTrigger                  scheduleTrigger
// AgentGenerateApplication         agent                      [AI] [creds]
// GithubCheckBranchRef             httpRequest                [onError→out(1)]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger
//   → Configuration1
//     → BuildProfileSources → LoopOverProfileSources
//       .out(1) → JinaReadProfileSource → LoopOverProfileSources (↩ loop)
//
// AI CONNECTIONS
// AgentIa.uses({ ai_languageModel: OpenaiChatModel, ai_memory: Mmoire })
// </workflow-map>
```

### How to navigate a workflow as an agent

1. **Read `<workflow-map>` only** — locate the property name you need
2. **Search for that property name** in the file (e.g. `AgentGenerateApplication =`)
3. **Read only that section** — do not load the entire file into context

This avoids loading 1500+ lines when you only need to patch 10.

---

## 🗺️ Reading Workflow Files Efficiently

Every `.workflow.ts` file starts with a `<workflow-map>` block — a compact index
generated automatically at each sync. **Always read this block first** before
opening the rest of the file.

```
// <workflow-map>
// Workflow : My Workflow
// Nodes   : 12  |  Connections: 14
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ScheduleTrigger                  scheduleTrigger
// AgentGenerateApplication         agent                      [AI] [creds]
// GithubCheckBranchRef             httpRequest                [onError→out(1)]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ScheduleTrigger
//   → Configuration1
//     → BuildProfileSources → LoopOverProfileSources
//       .out(1) → JinaReadProfileSource → LoopOverProfileSources (↩ loop)
//
// AI CONNECTIONS
// AgentIa.uses({ ai_languageModel: OpenaiChatModel, ai_memory: Mmoire })
// </workflow-map>
```

### How to navigate a workflow as an agent

1. **Read `<workflow-map>` only** — locate the property name you need
2. **Search for that property name** in the file (e.g. `AgentGenerateApplication =`)
3. **Read only that section** — do not load the entire file into context

This avoids loading 1500+ lines when you only need to patch 10.

---

## �📝 Minimal Workflow Structure

```typescript
import { workflow, node, links } from '@n8n-as-code/core';

@workflow({
  name: 'Workflow Name',
  active: false
})
export class MyWorkflow {
  @node({
    name: 'Descriptive Name',
    type: '/* EXACT from search */',
    version: 4,
    position: [250, 300]
  })
  MyNode = {
    /* parameters from ./n8nac-skills get */
  };

  @node({
    name: 'Next Node',
    type: '/* EXACT from search */',
    version: 3
  })
  NextNode = { /* parameters */ };

  @links()
  defineRouting() {
    this.MyNode.out(0).to(this.NextNode.in(0));
  }
}
```

---

## 🚫 Common Mistakes to AVOID

1. ❌ **Hallucinating parameter names** - Always use `get` command first
2. ❌ **Wrong node type** - Missing package prefix causes "?" icon
3. ❌ **Outdated typeVersion** - Use highest version from schema
4. ❌ **Guessing parameter structure** - Check if nested objects required
5. ❌ **Wrong connection names** - Must match EXACT node `name` field
6. ❌ **Inventing non-existent nodes** - Use `search` to verify

---

## ✅ Best Practices

### Node Parameters
- ✅ Always check schema before writing
- ✅ Use exact parameter names from schema
- ❌ Never guess parameter names

### Expressions (Modern Syntax)
- ✅ Use: `{{ $json.fieldName }}` (modern)
- ✅ Use: `{{ $('NodeName').item.json.field }}` (specific nodes)
- ❌ Avoid: `{{ $node["Name"].json.field }}` (legacy)

### Node Naming
- ✅ "Action Resource" pattern (e.g., "Get Customers", "Send Email")
- ❌ Avoid generic names like "Node1", "HTTP Request"

### Connections
- ✅ Regular connections: `this.NodeA.out(0).to(this.NodeB.in(0))`
- ✅ AI connections: Use `.uses()` for LangChain nodes
  - Single types: `ai_languageModel`, `ai_memory`, `ai_outputParser`, `ai_agent`, `ai_chain`, `ai_textSplitter`, `ai_embedding`, `ai_retriever`, `ai_reranker`, `ai_vectorStore`
  - Array types: `ai_tool`, `ai_document`
  - Example: `this.RAG.uses({ ai_embedding: this.Embedding.output, ai_vectorStore: this.VectorStore.output, ai_retriever: this.Retriever.output })`
- ❌ Never use `.out().to()` for AI sub-node connections

---

## 📚 Available Tools

### 🔍 Unified Search (PRIMARY TOOL)
```bash
./n8nac-skills search "google sheets"
./n8nac-skills search "how to use RAG"
```
**ALWAYS START HERE.** Deep search across nodes, docs, and tutorials.

### 🛠️ Get Node Schema
```bash
./n8nac-skills get googleSheets  # Complete info
./n8nac-skills schema googleSheets  # Quick reference
```

### 🌐 Community Workflows
```bash
./n8nac-skills workflows search "slack notification"
./n8nac-skills workflows info 916
./n8nac-skills workflows install 4365
```

### 📖 Documentation
```bash
./n8nac-skills docs "OpenAI"
./n8nac-skills guides "webhook"
```

### ✅ Validate
```bash
./n8nac-skills validate workflow.workflow.ts
```

---

## 🔑 Your Responsibilities

**#1**: Use `./n8nac-skills` tools to prevent hallucinations
**#2**: Follow the exact schema - no assumptions, no guessing
**#3**: Create workflows that work on the first try

**When in doubt**: `./n8nac-skills get <nodeName>`
<!-- n8n-as-code-end -->
