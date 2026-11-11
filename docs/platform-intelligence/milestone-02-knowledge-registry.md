# Journey AI — Platform Knowledge Registry M2

**Status: development implementation and isolated CI validation PASSED. NOT DEPLOYED TO PRODUCTION.**

## Tested initial graph (read-only source and anonymous DOM evidence)
- **12** logical pages.
- **695** source candidate interactive controls.
- **553** anonymous DOM controls from Chromium; **65** candidate surfaces.
- **1,038** graph nodes, **201** source/DOM relationship edges, including **181** anonymous DOM-to-page matches.
- **25** deployed Edge Function inventory entries and **31** public SQL function signatures available as source-audited metadata.
- All entries remain **IMPLEMENTED_UNVERIFIED**; no automated browser or code discovery can award `VERIFIED_OPERATIONAL`.
- Latest tested CI run: https://github.com/Createjourney/createjourney/actions/runs/43011509778 (**4 jobs passed**: deterministic knowledge, edge types, disposable PostgreSQL migration, anonymous DOM graph).



This is the additive knowledge foundation for future page-aware guidance and software execution. It does not activate mutations or grant any agent new privileges.

## Database model

| Object | Purpose | Key |
|---|---|---|
| `cj_platform_knowledge_versions` | Immutable source fingerprint, environment, staging/release decision and evidence | `id`, unique environment/commit/artifact |
| `cj_platform_knowledge_nodes` | Page, feature, interaction, workflow, integration, agent capability, backend operation, permission | `(version_id,node_key)` |
| `cj_platform_knowledge_edges` | Supported-by, invokes, contains, navigation, dependency, permission relationships | `(version_id,from_node_key,to_node_key,relation_type)` |
| `cj_platform_knowledge_verifications` | Append-only per-node verification evidence receipts | `id` with node/version foreign key |

Versions preserve historical graph snapshots. Nodes and edges are version-scoped. New snapshots never overwrite previous versions.

## Verification semantics

- **STAGED:** Source-extracted, deliberately `IMPLEMENTED_UNVERIFIED`, not suitable for production capability claims.
- **VERIFIED:** Permitted only with ingestion timestamp, verification timestamp and referenced release verification evidence; it is an administrative release decision, not implied by a passing syntax check.
- **REJECTED / RETIRED:** Historical state preserved. Read API never serves these as production truth.
- A node can claim `VERIFIED_OPERATIONAL` only if its verification status is `PASSED`, verified timestamp is present, and an evidence `test_run_id` is recorded.
- Client-facing read API selects only `environment='production'` and `state='VERIFIED'`. **If no verified version exists, it returns 503 `knowledge_not_verified` instead of fabricating information.**
- All database objects have RLS enabled and revoke direct `anon`/`authenticated` table access. Server-only import/read access is granted through `service_role`. An authenticated customer of one business cannot use this to read another business's records because the graph contains global technical metadata, not tenant records. The read endpoint checks business membership using trusted JWT user identity.

## Inputs

1. `scripts/platform-intelligence-inventory.mjs` (from milestone-1 branch): static source candidates, not runtime proof.
2. `assets/cj-journey-capabilities-v1.js`: explicit logical page catalog and existing navigation route mapping.
3. `docs/platform-intelligence/live-edge-function-inventory-20261111.md` and `supabase-schema-catalog-20261111.md`: previously audited backend inventory.
4. Optional CI-generated anonymous DOM report from `scripts/platform-intelligence-browser-inventory.mjs`, including source-to-page evidence and ancestor element IDs.

Nodes keep evidence provenance but retain unverified status. Authenticated/browser-only controls and behavior MUST be reconciled in later test gates.

## Staged snapshot procedure

Build a snapshot from a pinned checkout SHA:

```bash
node scripts/platform-knowledge-build.mjs . "$(git rev-parse HEAD)"
```

Its output contains stable keys, node kinds, page/interaction relationships, source paths, source lines, capability status, and a SHA256 checksum.

Import is **disabled by default** and intentionally not part of PR CI. After an approved database migration, an operator can explicitly stage a checked and reviewed JSON artifact using the staging-only importer with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` provided through a trusted secret manager and `CJ_PLATFORM_KNOWLEDGE_IMPORT=STAGING_ONLY_APPROVED`. Never commit these credentials; never use the browser. The importer refuses production-state snapshots and cannot promote a version.

## Read-only API

New Edge Function source: `journey-ai-platform-knowledge` (JWT gateway must be enabled on deployment).

- `catalog`: list page/feature metadata or a chosen node kind; capped response.
- `lookup`: retrieve a single node using a stable node key.
- `relationships`: retrieve direct graph edges for a node.
- Denies unauthenticated and nonmember requests; does not accept tenant/user claims from an AI prompt without verification.
- No write endpoints, no service-role credentials in browser, no secrets in returned nodes, and no migration/promotion endpoint.

**Do not integrate with Journey AI chat yet** without the context-aware access/permission work in the next milestones.

## Testing and acceptance

Automated validation exists in `.github/workflows/platform-knowledge-m2.yml`:
- Deterministic snapshot and SHA verification.
- Source-only artifacts never marked operational.
- Import guard rejects missing approval.
- Deno Edge Function type-check.
- Actual PostgreSQL 16 migration on disposable database; checks RLS, grant denial, required verification evidence, and relationships.
- Anonymous Chromium/WebKit DOM correlation; **not** an authenticated or real-device Safari test.

**Final production acceptance requires** milestone-1's authenticated owner/role navigation gate, an approved migration rollout, staging-import readback on isolated resources, verified production-version publication controls, cross-business authorization tests, and a deployed endpoint smoke test. These are not represented as completed in the source branch.

## Explicit release and rollback

1. Preserve current production schema and Edge Function source backups.
2. Merge approved prerequisite and M2 PRs after CI/security review.
3. Apply additive migration in controlled environment; independently confirm table RLS/grants.
4. Import a staging snapshot with an isolated execution identity; validate readback exact node and edge counts.
5. Release promotion to production version must occur only after independent runtime and source/deployment matching tests. In particular, **do not promote the entire graph because the parser found source controls**.
6. Deploy read-only Edge Function with `verify_jwt=true`; test 401/403/503 and permitted read behavior.
7. Roll back by disabling/removing the new Edge Function route or the registry read feature, not by dropping historical tables or altering existing board data. Retain migration and history for forensic inspection.
