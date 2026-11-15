#!/usr/bin/env node
// Read-only production deployment evidence gate.
// Usage: node scripts/verify-journey-ai-frontend.mjs https://YOUR-LIVE-SITE/
// Does not authenticate, mutate records, or assert authenticated E2E success.
const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/verify-journey-ai-frontend.mjs https://LIVE-SITE/');
  process.exit(2);
}
let url;
try {
  url = new URL(target);
  if (url.protocol !== 'https:') throw new Error('HTTPS required');
  if (url.username || url.password) throw new Error('Credentials in URL prohibited');
} catch (error) {
  console.error('Invalid target:', error.message);
  process.exit(2);
}
const timeout = AbortSignal.timeout(12000);
try {
  const response = await fetch(url, { signal: timeout, redirect: 'follow', headers: { accept: 'text/html' }, cache: 'no-store' });
  const html = await response.text();
  const checks = {
    http_ok: response.ok,
    html_response: /text\/html/i.test(response.headers.get('content-type') || ''),
    journey_ai_bridge: html.includes('CJJourneyPartnerAsk'),
    deterministic_command_router: html.includes('isDeterministicCommand'),
    frontend_not_login_redirect: !/\/login\/?$/i.test(new URL(response.url).pathname),
  };
  const pass = Object.values(checks).every(Boolean);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requested_url: url.origin + url.pathname,
    final_url: response.url,
    status: response.status,
    checks,
    result: pass ? 'PUBLIC_SOURCE_MARKERS_PRESENT' : 'FAILED',
    limitation: 'Markers alone cannot prove the routing fix, exact deployed commit, authentication, permissions, agent execution, or E2E behavior.',
  }, null, 2));
  process.exitCode = pass ? 0 : 1;
} catch (error) {
  console.error(JSON.stringify({ result: 'FAILED', error: error.message }));
  process.exitCode = 1;
}
