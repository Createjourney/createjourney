# Milestone 1 — Complete Platform Inventory: evidence and acceptance report
**Audited on:** 2026-11-11  
**Repository pinned main SHA:** `7be8671cf94283f61eee7600062c050be96b84ff`  
**Development branch:** `feature/journey-ai-platform-intelligence-foundation-20261111`  
**Overall acceptance:** **NOT YET COMPLETE** — broad source and anonymous runtime discovery done; authenticated page/role/board testing remains unverified. Do not promote this to `VERIFIED_OPERATIONAL`.

## Completed evidence-based inspection
| Surface | Evidence | Result |
|---|---|---|
| GitHub tree | GitHub Git tree API, recursive, not truncated | 57 tracked files, 19 directories |
| Production source scanner | GitHub Actions Node tests and scanner | 9 current source files, 695 candidate markup controls; some JS-template duplicates possible |
| Anonymous browser / deployed HTML | Chromium and Playwright WebKit on local CI server and `https://app.gocreatejourney.com/` | HTTP 200 for homepage and no-token customer journey; 553 DOM controls on home (8 visible signed-out); 65 DOM candidate surfaces |
| Existing navigation layer | `assets/cj-journey-capabilities-v1.js` | 12 logical capabilities, `CJExactHome.routeHomeAction`, click-based context and incomplete success proof |
| Source application entry | `index.html` | 1.43 MB main application, existing legacy and modularized overlays |
| Live Supabase public schema | information_schema and pg_catalog | 49 tables, 517 columns, 70 foreign-key references, 31 public functions, 59 public RLS policies |
| Live Edge deployment sources | Individual Supabase get_edge_function calls | 25 ACTIVE deployed functions, retrieved source and static table/action references |
| Agent workforce | `cj_agent_registry`, job records | 607 total; 604 PLANNED; 3 TESTING; 1 FAILED job (#333), no recorded successes |
| Provider connection records | `connected_accounts` | 1 Google record with status `error`, no confirmed provider success |
| Protected gateway anonymous-denial audit | GitHub Actions requests WITHOUT credentials | 18/18 JWT-protected endpoints rejected anonymous requests (401/403); **does not prove tenant isolation** |
| Existing automated coverage | GitHub Playwright/Node tests and workflow files | Browser smoke tests, agent pilot, sales readiness, isolated harness and deployment preflight present |

## HIGH-PRIORITY confirmed defect — reproduced on actual hosted app
- `ReferenceError: esc is not defined` in **Chromium desktop** and **Playwright WebKit with iPhone-width viewport**.
- Stack: `index.html:7086`, `cj27SetBackendBadge`, called from `cjSyncNormalizedBackendV27` at line 7090 and around 7180.
- Reproduced on CI-served code and hosted `https://app.gocreatejourney.com/`.
- This is a verified JavaScript runtime exception, **not** proof that all application screens are broken. The affected backend badge/synchronization path must be investigated before a clean regression certification.
- This milestone does not silently change production code; file a tested fix in a separate controlled PR.

## Critical execution architecture gap
The `cj_publish_claimed_board_journey` SQL function currently resolves the earliest authorized workspace rather than an explicitly selected business/workspace. This is unsafe to reuse as an unconstrained multi-business AI action without target resolution changes and authorization tests. Do not infer a production exploit solely from this code-path finding.

## Discovered logical pages (source-level, not authenticated render verification)
- Business Command Center
- SmartBoard Management
- Journey Editor
- Business Analytics
- Marketing Center
- Creative Studio
- Connected Accounts
- Team & Access
- Business Profile
- Account & Workspace
- Explore
- Journey AI
- Additional Sales Command Center overlay and customer-facing Journey
All of the above are referenced by code; access, click behavior and visible navigation for an authenticated owner have not been proven.

## Evidence attachments / files
1. `repository-file-manifest-20261111.md`: exact path/size/blob-SHA list for the pinned source tree.
2. `supabase-schema-catalog-20261111.md`: all public columns, FKs, policies and public function signatures.
3. `live-edge-function-inventory-20261111.md`: 25 deployed function sources, action and table hints.
4. `audit-baseline-20261111.md`: architectural gaps and security/authorization discovery.
5. GitHub Actions workflow `platform-intelligence-audit.yml`: static source JSON; anonymous local/deployed browser JSON; anonymous protected gateway probe JSON. Artifacts are attached to successful PR CI runs and retained 14 days.

## Remaining acceptance gates (BLOCKING)
- [ ] Authenticated owner/manager employee/viewer page inventory and interaction behavior against non-production tenant.
- [ ] Reconcile every source candidate and 553 anonymous DOM controls with active, conditional, and role-restricted control behavior; classify buttons as working/partial/broken.
- [ ] Test every navigation destination's actual rendered screen and associated backend response using authorized sessions.
- [ ] Real iPhone Safari hardware test (Playwright WebKit desktop-emulated viewport is **not** hardware Safari).
- [ ] Verify a safely isolated customer-facing SmartBoard flow with a valid disposable public board token, without modifying a live customer board.
- [ ] Complete negative cross-tenant auth/RLS tests and end-to-end provider capability verification.
- [ ] Compare deployment provenance of all live Edge Function source hashes with repo representations (several deployed functions are not checked into `supabase/functions`).
- [ ] Resolve/record the `esc` runtime defect and re-run no-error browser regression.

## Signoff policy
Milestone 1 is **source- and anonymous-discovery substantial completion**, but remains **FAILED ACCEPTANCE / BLOCKED BY AUTHENTICATED TEST COVERAGE**. Never describe it as fully operational or fully verified. Do not advance to production mutations or broader autonomous execution on this evidence alone.
