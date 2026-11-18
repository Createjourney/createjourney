import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
const page = readFileSync(new URL("../customer-journey.html", import.meta.url), "utf8");
const script = page.match(/<script>([\\s\\S]*?)<\\/script>/)?.[1];
test("customer Journey page script parses", () => {
  assert.ok(script, "inline script exists");
  assert.doesNotThrow(() => new Script(script));
});
test("customer Journey opens selected destination only on explicit tap", () => {
  assert.match(page, /open\.href=step\.url/);
  assert.match(page, /open\.target="_blank"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.doesNotMatch(page, /location\.assign\(a\.url\)/);
});
test("customer Journey preserves published order and never claims provider completion", () => {
  assert.match(page, /board\.actions\.map\(type=>/);
  assert.match(page, /Continue to next step/);
  assert.doesNotMatch(page, /Payment successful|Review posted|Booking confirmed/);
});
