// Isolated local Supabase E2E. Never point this harness at a remote/production URL.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const root=process.env.CJ_LOCAL_API_URL;
const anon=process.env.CJ_LOCAL_ANON_KEY;
const service=process.env.CJ_LOCAL_SERVICE_KEY;
if (!root || !anon || !service || !/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(root)) {
 throw Error('Refusing test: localhost Supabase URL, anon and service keys required');
}
const base=root.replace(/\/$/,'');
async function call(method,path,body,key=anon,token=key){
 const response=await fetch(base+path,{
  method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',
   Prefer:'return=representation'},
  body:body===undefined?undefined:JSON.stringify(body),
  signal:AbortSignal.timeout(25000)
 });
 const text=await response.text();
 let data;
 try{data=JSON.parse(text)}catch{data={raw:text.slice(0,300)}}
 return {status:response.status,data};
}
function expectSuccess(r,label){
 assert.ok(r.status>=200&&r.status<300,label+': HTTP '+r.status+' '+JSON.stringify(r.data).slice(0,400));
 return r.data;
}
async function user(role){
 const email='ci-'+role+'-'+randomUUID()+'@example.invalid';
 const password='Test-'+randomUUID()+'-!';
 const result=expectSuccess(await call('POST','/auth/v1/admin/users',{email,password,email_confirm:true},service),role+' create user');
 const id=result.id||result.user?.id;
 assert.ok(id,role+' user id');
 const signIn=expectSuccess(await call('POST','/auth/v1/token?grant_type=password',{email,password}),role+' sign in');
 assert.ok(signIn.access_token,role+' access token');
 return {id,token:signIn.access_token};
}
async function app(token,action,body={},business_id){
 return call('POST','/functions/v1/cj-sales-command-center',
  {action,...body,...(business_id?{business_id}:{})},anon,token);
}
async function waitForEdge(){
 for(let attempt=0;attempt<20;attempt++){
  try{
   const r=await app(anon,'overview');
   if(r.status===401||r.status===403||r.status===400)return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw Error('Local Edge Function did not become available');
}
await waitForEdge();
const owner=await user('owner');
const manager=await user('manager');
const outsider=await user('outsider');
const businessId=randomUUID();
const otherBusinessId=randomUUID();
expectSuccess(await call('POST','/rest/v1/businesses',[{id:businessId},{id:otherBusinessId}],service),'seed businesses');
expectSuccess(await call('POST','/rest/v1/business_members',[
 {business_id:businessId,user_id:owner.id,role:'owner',is_active:true},
 {business_id:businessId,user_id:manager.id,role:'manager',is_active:true}
],service),'seed memberships');
expectSuccess(await call('POST','/rest/v1/connected_accounts',{business_id:businessId,provider:'meta',status:'connected',capabilities:{claimed:'instagram_publish'}},service),'seed connection');

const ownerBusinesses=expectSuccess(await app(owner.token,'list_businesses'),'list authorized businesses');
assert.equal(ownerBusinesses.businesses.length,1,'Owner sees only their authorized business');
assert.equal(ownerBusinesses.businesses[0].id,businessId);
const outsiderBusinesses=expectSuccess(await app(outsider.token,'list_businesses'),'outsider empty business list');
assert.equal(outsiderBusinesses.businesses.length,0,'Unauthorized business metadata must not leak');
const denied=await app(outsider.token,'overview',{},businessId);
assert.equal(denied.status,403,'Non-member cannot view business');
const crossBusiness=await app(owner.token,'overview',{},otherBusinessId);
assert.equal(crossBusiness.status,403,'Cross-business request forbidden');
const missingSession=await app(anon,'overview',{},businessId);
assert.equal(missingSession.status,401,'Anonymous session denied');

// New external integration endpoints must not leak account status across tenants.
async function oauth(token,slug,action,business_id,provider){
 return call('POST','/functions/v1/'+slug,
  {action,business_id,...(provider?{provider}:{})},anon,token);
}
for(const [slug,provider] of [
 ['cj-shopify-integration',null],
 ['cj-marketing-oauth','gmail'],
 ['cj-marketing-oauth','tiktok'],
 ['cj-marketing-oauth','outlook']
]){
 const ownerStatus=expectSuccess(await oauth(owner.token,slug,'status',businessId,provider),
  slug+' authorized owner status');
 assert.equal(ownerStatus.status==='disconnected'||ownerStatus.connected===false,true,
  slug+' no verified active connection');
 const outsiderStatus=await oauth(outsider.token,slug,'status',businessId,provider);
 assert.equal(outsiderStatus.status,403,slug+' must reject nonmembers');
 const otherBusiness=await oauth(owner.token,slug,'status',otherBusinessId,provider);
 assert.equal(otherBusiness.status,403,slug+' must reject other tenant');
 const anonymousStatus=await oauth(anon,slug,'status',businessId,provider);
 assert.equal(anonymousStatus.status,401,slug+' must reject anonymous status requests');
}
const campaign={
 name:'CI Holiday Campaign',product_name:'Flourished Images Premium Frame',
 product_url:'https://example.com/products/frame',
 sale_price_cents:29900,regular_price_cents:34000,order_target:100,
 daily_ad_cap_cents:1000,daily_research_target:120,shipping_policy:'buyer_pays'
};
const invalid=await app(owner.token,'create',{campaign:{...campaign,delivery_guaranteed:true}},businessId);
assert.equal(invalid.status,400,'Unverified delivery guarantee must fail');
const created=expectSuccess(await app(owner.token,'create',{campaign}), 'create draft via owner');
assert.equal(created.campaign.status,'draft');
assert.equal(created.launch_authorized,false);
const id=created.campaign.id;
const updated=expectSuccess(await app(manager.token,'update',{campaign_id:id,campaign:{daily_ad_cap_cents:900}},businessId),'manager changes draft');
assert.equal(updated.campaign.daily_ad_cap_cents,900);
const managerApprove=await app(manager.token,'approve',{campaign_id:id},businessId);
assert.equal(managerApprove.status,403,'Manager cannot authorize campaign approval');
const approved=expectSuccess(await app(owner.token,'approve',{campaign_id:id},businessId),'owner approves planning');
assert.equal(approved.campaign.status,'approved');
assert.equal(approved.launch_authorized,false);
const badEdit=await app(owner.token,'update',{campaign_id:id,campaign:{order_target:110}},businessId);
assert.equal(badEdit.status,409,'Cannot edit approved campaign');
const overview=expectSuccess(await app(owner.token,'overview',{campaign_id:id},businessId),'readiness overview');
assert.equal(overview.readiness.status,'BLOCKED','Connected provider cannot unlock campaign');
assert.equal(overview.readiness.launch_authorized,false);
assert.ok(overview.readiness.blockers.includes('shopify_order_webhook_verified'));
assert.equal(overview.integrations.find(x=>x.provider==='meta').operational_verified,false);
assert.equal(overview.campaigns.find(c=>c.id===id).status,'approved');
const paused=expectSuccess(await app(owner.token,'pause',{campaign_id:id},businessId),'pause campaign');
assert.equal(paused.campaign.status,'paused');
assert.equal(paused.launch_authorized,false);
const pausedOverview=expectSuccess(await app(manager.token,'overview',{campaign_id:id},businessId),'manager reads paused campaign');
assert.equal(pausedOverview.campaigns.find(c=>c.id===id).status,'paused');
const managerGlobalPause=await app(manager.token,'pause_all',{},businessId);
assert.equal(managerGlobalPause.status,403,'Only owner may pause all campaigns');
const newCampaign=expectSuccess(await app(owner.token,'create',{campaign:{...campaign,name:'CI Pause Test'}},businessId),'create another draft');
const stopped=expectSuccess(await app(owner.token,'pause_all',{},businessId),'global pause');
assert.equal(stopped.paused_campaigns,1);
assert.equal(stopped.external_provider_actions_stopped,false,'Global pause cannot claim external ads stopped');
const auditRows=expectSuccess(await call('GET',
 '/rest/v1/cj_sales_campaign_events?select=event_type,detail&campaign_id=eq.'+newCampaign.campaign.id,
 undefined,service),'global pause event audit');
assert.equal(auditRows.filter(e=>e.event_type==='PAUSED'&&e.detail?.reason==='owner_global_pause').length,1,
 'Global pause must create exactly one permitted and identifiable PAUSED event');

const afterPause=expectSuccess(await app(owner.token,'overview',{},businessId),'read campaign status after global pause');
assert.equal(afterPause.campaigns.find(x=>x.id===newCampaign.campaign.id).status,'paused');
console.log('PASS: authenticated local E2E: tenant isolation, owner/manager permissions, drafts, updates, planning approvals, readiness, pause.');
