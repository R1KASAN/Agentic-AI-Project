# Phase C.1 Ollama Live Verification

## Scope

This note captures the dev verification path for Phase C after moving the redaction workflow to Ollama and hardening snippet quality guards.

## Teacher-Auth Verification Path

Preferred path: use the seeded demo credential after provisioning demo auth accounts through Supabase Admin:

- Teacher email: `teacher@demo.com`
- Teacher user id: `00000000-0000-0000-0000-000000000001`
- Owned classes:
  - `10000000-0000-0000-0000-000000000001`
  - `ed977559-a16e-468f-8628-137a5b2d9d9e`
  - `994e8327-f00f-4117-af75-5a838d5c48d9`

Primary verification method:

1. Sign in with `teacher@demo.com / password123`.
2. Confirm redirect to `/teacher`.
3. Open the teacher page you want to verify.

Fallback verification method:

1. Generate a magic link with Supabase admin API for `teacher@demo.com`.
2. Open the returned `action_link` in a browser.
3. The login page now detects `#access_token` / `#refresh_token`, calls `supabase.auth.setSession(...)`, and establishes a teacher session.
4. After the session is set, navigate to the teacher page you want to verify.

Why the fallback still exists:

- Service-role RPC calls are intentionally rejected by `get_class_redacted_voice(...)`, so teacher-auth verification must use a real teacher session.
- The magic-link path remains useful as a dev-only recovery option if password auth is temporarily unavailable.

## Successful Live Executions

Main workflow: `phase-c-redaction-batch`

- Execution `583`
  - First successful Ollama live run for class A on March 24, 2026
- Execution `596`
  - Guardrails hardened, but outputs were rejected as `unsafe_output`
- Execution `602`
  - Successful rerun after prompt + parser hardening
  - `llm_provider = "ollama"`
  - `llm_model = "qwen2.5:3b"`
  - Class A wrote `1` approved snippet
  - Class `994e8327-f00f-4117-af75-5a838d5c48d9` wrote `1` approved snippet

Representative audit payload from execution `602`:

```json
{
  "pipeline": "phase_c_redacted_voice",
  "status": "written",
  "batch_size": 3,
  "snippets_written": 1,
  "approval_mode": "auto_approved_dev",
  "llm_provider": "ollama",
  "llm_model": "qwen2.5:3b",
  "llm_output_rejected": false,
  "fallback_used": false,
  "summary_text": "สร้างเสียงนักเรียนแบบลบข้อมูลจากหลายคนสำหรับช่วงล่าสุดแล้ว"
}
```

## Current Dev Class-State Matrix

- `10000000-0000-0000-0000-000000000001`
  - Teacher RPC returns approved teacher-safe rows
  - UI is `ready`
  - Current teacher-visible snippets are privacy-safe aggregate paraphrases
- `ed977559-a16e-468f-8628-137a5b2d9d9e`
  - Teacher RPC returns `[]`
  - UI stays non-ready / `insufficient_signal`
- `994e8327-f00f-4117-af75-5a838d5c48d9`
  - Teacher RPC now returns `1` approved teacher-safe row
  - UI is `ready`
  - Earlier low-quality rows were removed from the teacher-safe path

## Quality Guardrails

Current workflow protections in `phase-c-redaction-batch`:

- Prompt requires a JSON object with `snippets` and `reason`
- Prompt includes a positive Thai example and an explicitly bad generic example
- Parser accepts an array root only as a fallback normalization step, then still applies the same safety checks
- Parser rejects:
  - verbatim or quote-like outputs
  - over-specific identifiers
  - generic low-information snippets
  - near-duplicate snippets
  - single-student framing such as `คนหนึ่ง`, `หนึ่งคน`, `คนเดียว`, `รายเดียว`

## Dev Data Cleanup

Old dev snippets that were either:

- too generic, or
- framed like a single student voice

were moved out of the teacher-safe path by setting `approval_status = 'rejected'`.

This keeps `get_class_redacted_voice(...)` aligned with the current privacy and quality rules without changing the external contract.

## Known Limits

- `qwen2.5:3b` still benefits from strong prompting and parser-side quality filters.
- The model can drift toward generic summaries if the raw batch is short or simple.
- The current dev pipeline is safe and functional, but richer snippet quality would likely improve with a stronger local model or a more structured rationale schema upstream.
