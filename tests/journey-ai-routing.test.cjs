// Run with: node --test tests/journey-ai-routing.test.cjs
// Pure source-level regression: no browser, network, credentials or production writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'journey-ai-discovery.js'), 'utf8');
const match = source.match(/const readOnlyIntent\s*=\s*(\/.*?\/[a-z]*)\.test\(text\)/s);
assert.ok(match, 'read-only routing predicate must exist');
const predicate = vm.runInNewContext(match[1]);
const positive = [
  'Inspect the proposed changes before applying',
  'Explain the plan',
  'Compare the options',
  'Verify the current configuration',
  'Audit the workflow',
  'Investigate why the board failed',
  'Analyze the results',
  'Analyse these results',
  'What would change?',
  'Which actions are planned?',
  'Do not apply changes',
  "Don't make changes",
  'Show the pending proposal',
  'What does the Apply button do?'
];
const negative = [
  'Create an image of a SmartBoard',
  'Generate a social media image',
  'Book an appointment',
  'Publish the Journey'
];
for (const prompt of positive) test('read-only routing: '+prompt, () => assert.equal(predicate.test(prompt), true));
for (const prompt of negative) test('non-inspection routing: '+prompt, () => assert.equal(predicate.test(prompt), false));
test('partner handoff precedes legacy parser', () => {
  const handoff = source.indexOf('window.CJJourneyPartnerAsk(text, voiceReply)');
  const fallback = source.indexOf('return originalHandleAiPrompt(');
  assert.ok(handoff >= 0 && fallback > handoff);
});
test('partner handoff is conditional on registered handler', () => {
  assert.match(source, /readOnlyIntent\s*&&\s*typeof window\.CJJourneyPartnerAsk === 'function'/);
});
