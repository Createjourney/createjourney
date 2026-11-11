import { chromium, webkit } from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const origin=process.env.CJ_AUDIT_BASE_URL||'http://127.0.0.1:8765';
const outdir=resolve(process.env.CJ_AUDIT_OUT_DIR||'artifacts/platform-intelligence');
mkdirSync(outdir,{recursive:true});
const browsers=[['chromium-desktop',chromium,{viewport:{width:1365,height:850}}],['webkit-iphone-width',webkit,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}]];
const targets=['/','/customer-journey.html'];
const report={schema_version:1,generated_at:new Date().toISOString(),repository_revision:process.env.GITHUB_SHA||null,method:'anonymous_browser_read_only',status:'IMPLEMENTED_UNVERIFIED',results:[]};
for(const [name,engine,device] of browsers){
 const browser=await engine.launch({headless:true});
 try{
  const context=await browser.newContext(device);
  for(const path of targets){
   const page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message).slice(0,300)));
   let result={browser:name,path,status:'UNKNOWN',controls:[],errors};
   try{
    const nav=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(1200);
    const snapshot=await page.evaluate(()=>{
      const all=[...document.querySelectorAll('button,a[href],input,select,textarea,summary,[role="button"],[role="tab"],[role="switch"],[role="checkbox"]')];
      return {
        title:document.title,
        app_context:typeof window.CJJourneyCapabilities?.context==='function'?window.CJJourneyCapabilities.context():null,
        advertised_capabilities:Array.isArray(window.CJJourneyCapabilities?.catalog)?window.CJJourneyCapabilities.catalog:null,
        runtime:{capability_registry:!!window.CJJourneyCapabilities,home_router:typeof window.CJExactHome?.routeHomeAction==='function',sales_center:typeof window.CJSalesCommandCenter?.open==='function'},
        controls:all.map((el,i)=>{
          const visible=!!(el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
          const attrs={id:el.id||null,tag:el.tagName.toLowerCase(),role:el.getAttribute('role')||null,
            label:String(el.getAttribute('aria-label')||el.innerText||el.getAttribute('title')||'').replace(/\s+/g,' ').trim().slice(0,120),
            action:el.getAttribute('data-cjx-home-action')||el.getAttribute('data-cjh-nav')||el.getAttribute('data-cjs-launch')||null,
            type:el.getAttribute('type')||null,
            destination:(()=>{const h=el.getAttribute('href');if(!h)return null;try{const u=new URL(h,location.origin);return u.origin===location.origin?u.pathname:u.origin+u.pathname}catch{return null}})(),
            disabled:!!el.disabled,
            visible,
            index:i};
          return attrs;
        })
      };
    });
    result={...result,status:nav?.status()||0,...snapshot,errors};
   }catch(e){result.errors.push(String(e.message||e).slice(0,400))}
   report.results.push(result);
   await page.close();
  }
  await context.close();
 }finally{await browser.close()}
}
writeFileSync(join(outdir,'anonymous-browser-inventory.json'),JSON.stringify(report,null,2)+'\n');
for(const r of report.results){
 const displayed=r.controls.filter(x=>x.visible);
 console.log(JSON.stringify({browser:r.browser,path:r.path,http_status:r.status,detected:r.controls.length,visible:displayed.length,errors:r.errors.length,runtime:r.runtime}));
}
console.log('Evidence classification: IMPLEMENTED_UNVERIFIED; authenticated controls and real-device Safari not verified');
