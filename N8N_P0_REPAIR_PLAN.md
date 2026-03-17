# N8N P0 Repair Plan — Step-by-Step UI Instructions

**Scope:** Critical blockers only (credentials + GET→POST + threshold gates)  
**Estimated Effort:** ~1 hour  
**Target:** Get system from "will crash" → "operational but incomplete"  

---

## 📋 P0 SCOPE

| Issue | Impact | Workflows |
|---|---|---|
| **Empty/broken credentials** | RUNTIME FAILURE on activation | W03, W04, W05 |
| **GET instead of POST** | Payload body silently dropped | W01, W02 |
| **Missing risk threshold gates** | Spams notifications regardless of risk | W01, W02 |

**What we WON'T fix in this plan:**
- Hybrid Scoring (60/40 logic)
- Human-in-the-Loop approval gates
- k-Anonymity filters
- SplitInBatches for bulk operations
- Tool input schema definitions

---

## ✅ WORKFLOW REPAIR CHECKLISTS

---

### W01 — Agentic AI Recommendation

#### ISSUE #1: Notify Webhook uses GET (should be POST)

**What to check first:**
- [ ] Open workflow "Agentic AI Recommendation"
- [ ] Find the final node named "Notify Webhook" (bottom-right of canvas)
- [ ] Double-click it to open settings panel

**Fix:**
1. In the settings panel, look for **"Method"** dropdown (defaults to GET)
2. Click dropdown → select **"POST"**
3. Verify **URL** field shows: `{{ $env.NEXT_PUBLIC_WEBHOOK_URL }}` or similar (async path like `/api/n8n/webhook`)
4. Verify **Headers** section has `Content-Type: application/json`
5. Click **Test** button → check that HTTP request shows `POST 200 OK` in debug output (not GET)
6. **Save** (Ctrl+S or File > Save)

**Verify:**
- Debug output shows `POST` method (not GET)
- Status code is 200–299 range

---

#### ISSUE #2: Missing risk threshold gate before notification

**What to check first:**
- [ ] Look at the node connection flow: `AI Recommendation Agent` → `Notify Webhook`
- [ ] Is there an **IF node** between them? If YES, skip to "Verify IF condition" below. If NO, continue.

**Fix (if no IF node exists):**
1. Right-click on empty canvas between `AI Recommendation Agent` and `Notify Webhook`
2. Click **"Add Step"** → select **"IF"** node (from `n8n-nodes-base.if`)
3. Configure IF node:
   - **Node name:** "Check Risk Threshold"
   - **Condition:** Left side = `{{ $json.risk_level }}`, Operator = `equals`, Right side = `"HIGH"`
   - **Add another condition:** AND `{{ $json.confidence }}`, Operator = `>`, `0.7`
   - (This creates: `risk_level == "HIGH" AND confidence > 0.7`)
4. **Connection routing:**
   - Disconnect `AI Recommendation Agent` → `Notify Webhook`
   - Connect `AI Recommendation Agent` → `Check Risk Threshold` (input)
   - Connect `Check Risk Threshold` **Branch 0 (true)** → `Notify Webhook`
   - Connect `Check Risk Threshold` **Branch 1 (false)** → "Stop" node (ends workflow silently for low-risk items)
5. **Save**

**Verify IF condition (if IF node already exists):**
1. Double-click the IF node between Agent and Webhook
2. Check conditions panel:
   - Should have: `risk_level == "HIGH" AND confidence >= 0.7` (or similar)
   - If conditions are missing/blank: Configure as above
   - If conditions exist but are wrong (e.g., only checking risk_level): Update to match above

**Verify:**
- Debug panel: Mock data with `risk_level: "LOW"` should stop at IF (Branch 1)
- Debug panel: Mock data with `risk_level: "HIGH", confidence: 0.5` should stop at IF (confidence too low)
- Debug panel: Mock data with `risk_level: "HIGH", confidence: 0.8` should reach Notify Webhook

---

### W02 — Loop Closure Notification

#### ISSUE #1: Notify App Webhook uses GET (should be POST)

**What to check first:**
- [ ] Open workflow "Loop Closure Notification"
- [ ] Find node "Notify App Webhook" (should be near the end)
- [ ] Double-click to open settings

**Fix:**
1. Change **Method** dropdown from GET → **POST**
2. Verify URL is correct (should call `/api/n8n/webhook` or similar async path)
3. Verify **Headers:** has `Content-Type: application/json`
4. **Test** → confirm HTTP response shows `POST 200`
5. **Save**

---

#### ISSUE #2: Missing approval check before notification

**What to check first:**
- [ ] Look at the flow: `Supabase Webhook Trigger` → [other nodes] → `Notify App Webhook`
- [ ] Is there an **IF node** checking approval? If YES, skip to "Verify condition" below. If NO, continue.

