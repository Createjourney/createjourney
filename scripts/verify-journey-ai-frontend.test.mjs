// Run: node --test scripts/verify-journey-ai-frontend.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const target = new URL('./verify-journey-ai-frontend.mjs', import.meta.url);
function probe(mock, url = 'https://example.test/') {
  const preload = 'data:text/javascript,' + encodeURIComponent(
    'globalThis.fetch = async (_url, options) => { ' +
    'if (options.redirect !== "manual") throw new Error("redirect policy missing"); ' +
    'return {status:' + mock.status + ',ok:' + mock.ok +
    ',url:' + JSON.stringify(mock.url) +
    ',headers:{get:()=> "text/html"},text:async()=> ' +
    JSON.stringify(mock.html ?? 'CJJourneyPartnerAsk isDeterministicCommand') + '}; };'
  );
  return spawnSync(process.execPath, ['--import', preload, target.pathname, url], { encoding: 'utf8' });
}
test('valid public marker response is accepted only as marker evidence', () => {
  const result = probe({status:200,ok:true,url:'https://example.test/'});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /PUBLIC_SOURCE_MARKERS_PRESENT/);
  assert.match(result.stdout, /Markers alone cannot prove/);
});
test('same-origin redirect is rejected without following', () => {
  const result = probe({status:302,ok:false,url:'https://example.test/'});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Redirect prohibited before following/);
});
test('cross-origin final URL is rejected', () => {
  const result = probe({status:200,ok:true,url:'https://evil.example/'});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Cross-origin redirect prohibited/);
});
test('missing frontend markers fails closed', () => {
  const result = probe({status:200,ok:true,url:'https://example.test/',html:'<html></html>'});
  assert.equal(result.status, 1);
  assert.match(result.stdout, /"result": "FAILED"/);
});
test('insecure targets are rejected before fetch', () => {
  const result = probe({status:200,ok:true,url:'https://example.test/'}, 'http://example.test/');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /HTTPS required/);
});

test('login endpoint response is not accepted as deployed app', () => {
  const result = probe({status:200,ok:true,url:'https://example.test/login'});
  assert.equal(result.status, 1);
  assert.match(result.stdout, /"frontend_not_login_redirect": false/);
  assert.match(result.stdout, /"result": "FAILED"/);
});
