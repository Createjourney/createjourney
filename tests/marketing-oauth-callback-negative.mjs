// Isolated negative OAuth callback tests. Never use provider live secrets or accounts.
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';

const origin=(process.env.CJ_LOCAL_API_URL||'').replace(/\/$/,'');
const sharedSecret='ci-shopify-test-secret-2026';
if(!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(origin))
 throw Error('Refusing OAuth callback tests outside localhost');
async function get(path){
 let last={status:0,result:{},location:null};
 for(let attempt=0;attempt<25;attempt++){
  try{
   const r=await fetch(origin+'/functions/v1/'+path,{redirect:'manual'});
   let result={};
   try {result=await r.json()}catch{}
   last={status:r.status,result,location:r.headers.get('location')};
   if(r.status!==502&&r.status!==503)return last;
  }catch(e){last={status:0,result:{error:String(e)},location:null}}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw Error('OAuth callback worker startup timed out: '+JSON.stringify(last));
}
const sign=(params)=>{
 const pairs=[...params.entries()].sort(([a],[b])=>a.localeCompare(b));
 return createHmac('sha256',sharedSecret).update(pairs.map(([k,v])=>k+'='+v).join('&')).digest('hex');
};
const shop='ci-example.myshopify.com';
const signed=({timestamp=Math.floor(Date.now()/1000),state='not-a-real-oauth-state',code='ci-nonlive-code'}={})=>{
 const q=new URLSearchParams({shop,state,code,timestamp:String(timestamp)});
 q.set('hmac',sign(q));
 return 'cj-shopify-integration?'+q.toString();
};
// Well-formed validly signed callbacks without a persisted one-use state must be rejected.
const forged=await get(signed());
assert.equal(forged.status,403,'signed Shopify callback without matching state must be rejected');
assert.match(JSON.stringify(forged.result),/state/i);
// Incorrect HMAC cannot authorize even when the timestamp is recent.
const forgedHmac=new URLSearchParams(signed().split('?')[1]);forgedHmac.set('hmac','0'.repeat(64));
const badSig=await get('cj-shopify-integration?'+forgedHmac);
assert.equal(badSig.status,403,'tampered Shopify HMAC must be rejected');
// Expired Shopify timestamp cannot be replayed.
const stale=await get(signed({timestamp:Math.floor(Date.now()/1000)-7200}));
assert.equal(stale.status,403,'stale signed Shopify callback must be rejected');
for(const provider of ['gmail','tiktok','outlook']){
 const callback=await get('cj-marketing-oauth/'+provider+
  '?state='+encodeURIComponent('00000000-0000-4000-8000-000000000000.11111111-1111-4111-8111-111111111111')+
  '&code=ci-not-valid');
 assert.equal(callback.status,403,provider+' callback without one-time state must be denied');
 const missing=await get('cj-marketing-oauth/'+provider+'?code=ci-not-valid');
 assert.equal(missing.status,400,provider+' callback without OAuth state must be invalid');
}
console.log('PASS: Shopify HMAC/timestamp/state and Gmail/TikTok/Outlook callback state reject tampering and unissued callbacks.');