**Fix (if no approval IF node):**
1. Navigate to the node immediately before `Notify App Webhook`
2. Right-click on canvas, add **IF** node → name it "Check Teacher Approved"
3. Configure condition:
   - **Field:** `{{ $json.approved_at }}`
   - **Operator:** "is not empty" or `!= null`
   - (This blocks notification if teacher hasn't approved)
4. **Connection routing:**
   - Take output of previous node → connect to IF input
   - IF Branch 0 (true = approved) → `Notify App Webhook`
   - IF Branch 1 (false = not approved) → "Stop" or dead-end node
5. **Save**

**Verify condition (if IF node already exists):**
1. Double-click the approval check IF node
2. Verify condition checks for `approved_at IS NOT NULL` or similar
3. If condition is blank or wrong: Update to match above

---

### W03 — Friday Student Reminder

#### ISSUE #1: Postgres nodes have empty/broken credentials (2 nodes)

**What to check first:**
- [ ] Open workflow "Friday Student Reminder"
- [ ] Look at the canvas: should see 2 Postgres-type nodes early in the flow
  - First one likely named "Get Classes Below 50%" or similar
  - Second one likely named "Insert Reminder Notifications" or similar
- [ ] Click on the **first** Postgres node

**Fix (First Postgres node):**
1. Double-click **first Postgres node** → settings panel opens
2. Look for **"Credentials"** dropdown (top of panel, usually shows account name or "Not set")
3. If shows "Not set" or empty:
   - Click the dropdown → select **"Postgres account"** (or "Supabase Postgres" if labeled that way)
   - If no accounts appear: **SKIP FOR NOW** — this means you need to configure Postgres credentials globally first (ask admin)
4. If shows a broken/red credential name:
   - Click dropdown → select a valid Postgres account from the list
5. **Test** the node → click **"Test"** button → should execute query and return results or error (not "credentials not found")
6. **Save**

**Fix (Second Postgres node):**
1. Repeat steps above for the **second Postgres node** in this workflow
2. Assign the same valid Postgres credential

**Verify:**
- Both nodes show a valid Postgres account in the **Credentials** field (no red/broken icon)
- Combined test: Execute entire workflow from trigger → both Postgres nodes should return data (not credential errors)

---

#### ISSUE #2: Notify Webhook credential is "unavailable"

**What to check first:**
- [ ] Find the **HTTP "Notify Webhook"** node (usually last node in this workflow)
- [ ] Double-click to check **Credentials** field
- [ ] Does it show "unavailable" or a red broken icon?

**Fix:**
1. If field shows "unavailable":
   - Click **Credentials** dropdown → select a valid credential
   - Common options: "API Key", "Bearer Token", or leave blank if webhook doesn't require auth
2. If the endpoint is internal (`http://localhost:3000/api/...`), you might not need credentials — just leave Auth blank
3. Verify **URL** matches your Next.js webhook endpoint
4. **Test** → HTTP should return 200 OK
5. **Save**

---

### W04 — Sunday Health Score

#### ISSUE #1: Postgres node has empty credentials

**What to check first:**
- [ ] Open workflow "Sunday Health Score"
- [ ] Find the **Postgres node** (should be early, labeled something like "Update Health Scores" or "Calculate Scores")
- [ ] Double-click to open settings

**Fix:**
1. Look at **Credentials** field
2. If empty or showing "Not set":
   - Click dropdown → select valid **Postgres account**
3. If showing broken credential:
   - Click dropdown → select a working Postgres account
4. **Test** → should execute or return error (not credential error)
5. **Save**

---

### W05 — Weekly Teacher Email Summary

#### ISSUE #1: SendGrid node has empty credentials

**What to check first:**
- [ ] Open workflow "Weekly Teacher Email Summary"
- [ ] Find the **SendGrid node** (should be midway through flow, labeled "Send Email via SendGrid" or similar)
- [ ] Double-click to open settings

**Fix:**
1. Look at **Credentials** field (should show "SendGrid account" or similar)
2. If empty or "Not set":
   - Click dropdown → select **"SendGrid account"** from list
   - If no accounts available: ASK ADMIN to configure SendGrid credentials globally
3. If showing broken credential icon:
   - Try to select a different SendGrid account, or wait for admin to fix
4. Verify **Email Parameters:**
   - `toEmail`: should be `{{ $json.email }}` or similar (loop variable)
   - `fromEmail`: should be configured (e.g., `noreply@climateschool.app`)
   - `subject`: should be populated (e.g., "Pending AI Recommendations")
5. **Test** → mock with sample email address → should show "email sent" (not credential error)
6. **Save**

---

#### ISSUE #2: Notify Webhook credential is "unavailable"

**What to check first:**
- [ ] Find the **HTTP "Notify Webhook"** node (usually last node)
- [ ] Double-click to check credentials

**Fix:**
1. If shows "unavailable":
   - Click **Credentials** dropdown → select valid auth method
   - If internal endpoint, may not need credentials — leave blank
2. Verify URL is correct
3. **Test** → should return 200 OK
4. **Save**

---

## 🔍 VERIFICATION CHECKLIST (After All Fixes)

Run this final validation:

### Global Checks
- [ ] All 5 workflows (W01–W05) open without errors
- [ ] No red error icons on any nodes (red = broken config)
- [ ] No yellow warning icons on credential fields

### Per-Workflow Execution Test
- [ ] **W01 (Agentic AI):** Click "Execute" → workflow runs; AI Agent node shows tool calls; Notify Webhook outputs POST request (check logs)
- [ ] **W02 (Loop Closure):** Click "Execute" → Postgres node executes; IF node appears in flow; approval check blocks if not approved
- [ ] **W03 (Friday Reminder):** Click "Execute" → both Postgres nodes execute without credential errors; Webhook sends POST
- [ ] **W04 (Health Score):** Click "Execute" → Postgres node executes; no credential errors
- [ ] **W05 (Teacher Email):** Click "Execute" → SendGrid node executes with valid API key; Webhook sends POST

### Credential Status Summary
- [ ] W03 Postgres #1: ✓ Valid account
- [ ] W03 Postgres #2: ✓ Valid account
- [ ] W03 Webhook: ✓ Credential or blank (if no auth needed)
- [ ] W04 Postgres: ✓ Valid account
- [ ] W05 SendGrid: ✓ Valid account
- [ ] W05 Webhook: ✓ Credential or blank

### HTTP Method Summary
- [ ] W01 Notify Webhook: POST ✓
- [ ] W02 Notify Webhook: POST ✓

### Threshold Gate Summary
- [ ] W01 has IF node: `risk_level == "HIGH" AND confidence >= 0.7` ✓
- [ ] W02 has IF node: `approved_at IS NOT NULL` ✓

---

## 📝 QUICK REFERENCE: Credential Types Needed

| Workflow | Node | Type | Where to Find |
|---|---|---|---|
| W03, W04, W05 | Postgres | Postgres/Supabase account | n8n Credentials menu (ask admin if missing) |
| W05 | SendGrid | SendGrid API account | n8n Credentials menu (ask admin if missing) |
| W01, W02, W05 | HTTP Webhooks | (optional) API key/Bearer token | Depends on endpoint; often leave blank |

**If admin hasn't set up these credentials globally:**
- Go to n8n Home → Credentials (top menu)
- Click "Add Credential"
- Choose type (Postgres, SendGrid, etc.)
- Fill in API key/connection string (ask admin for values)
- Test

---

## 🚨 TROUBLESHOOTING

### "Red X" on Postgres Node
**Cause:** Credentials not set or invalid  
**Fix:** Click node → scroll to Credentials field → select from dropdown

### "GET instead of POST" not changing
**Cause:** Dropdown not responding or UI glitch  
**Fix:** Refresh page (F5) → try again

### IF node input/output not connecting
**Cause:** Usually a click target issue  
**Fix:** 
1. Right-click on output circle of previous node → "Connection Mode"
2. Select "By Clicking" (easier for manual UI work)
3. Click output circle → click IF node input circle

### "Branch 0" / "Branch 1" confusion
**Explanation:**
- Branch 0 = condition is TRUE (proceed with notification/action)
- Branch 1 = condition is FALSE (stop/skip)

### Webhook test returns error
**Common:** `"Network Error: getaddrinfo ENOTFOUND"`  
**Cause:** URL is unreachable (localhost won't work from Docker)  
**Fix:** Use actual domain/IP; if internal, ask admin for correct endpoint

---

## 📋 EXECUTION ORDER (Recommended)

Do these in order to minimize back-and-forth:

1. **First:** Fix **all empty credentials** (W03×2, W04×1, W05×1 SendGrid) — verify with Test button
2. **Second:** Fix **all GET→POST** (W01, W02 Webhooks)
3. **Third:** Add/verify **threshold IF gates** (W01, W02)
4. **Last:** Run full Verification Checklist above

---

## 💾 SAVING & ACTIVATING

**After each fix:**
- Click **Save** (Ctrl+S or File menu)
- You'll see toast notification: "Workflow saved successfully"

**DO NOT click "Activate" yet** — wait until all P0 fixes are done and verified

**When ready to activate (after full verification):**
1. Click the **blue "Activate"** button (top-right)
2. Confirm: "Yes, activate this workflow"
3. Monitor for 5 minutes to ensure no runtime errors (check n8n logs if available)

---

**Done with P0!** You'll have a system that:
- ✅ Won't crash on credential errors
- ✅ Sends data to webhooks correctly (POST payloads)
- ✅ Filters notifications by risk level
- ✅ Checks approval before notifying

**Next steps (P1):** Hybrid Scoring, Human-in-the-Loop, k-Anonymity gates — but that's separate from this plan.
