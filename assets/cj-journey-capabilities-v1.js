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
 root.innerHTML='<main style="max-width:700px;margin:auto"><button type="button" id="cjOwnerBack" style="border:0;background:none;padding:10px 0;color:#175fc0;font-size:15px;cursor:pointer">← Back to Command Center</button><div style="background:white;border-radius:20px;padding:25px;box-shadow:0 12px 35px #102b4c12"><div style="font-size:12px;font-weight:800;letter-spacing:1px;color:#3175bf">SMARTBOARD MANAGEMENT</div><h1 id="cjOwnerTitle" style="font-size:27px;margin:9px 0 5px"></h1><p id="cjOwnerSubtitle" style="color:#57657a"></p><p style="color:#57657a;font-size:14px">Add destination links, then arrange the customer experience. Customers see only published steps.</p><form id="cjOwnerForm"><div id="cjOwnerRows"></div><p id="cjOwnerMessage" role="status" style="min-height:24px;font-size:14px;color:#a32323"></p><button type="button" id="cjOwnerTestMode" style="background:#e7f1ff;color:#155cb6;border:1px solid #b8d7fb;border-radius:12px;padding:15px;width:100%;font-size:16px;font-weight:750;cursor:pointer;margin-bottom:12px">▶ Test Customer Journey (Simulation)</button><button type="submit" id="cjOwnerPublish" style="background:#1678e6;color:white;border:0;border-radius:12px;padding:16px;width:100%;font-size:16px;font-weight:750;cursor:pointer">Publish Journey</button></form><p style="font-size:13px;color:#59697d">A board must be claimed to your authenticated account before publishing. An NFC tap uses its permanent public token, not this owner editor.</p></div></main>';
 document.body.append(root);
 root.querySelector("#cjOwnerBack").onclick=()=>{root.remove();selected=null};
 root.querySelector("#cjOwnerForm").onsubmit=publish;
 root.querySelector("#cjOwnerTestMode").onclick=launchOwnerTest;
 return root;
}
function smartConnect(row,type){
 const input=row.querySelector('input[type="url"]');
 const box=document.createElement("div");box.style.cssText="margin-top:9px;padding:12px;background:#f2f7ff;border-radius:10px;font-size:13px";
 if(type==="pay"){
  box.innerHTML='<label style="display:block;font-weight:650;margin-bottom:6px">Payment provider</label><select aria-label="Payment provider" style="width:100%;padding:10px;border-radius:8px;border:1px solid #cbd5e1"><option value="venmo">Venmo username</option><option value="paypal">PayPal.Me username</option><option value="other">Square / other payment URL</option><option value="zelle">Zelle instructions</option></select><input type="text" aria-label="Payment account username" placeholder="Username (without @)" style="width:100%;padding:10px;margin-top:8px;border:1px solid #cbd5e1;border-radius:8px"><button type="button" data-connect style="margin-top:8px;padding:9px 12px;border-radius:8px;background:#176dd0;color:white;border:0">Use this payment destination</button><p data-help style="color:#53677f;margin:8px 0 0">Check the recipient carefully before publishing.</p>';
  const sel=box.querySelector("select"),name=box.querySelector('input[type="text"]'),help=box.querySelector("[data-help]");
  sel.onchange=()=>{name.hidden=sel.value==="other"||sel.value==="zelle";box.querySelector("[data-connect]").hidden=sel.value==="other"||sel.value==="zelle";help.textContent=sel.value==="zelle"?"Zelle has no universal direct payment link. Provide instructions outside this URL-only Journey, or use another supported provider.":sel.value==="other"?"Paste the provider's HTTPS checkout link into the destination field above.":"Verify the destination belongs to your business.";};
  box.querySelector("[data-connect]").onclick=()=>{const u=name.value.trim().replace(/^@/,"");if(!/^[a-zA-Z0-9_.-]{2,80}$/.test(u)){help.textContent="Enter a valid username.";return}input.value=sel.value==="venmo"?"https://account.venmo.com/pay?recipients="+encodeURIComponent(u):"https://paypal.me/"+encodeURIComponent(u);input.dispatchEvent(new Event("input",{bubbles:true}));help.textContent="Link generated. Use Preview to check the recipient before publishing.";};
 }else if(type==="review"){
  box.innerHTML='<label style="display:block;font-weight:650;margin-bottom:6px">Find your Google business</label><input type="search" aria-label="Search Google business" placeholder="Business name, city" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"><button type="button" data-search style="margin:8px 0;padding:9px 12px;border-radius:8px;background:#176dd0;color:white;border:0">Find business on Google Maps ↗</button><label style="display:block;margin:8px 0 5px">Google Place ID (if available)</label><input type="text" aria-label="Google Place ID" placeholder="ChIJ..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px"><button type="button" data-generate style="margin-top:8px;padding:9px 12px;border-radius:8px;background:#176dd0;color:white;border:0">Generate direct review link</button><p data-help style="color:#53677f;margin:8px 0 0">Business search opens Google Maps. Automatic listing selection requires a configured Google Places integration; do not paste a Maps search link as a direct review link.</p>';
  const fields=box.querySelectorAll("input"),help=box.querySelector("[data-help]");
  box.querySelector("[data-search]").onclick=()=>{const q=fields[0].value.trim();if(!q){help.textContent="Enter a business name and city.";return}window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q),"_blank","noopener,noreferrer");};
  box.querySelector("[data-generate]").onclick=()=>{const id=fields[1].value.trim();if(!/^[A-Za-z0-9_-]{8,250}$/.test(id)){help.textContent="Enter the exact Google Place ID; a business name alone is not sufficient.";return}input.value="https://search.google.com/local/writereview?placeid="+encodeURIComponent(id);help.textContent="Direct review URL generated. Preview it before publishing.";};
 }else{
  box.innerHTML='<p style="color:#53677f;margin:0">Paste your booking provider’s HTTPS booking URL above. Provider account discovery will be added when an integration is available.</p>';
 }
 const preview=document.createElement("button");preview.type="button";preview.textContent="↗ Preview destination";preview.style.cssText="display:block;margin-top:10px;border:1px solid #b5c7de;background:white;color:#175fc0;border-radius:8px;padding:9px 12px";
 preview.onclick=()=>{try{const url=new URL(input.value);if(url.protocol!=="https:")throw Error();window.open(url.href,"_blank","noopener,noreferrer")}catch(_){alert("Enter a valid HTTPS destination first.")}};
 box.append(preview);row.append(box);
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
 smartConnect(row,type);
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

