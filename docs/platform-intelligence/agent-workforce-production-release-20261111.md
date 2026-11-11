# Journey AI Agent Workforce — Production Release Evidence (2026-11-11)

## Release outcome

**Production backend deployed; authenticated owner acceptance still outstanding.** Do not confuse HTTP gateway denial with an owner-signed-in end-to-end PASS.

| Item | Before | After | Evidence |
|---|---|---|---|
| Agent metadata SELECT grants | Five service-role metadata tables inaccessible | All five SELECT granted; no UPDATE or anon/authenticated SELECT | Supabase migration `agent_workforce_intelligence_service_select_grants_v1`; live privilege readback |
| `journey-ai-agent-intelligence` | Not deployed | ACTIVE **v1**, JWT verification enabled | Supabase list/get_edge_function |
| `journey-ai-chat` | ACTIVE v22 | ACTIVE **v23**, JWT verification enabled | Supabase list/get_edge_function; preserved exact v22 source in backup |
| Agent workforce read-only API | Not available | Endpoints deployed: `overview`, `roster`, `agent_detail`, `departments`, `tool_capabilities`, `business_evidence` | Deno CI and live gateway check |
| Chat handoff | Persona analysis only; three TESTING registered pilot agents analysis-only | Staged chat integration live in v23; explicit agent/workforce questions use read-only authenticated service | Source/diff/readback; **authenticated chat behavior not yet E2E-tested** |
| Anonymous/invalid JWT | Not verified for this new endpoint | Both new endpoint and updated chat return **HTTP 401** for no/invalid JWT in live GitHub Actions smoke | `scripts/agent-workforce-production-smoke.mjs` |
| GitHub traceability | Multiple stacked draft PRs #36–#38, production chat source drift | Standalone release PR #39 with just deployment sources and release tests | Pull request and GitHub Actions CI |

### Verified live access control

SQL readback on five metadata tables confirmed `service_role SELECT=true`, `service_role UPDATE=false`, `anon SELECT=false`, `authenticated SELECT=false`, RLS enabled. This protects direct Data API access; backend still checks user JWT and membership.

Supabase live agent registry checked: 607 registered agents, 604 PLANNED / 3 TESTING, no confirmed successful job; separate AI chat personas are not independently deployed agents. The live backend safely treats these as registry lifecycle, not proof of external execution.

### Authenticated owner verification gate: BLOCKED

This integration has **not** been tested with an actual signed-in owner bearer token in this tool environment. CI does not currently have `CJ_TEST_ACCESS_TOKEN` and `CJ_SUPABASE_ANON_KEY` configured, and its authenticated owner suite reports `BLOCKED_MISSING_AUTHENTICATED_TEST_CREDENTIALS` rather than PASS. Do not copy JWTs into GitHub issues or chat messages.

User-assisted safe test (no credentials shared):
1. Open `https://app.gocreatejourney.com/` and sign in as an Owner.
2. Ask Journey AI: **“How many registered agents are in our workforce, and how many are actually operational?”**
3. Ask Journey AI: **“What is the status and responsibility of Agent #333?”**
4. Ask Journey AI: **“Show me our marketing agents.”**
5. Report whether responses contain verified registry counts and a truthful distinction between PLANNED, TESTING and successful external execution. A screenshot of the visible answers is sufficient; **never share an access token**.

Once the user performs these tests, check Edge Function request logs for owner-authorized 200 responses; independently validate that no unexpected `cj_agent_jobs` were inserted by the information-only questions. For cross-business negative testing, use a legitimate isolated test account, not a forged identity or production SmartBoard.

### Outstanding unrelated project security advisory findings

These were present before the M3 rollout:
- Supabase security advisor flags two anonymous SECURITY DEFINER public board resolvers. They support public NFC flows and require careful negative authorization/public-token validation before modifying grants.
- 17 authenticated SECURITY DEFINER routines also require case-by-case review. Revoking blanket grants may break activation, onboarding or customer journeys.
- Leaked-password detection disabled (Auth product setting). See https://supabase.com/docs/guides/auth/password-security.
- RLS-enabled/no-policy findings include intentionally server-only metadata tables; do not add permissive client policies to silence a linter.

### Rollback

If owner-facing chats regress: redeploy `supabase/backups/journey-ai-chat-v22-deployed-20261111/index.ts` as `journey-ai-chat` with `verify_jwt=true`. This restores the exact previous deployed v22 including OpenAI retry. The M3 read-only service can be disabled independently. Do not drop existing tables, delete agent jobs, change SmartBoard destinations or revoke global service-role SELECT grants without impact review.

### Acceptance classification

- Source and read-only permissions: **RELEASED AND VERIFIED**.
- Both JWT gateways and denied negative token probes: **VERIFIED**.
- Authorized owner/manager business membership and chat replies: **IMPLEMENTED, NEEDS AUTHENTICATED E2E**.
- Cross-business owner isolation: **IMPLEMENTED, NEEDS AUTHENTICATED E2E**.
- 607-worker execution: **NOT ACTIVATED** (only three TESTING analysis pilots exist).
