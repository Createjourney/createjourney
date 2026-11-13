// Read-only live OAuth safety probe. No credentials, provider contact or account writes.
// Safe for CI: invalid callbacks and unauthenticated POSTs only.
import assert from 'node:assert/strict';
const base='https://pbiivpehdatvmyaxwixk.supabase.co/functions/v1/';
async function probe(path,init={}){
 const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(25000),...init});
 return {status:response.status,location:response.headers.get('location')};
}
for(const path of [
 'cj-shopify-integration?shop=not-myshopify.invalid&state=bogus&code=bogus',
 'cj-marketing-oauth/gmail?state=bogus&code=bogus',
 'cj-marketing-oauth/outlook?state=bogus&code=bogus',
 'cj-marketing-oauth/tiktok?state=bogus&code=bogus'
]){
 const r=await probe(path);
 assert.ok([400,403,503].includes(r.status),path+' must fail closed, got '+r.status);
 console.log('PASS callback rejects unauthenticated/unissued request:',path.split('?')[0],r.status);
}
for(const slug of ['cj-shopify-integration','cj-marketing-oauth']){
 const body=slug==='cj-marketing-oauth'?
  {action:'status',provider:'gmail',business_id:'00000000-0000-4000-8000-000000000001'}:
  {action:'status',business_id:'00000000-0000-4000-8000-000000000001'};
 const r=await probe(slug,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.ok([401,403].includes(r.status),slug+' must reject missing bearer token, got '+r.status);
 console.log('PASS unauthenticated POST denied:',slug,r.status);
}
for(const provider of ['google','meta']){
 const r=await probe('journey-integration-callback?provider='+provider+
  '&state=unissued-2026-11-12-callback-check&code=invalid');
 assert.ok([302,303].includes(r.status),'Existing '+provider+' callback must return error without exchange');
 const target=new URL(r.location);
 assert.equal(target.origin,'https://app.gocreatejourney.com');
 assert.equal(target.searchParams.get('integration'),provider);
 assert.equal(target.searchParams.get('result'),'error');
 console.log('PASS hardened legacy provider callback rejected:',provider);
}
console.log('PASS live endpoints deployed fail closed for invalid authorization. Live owner consent NOT tested.');
