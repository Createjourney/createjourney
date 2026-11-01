# CreateJourney — Next Infrastructure Milestone
Status: APPROVED FOR IMPLEMENTATION (2026-10-31)
Priority: NEXT — deliver alongside Journey AI Autonomous Software Execution.

## Two linked workstreams
A. Autonomous Software Execution: server-side authenticated action registry; explicit capability and permission checks; least privilege; business/workspace scoping; idempotency; audit trails; confirmation for consequential changes; deterministic outcome verification; rollback/recovery; agent handoff and executive review. Prefer API/database operations to browser clicking. Never treat owning a board QR as edit authority.

B. Journey AI Performance Optimization: architect for fast initial acknowledgment and fast verified completion WITHOUT reducing software capability, accuracy, evidence quality, safety/authorization controls, model intelligence, or agent depth when needed.

## Performance architecture
1. Instrument latency: user input -> first response, first useful answer, tool invocation, data retrieval, agent queue, full result. Include p50/p95, request type, error rate, verified task completion, cost.
2. Intent and complexity router: direct read-only database queries for metrics; route specialized/complex requests through agents; never eliminate required review/permissions.
3. Context retrieval: concise, relevant, tenant-scoped business/profile/page/board context; source/version provenance and freshness; no cross-tenant leakage.
4. Streaming: send a timely acknowledgment and useful partial output; label provisional versus verified facts.
5. Parallelism: run independent, authorized specialist reads/analyses concurrently; respect dependencies and cost ceilings.
6. Intelligent cache: strictly scoped by user/workspace/permissions and data version, TTL and invalidation; never cache sensitive authorization decisions or present stale data as live.
7. Background jobs: durable queue; resumable progress, deadlines, retries, deduplication; user-visible progress and final verification. Do not promise completion before execution.
8. Supabase/API efficiency: indexed and scoped queries, reduced round trips, batched reads, connection reuse where supported; benchmark improvements.
9. Adaptive response packaging: concise early answer + optional deeper analysis; retain full detailed work/evidence when requested.
10. Observability and rollout: feature flag; shadow/benchmark against baseline; canary; rollback; regression tests across signup, SmartBoards, Journeys, Dashboard, billing, agents, and permissions.

## Targets (provisional, must benchmark first)
- Simple UI/context and cached safe reads: aim for first useful answer within ~1 sec where feasible.
- Live KPI reads: aim for ~1–2 sec where feasible.
- Standard business advice: aim for ~2–4 sec initial useful answer.
- Deep multi-agent jobs: immediate job acknowledgment and progress, then verified full output.
- Optimize p95 as well as median. Targets are not promises.

## Completion gate
Do not mark implemented until endpoints, agent routing, and frontend are wired to production; independent functional tests pass; latency before/after is measured; no material regression in answer correctness, agent task success, authorization, business data, reliability, or features. Communicate unverified claims as unverified.

## Build order
1. Baseline/trace instrumentation and request taxonomy.
2. Authenticated action registry + permission-gated agent tool execution foundation.
3. Fast-path read-only queries and tenant-scoped context retrieval.
4. Streamed UI / progressive responses and durable background jobs.
5. Parallel specialist orchestration, caching and connection optimization.
6. Benchmark, automated QA, canary launch, rollback readiness, production verification.
