/* Journey AI application capability registry — foundation only.
   Actions stay permission-gated; this module does not grant backend access. */
(function(){
"use strict";
if(window.CJJourneyCapabilities)return;
const capabilities=[
["home","Business Command Center","dashboardApp"],
["smartboards","SmartBoard Management","boardLibraryApp"],
["journeys","Journey Editor","journeyLibraryApp"],
["analytics","Business Analytics","aiWorkspaceIntelligencePanel"],
["marketing","Marketing Center","aiWorkspaceMarketingPanel"],
["creative","Creative Studio","aiWorkspaceLibraryPanel"],
["integrations","Connected Accounts","connectedAccountsApp"],
["team","Team & Access","teamManagerApp"],
["business","Business Profile","journeyAiSetupApp"],
["account","Account & Workspace","accountPanel"],
["explore","Explore",null],
["assistant","Journey AI","journeyAiPanel"]
].map(function(v){return Object.freeze({id:v[0],name:v[1],elementId:v[2]})});
let last={page:"home",action:"",timestamp:Date.now()};
document.addEventListener("click",function(e){
const b=e.target.closest&&e.target.closest("button,[role=button]");
if(!b)return;
const name=b.getAttribute("data-cjx-home-action")||b.getAttribute("data-cjh-nav")||b.getAttribute("data-ai-workspace-tab")||b.id||"button";
last={page:name,action:b.id||name,timestamp:Date.now()};
window.dispatchEvent(new CustomEvent("cj:journey-context",{detail:last}));
},true);
window.CJJourneyCapabilities=Object.freeze({
version:"1.1",catalog:Object.freeze(capabilities),
context:function(){return Object.assign({},last)},
lookup:function(id){return capabilities.find(function(x){return x.id===id})||null},
inventory:function(){
 return Array.from(document.querySelectorAll("button,[role=button]")).filter(function(el){
  return !!(el.getClientRects().length&&!el.disabled);
 }).map(function(el){
  return {id:el.id||null,label:(el.getAttribute("aria-label")||el.innerText||"").trim().slice(0,110),
   feature:el.getAttribute("data-cjx-home-action")||el.getAttribute("data-cjh-nav")||null};
 }).filter(function(x){return !!x.label}).slice(0,600);
},
open:function(feature){
 const c=capabilities.find(function(x){return x.id===feature});
 if(!c)return {ok:false,reason:"Unknown capability"};
 const routes={smartboards:"boards",journeys:"boards",analytics:"analytics",marketing:"marketing",
 creative:"images",integrations:"accounts",team:"team",business:"business",account:"account"};
 const route=routes[feature];
 try{
  if(route&&window.CJExactHome&&typeof window.CJExactHome.routeHomeAction==="function"){
   const ok=window.CJExactHome.routeHomeAction(route);
   if(ok)return {ok:true,mode:"existing_page_navigation",feature};
  }
 }catch(e){return {ok:false,reason:String(e.message||e)}}
 return {ok:false,reason:"No verified navigation handler",feature};
},
fetchAuthorizedContext:async function(workspaceId){
 if(!workspaceId||typeof sb==="undefined"||!sb||typeof SUPABASE_URL==="undefined")return {ok:false,reason:"Authenticated workspace context unavailable"};
 try{
  const session=(await sb.auth.getSession()).data.session;
  if(!session)return {ok:false,reason:"Sign in required"};
  const response=await fetch(SUPABASE_URL+"/functions/v1/journey-ai-capabilities",{
   method:"POST",headers:{"Authorization":"Bearer "+session.access_token,
    "apikey":SUPABASE_PUBLISHABLE_KEY,
    "Content-Type":"application/json"},
   body:JSON.stringify({action:"workspace_context",workspace_id:workspaceId})
  });
  const payload=await response.json();
  return response.ok?{ok:true,data:payload}:{ok:false,reason:payload.error||"Context request failed",status:response.status};
 }catch(err){return {ok:false,reason:String(err.message||err)}}
},
execute:function(){return {ok:false,reason:"Mutating operations require a server-side authenticated action registry, scoped authorization and result verification."}}
});
})();