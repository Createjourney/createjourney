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

/* CJ SmartBoard card repair: dedicated owner editor, not the home navigation route. */
(function(){
"use strict";
const TYPES=[["pay","Payment / tips"],["review","Google Review"],["book","Booking"]];
let selected=null;
const h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function boardList(){try{return typeof visibleBoards==="function"?visibleBoards():[]}catch(_){return []}}
function chosenCard(target){
 const cards=[...document.querySelectorAll("#cjScreenshotHome .cjx-board")];
 const i=cards.indexOf(target);
 return i>=0?boardList()[i]||null:null;
}
function ensurePage(){
 let root=document.getElementById("cjSmartBoardOwnerPage");
 if(root)return root;
 root=document.createElement("section");root.id="cjSmartBoardOwnerPage";
 root.style.cssText="position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#f4f7fb;color:#172438;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:22px 16px 90px";
 root.innerHTML='<main style="max-width:700px;margin:auto"><button type="button" id="cjOwnerBack" style="border:0;background:none;padding:10px 0;color:#175fc0;font-size:15px;cursor:pointer">← Back to Command Center</button><div style="background:white;border-radius:20px;padding:25px;box-shadow:0 12px 35px #102b4c12"><div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#3175bf">SMARTBOARD MANAGEMENT</div><h1 id="cjOwnerTitle" style="font-size:27px;margin:9px 0 5px"></h1><p id="cjOwnerSubtitle" style="color:#57657a"></p><p style="color:#57657a;font-size:14px">Add destination links, then arrange the customer experience. Customers see only published steps.</p><form id="cjOwnerForm"><div id="cjOwnerRows"></div><p id="cjOwnerMessage" role="status" style="min-height:24px;font-size:14px;color:#a32323"></p><button type="submit" id="cjOwnerPublish" style="background:#1678e6;color:white;border:0;border-radius:12px;padding:16px;width:100%;font-size:16px;font-weight:750;cursor:pointer">Publish Journey</button></form><p style="font-size:13px;color:#59697d">A board must be claimed to your authenticated account before publishing. An NFC tap uses its permanent public token, not this owner editor.</p></div></main>';
 document.body.append(root);
 root.querySelector("#cjOwnerBack").onclick=()=>{root.remove();selected=null};
 root.querySelector("#cjOwnerForm").onsubmit=publish;
 return root;
}
function show(board){
 selected=board;
 const root=ensurePage();
 root.querySelector("#cjOwnerTitle").textContent=board.name||board.id;
 root.querySelector("#cjOwnerSubtitle").textContent="Board "+board.id;
 const container=root.querySelector("#cjOwnerRows");container.innerHTML="";
 const actions=(Array.isArray(board.actions)?board.actions:[]).map(x=>String(x).toLowerCase());
 const order=[...new Set([...actions.filter(x=>TYPES.some(t=>t[0]===x)),...TYPES.map(t=>t[0])])];
 order.forEach(type=>{const label=TYPES.find(t=>t[0]===type)[1],val=board.destinations?.[type]||board.destinations?.[type.charAt(0).toUpperCase()+type.slice(1)]||"";
 const row=document.createElement("div");row.dataset.type=type;row.style.cssText="padding:15px 0;border-bottom:1px solid #e7edf4";
 row.innerHTML='<div style="display:flex;align-items:center;gap:8px"><label style="font-weight:700;flex:1">'+h(label)+'</label><button type="button" data-move="up" aria-label="Move '+h(label)+' up" style="width:40px;padding:8px">↑</button><button type="button" data-move="down" aria-label="Move '+h(label)+' down" style="width:40px;padding:8px">↓</button></div><input type="url" aria-label="'+h(label)+' URL" placeholder="https://..." style="width:100%;padding:12px;margin-top:8px;border:1px solid #c8d2df;border-radius:9px;font-size:16px" value="'+h(val)+'">';
 row.addEventListener("click",e=>{const btn=e.target.closest("[data-move]");if(!btn)return;const sibling=btn.dataset.move==="up"?row.previousElementSibling:row.nextElementSibling;if(sibling)container.insertBefore(btn.dataset.move==="up"?row:sibling,btn.dataset.move==="up"?sibling:row)});
 container.append(row);
 });
 root.querySelector("#cjOwnerMessage").textContent="";
 root.querySelector("#cjOwnerPublish").disabled=false;
 root.hidden=false;
}
async function publish(e){
 e.preventDefault();const root=ensurePage(),msg=root.querySelector("#cjOwnerMessage"),btn=root.querySelector("#cjOwnerPublish");
 const rows=[...root.querySelectorAll("#cjOwnerRows [data-type]")];
 const entries=rows.map(row=>({type:row.dataset.type,url:row.querySelector("input").value.trim()})).filter(x=>x.url);
 if(!entries.length){msg.textContent="Enter at least one destination URL.";return}
 for(const a of entries){try{const u=new URL(a.url);if(u.protocol!=="https:")throw Error()}catch(_){msg.textContent="Every entered URL must start with https://";return}}
 if(!selected||!/^CJ-[A-Z0-9-]+$/i.test(String(selected.id))){msg.textContent="This board has no verified production identity. Claim your physical SmartBoard first.";return}
 btn.disabled=true;btn.textContent="Publishing…";msg.textContent="";
 try{
  if(typeof initBackend==="function")initBackend();
  if(typeof sb==="undefined"||!sb)throw Error("Supabase is unavailable. Please sign in.");
  const auth=await sb.auth.getUser();
  if(!auth.data?.user)throw Error("Sign in to your owner account before publishing.");
  const result=await sb.rpc("cj_publish_claimed_board_journey",{p_board_number:selected.id,p_actions:entries});
  if(result.error)throw result.error;
  if(result.data?.success!==true)throw Error("Supabase did not confirm publishing.");
  const ws=typeof backendWorkspaceId!=="undefined"?backendWorkspaceId:null;
  if(!ws)throw Error("Published, but the workspace could not be verified. Reload your account to verify.");
  const read=await sb.rpc("cj_list_workspace_published_smartboards",{p_workspace_id:ws});
  if(read.error)throw read.error;
  const match=(Array.isArray(read.data)?read.data:[]).find(x=>x.id===selected.id);
  if(!match||JSON.stringify(match.actions)!==JSON.stringify(entries.map(x=>x.type))||entries.some(x=>match.destinations?.[x.type]!==x.url))throw Error("Publication was requested but read-back verification failed.");
  selected.actions=entries.map(x=>x.type.charAt(0).toUpperCase()+x.type.slice(1));
  selected.destinations=Object.fromEntries(entries.flatMap(x=>[[x.type,x.url],[x.type.charAt(0).toUpperCase()+x.type.slice(1),x.url]]));
  selected.backendId=match.backend_id;selected.publicId=match.public_id;selected.active=match.active;
  if(typeof persistLocalState==="function")persistLocalState();
  msg.style.color="#167245";msg.textContent="Published and verified in Supabase. Customer board link is ready for NFC testing.";
  if(typeof renderDashboard==="function")renderDashboard();
  if(window.CJExactHome?.render)window.CJExactHome.render();
 }catch(err){msg.style.color="#a32323";msg.textContent=String(err?.message||err)}
 finally{btn.disabled=false;btn.textContent="Publish Journey"}
}
// Window capture precedes the legacy document-level homepage router.
// Other SmartBoard navigation and onboarding cards remain untouched.
window.addEventListener("click",e=>{
 const card=e.target.closest?.("#cjScreenshotHome .cjx-board");
 if(!card)return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 const board=chosenCard(card);
 if(board)show(board);
 else{const fallback={id:"CJ-000001",name:"SmartBoard CJ-000001",actions:[],destinations:{}};show(fallback);document.getElementById("cjOwnerMessage").textContent="No authenticated board mapping found. This page cannot publish until the board is claimed and loaded."}
},true);
window.CJSmartBoardOwnerPage={
 open:show,
 openFromCommandCenter:function(){
  const list=boardList();
  const live=list.find(b=>String(b.id||"").toUpperCase()==="CJ-000001")||list[0];
  if(live){show(live);return true;}
  show({id:"CJ-000001",name:"SmartBoard CJ-000001",actions:[],destinations:{}});
  const msg=document.getElementById("cjOwnerMessage");
  if(msg)msg.textContent="CJ-000001 is not in your authenticated SmartBoard list yet. Claim or sync this board before publishing.";
  return true;
 }
};
})();
