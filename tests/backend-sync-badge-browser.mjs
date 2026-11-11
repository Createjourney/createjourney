import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

// The badge is defined inside a legacy script closure, not as a global function.
// Assert the real startup path renders it, rather than invoking window.cj27SetBackendBadge.
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1350,height:840}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
 const http=await page.goto(process.env.CJ_TEST_BASE_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(http?.status(),200,'Application must load');
 await page.waitForTimeout(1200);
 const result=await page.evaluate(()=>{
  const note=document.getElementById('cj27CloudNote');
  return {found:!!note,childCount:note?.children.length||0,
   text:note?.textContent||'',hasImage:!!note?.querySelector('img'),
   dotClass:note?.querySelector('span')?.className||''};
 });
 assert.ok(result.found,'Real startup flow must render the backend sync badge');
 assert.equal(result.childCount,2,'Badge must have status dot and safe text label');
 assert.ok(result.text.trim().length>0,'Badge label must be populated');
 assert.equal(result.hasImage,false,'No injected markup');
 assert.match(result.dotClass,/cj27-cloud-dot/);
 assert.ok(!errors.some(e=>/esc is not defined|Can.t find variable: esc/i.test(e)),
  'Existing undefined esc error must not recur');
 console.log(JSON.stringify({browser:'chromium',http:200,backend_badge:'PASS',
  escape_error:false,other_page_errors:errors.length}));
 await page.close();
}finally{await browser.close()}