async function launchOwnerTest(){
 const root=ensurePage(),msg=root.querySelector("#cjOwnerMessage"),button=root.querySelector("#cjOwnerTestMode");
 msg.style.color="#a32323";msg.textContent="";
 if(!selected){msg.textContent="Choose a claimed SmartBoard first.";return}
 button.disabled=true;button.textContent="Checking owner access…";
 try{
  if(typeof initBackend==="function")initBackend();
  if(typeof sb==="undefined"||!sb)throw Error("Owner authentication is unavailable.");
  const auth=await sb.auth.getUser();if(!auth.data?.user)throw Error("Sign in to your owner account to run a simulation.");
  const ws=typeof backendWorkspaceId!=="undefined"?backendWorkspaceId:null;
  if(!ws)throw Error("Your authenticated workspace is not available.");
  const read=await sb.rpc("cj_list_workspace_published_smartboards",{p_workspace_id:ws});
  if(read.error)throw read.error;
  const board=(Array.isArray(read.data)?read.data:[]).find(x=>x.id===selected.id);
  if(!board)throw Error("This SmartBoard is not in your authorized workspace.");
  const steps=(Array.isArray(board.actions)?board.actions:[]).map(type=>({type,url:board.destinations?.[String(type).toLowerCase()]||board.destinations?.[type]||""})).filter(x=>x.url);
  if(!steps.length)throw Error("Publish at least one Journey destination before testing.");
  showOwnerSimulation(steps);
 }catch(e){msg.textContent=String(e.message||e)}
 finally{button.disabled=false;button.textContent="▶ Test Customer Journey (Simulation)"}
}
function showOwnerSimulation(steps){
 let n=document.getElementById("cjOwnerSimulation");if(n)n.remove();
 n=document.createElement("div");n.id="cjOwnerSimulation";
 n.style.cssText="position:fixed;inset:0;z-index:2147483600;background:#f7f9fd;overflow:auto;display:grid;place-items:center;padding:25px;font:16px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#15253c;text-align:center";
 n.innerHTML='<main style="max-width:420px;width:100%"><div style="font-size:13px;font-weight:800;color:#a45b00;background:#fff2ce;border-radius:20px;padding:10px">OWNER SIMULATION · NO REAL ACTIONS</div><h1 style="font-size:29px;margin:22px 0 5px">CreateJourney</h1><div id="cjSimBody"></div><button type="button" id="cjSimClose" style="background:transparent;color:#40618b;border:0;padding:15px;cursor:pointer;margin-top:15px">Close Test</button></main>';
 document.body.append(n);n.querySelector("#cjSimClose").onclick=()=>n.remove();
 let index=0;const body=n.querySelector("#cjSimBody");
 function render(){
  if(index>=steps.length){
   body.innerHTML='<h2 style="font-size:28px;margin-top:40px">Thank You!</h2><p>Your Journey is complete.</p><p aria-label="Celebration" style="font-size:42px">🎉 🎊 🎉</p><p style="color:#64748b">Simulation completed. No payment, review, or booking was submitted.</p>';return;
  }
  const type=String(steps[index].type).toLowerCase();
  const title=type==="pay"?"Venmo / Pay Now":type==="review"?"Google Review":type==="book"?"Book Your Next Appointment":type.charAt(0).toUpperCase()+type.slice(1);
  body.replaceChildren();
  const p=document.createElement("p");p.textContent="STEP "+(index+1)+" OF "+steps.length; p.style.cssText="color:#3978c8;font-size:13px;font-weight:800;margin-top:35px";
  const h=document.createElement("h2");h.textContent=title;h.style.fontSize="26px";
  const note=document.createElement("p");note.textContent="Simulation only. Imagine completing this action in the external app. No external site will open.";note.style.color="#65758b";
  const arrow=document.createElement("button");arrow.type="button";arrow.textContent=index===steps.length-1?"✓":"➜";arrow.setAttribute("aria-label",index===steps.length-1?"Finish simulated Journey":"Advance simulated Journey");arrow.style.cssText="display:block;margin:28px auto;border:0;border-radius:50%;width:78px;height:78px;background:#1479e8;color:#fff;font-size:36px;cursor:pointer;animation:cjSimPulse 1.5s ease-in-out infinite";
  arrow.onclick=()=>{index++;render()};
  body.append(p,h,note,arrow);
 }
 const style=document.createElement("style");style.textContent="@keyframes cjSimPulse{0%,100%{box-shadow:0 0 0 0 #1479e855}55%{box-shadow:0 0 0 17px #1479e800}}@media(prefers-reduced-motion:reduce){#cjOwnerSimulation button{animation:none!important}}";n.append(style);render();
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
  // Always re-read authorized published boards; never trust stale browser-local state.
  (async()=>{
   try{
    if(typeof initBackend==="function")initBackend();
    if(typeof sb==="undefined"||!sb)throw Error("Sign in to load your SmartBoards.");
    const user=(await sb.auth.getUser()).data?.user;
    if(!user)throw Error("Sign in to load your SmartBoards.");
    const memberships=await sb.from("workspace_members").select("workspace_id,workspaces(name)").eq("user_id",user.id);
    if(memberships.error)throw memberships.error;
    const rows=memberships.data||[];
    if(!rows.length)throw Error("No authorized workspace is attached to this account.");
    let chosen=null,workspace=null;
    for(const membership of rows){
     const res=await sb.rpc("cj_list_workspace_published_smartboards",{p_workspace_id:membership.workspace_id});
     if(res.error)continue;
     const match=(Array.isArray(res.data)?res.data:[]).find(b=>String(b.id).toUpperCase()==="CJ-000001");
     if(match){chosen=match;workspace=membership.workspace_id;break}
    }
    if(!chosen)throw Error("CJ-000001 is not published in any workspace available to this signed-in account. Check the owner account used to claim the board; do not activate it again.");
    if(typeof backendWorkspaceId!=="undefined")backendWorkspaceId=workspace;
    const board={id:chosen.id,name:chosen.name,actions:chosen.actions,destinations:chosen.destinations,backendId:chosen.backend_id,publicId:chosen.public_id,active:chosen.active};
    if(typeof boards!=="undefined"&&Array.isArray(boards)&&!boards.some(b=>b.id===board.id))boards.push(board);
    show(board);
    if(typeof renderDashboard==="function")renderDashboard();
    if(window.CJExactHome?.render)window.CJExactHome.render();
   }catch(err){const msg=document.getElementById("cjOwnerMessage");if(msg){msg.style.color="#a32323";msg.textContent=String(err.message||err)}}
  })();
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
