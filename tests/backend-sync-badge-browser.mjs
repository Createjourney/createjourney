import {chromium,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:name==='webkit'?390:1350,height:840}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e?.message||e)));
  const http=await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(http?.status(),200,name+' app must load');
  await page.waitForTimeout(700);
  const result=await page.evaluate(()=>{
    if(typeof window.cj27SetBackendBadge!=='function')return {found:false};
    const probe='<img src=x onerror=alert(123)> & text';
    window.cj27SetBackendBadge(false,probe);
    const note=document.getElementById('cj27CloudNote');
    const label=note?.querySelector('span:last-child');
    return {found:true,text:label?.textContent,hasImage:!!note?.querySelector('img'),cssClass:note?.querySelector('span')?.className};
  });
  assert.equal(result.found,true,name+' function exists in hosted page');
  assert.equal(result.text,'<img src=x onerror=alert(123)> & text');
  assert.equal(result.hasImage,false,'must not render injected markup');
  assert.equal(result.cssClass,'cj27-cloud-dot bad');
  assert.ok(!errors.some(e=>/esc is not defined|Can.t find variable: esc/i.test(e)),name+' showed existing escape runtime error');
  console.log(JSON.stringify({browser:name,http:200,backend_badge:'PASS',escape_error:false,other_page_errors:errors.length}));
  await page.close();
 }finally{await browser.close()}
}
