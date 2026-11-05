# Journey AI repair — verified checkpoint (2026-11-05)

## Live-state inventory
- GitHub: Createjourney/createjourney, default branch main, inspected at commit 9ca79ab0bbfe8fd4fe2d8d30ea13dff5c07c6e3b.
- Supabase production project pbiivpehdatvmyaxwixk: ACTIVE_HEALTHY at inspection; 46 public-schema tables (read-only count).
- Supabase journey-ai-chat Edge Function: ACTIVE, version 22; journey-ai-actions ACTIVE, version 8. Active status alone does not prove correct orchestration.
- PR #1 changed index.html and journey-ai-discovery.js. Current main and fix/journey-ai-inspection-routing have identical journey-ai-discovery.js blob SHA 2a0f68d7c573f47b71c9efe7894485e1291ad5dd. The branch is nevertheless diverged (2 ahead / 80 behind), so do not blindly merge it.
- fix/journey-ai-routing-hardening-v2 is also diverged (4 ahead / 79 behind); contains a routing regression test and CI workflow. Inspect and selectively port tests to a fresh branch rather than merge stale index.html changes.

## Milestone gates
1. **PR #1 frontend instruction routing** — PARTIAL. Source parity for discovery JS confirmed; PR state, index routing parity, deployed artifact, and browser behavior still unverified. No production deploy claimed.
2. **Registered agents wired to chat** — NOT VERIFIED. Inspect registered-agent schema and deployed chat function implementation before modification.
3. **Permission-governed autonomous execution** — NOT VERIFIED. Require explicit scoped authority, action allowlist, risk tier, and audit trail before enabling mutations.
4. **Receipts and evidence verification** — NOT VERIFIED. Require immutable action receipt with actor, approval, inputs, timestamps, provider result and independent read-back.
5. **Regression and E2E** — NOT VERIFIED. Run tests on a non-production environment first; prove frontend routing, authorized/unauthorized calls, idempotency, failure handling and production smoke tests.

## Next safe action
Review PR #1 state and index.html routing, examine tests/journey-ai-routing.test.mjs from the hardening branch, inspect Supabase agent registration and chat routing with read-only queries, then create a narrowly scoped test-backed patch. Preserve production data. No milestone marked complete without deployment and runtime evidence.
