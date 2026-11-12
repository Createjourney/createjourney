/* CreateJourney Sales Command Center V1. Draft/approval only. No outbound actions. */
(function(){
"use strict";
if(window.CJSalesCommandCenter)return;
const endpoint=()=>SUPABASE_URL+"/functions/v1/cj-sales-command-center";
const el=(tag,props={},parent)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(props)){
 if(k==="text")n.textContent=String(v);else if(k==="className")n.className=v;else if(k==="type")n.type=v;
 else n.setAttribute(k,String(v));
}if(parent)parent.append(n);return n};
const css=`
#cjSalesOverlay{position:fixed;inset:0;z-index:2147483001;background:#0b1220e8;overflow:auto;padding:20px;color:#12223b;font-family:system-ui,-apple-system,sans-serif}
#cjSalesOverlay .cjs-shell{max-width:950px;margin:20px auto;background:#fff;border-radius:22px;padding:28px;box-shadow:0 22px 70px #0004}
#cjSalesOverlay h1{font-size:27px;margin:4px 0 10px}
#cjSalesOverlay h2{font-size:18px;margin:22px 0 9px}
#cjSalesOverlay p,#cjSalesOverlay li{line-height:1.5}
#cjSalesOverlay .cjs-flex{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
#cjSalesOverlay button{background:#163e72;color:white;padding:10px 14px;border:0;border-radius:9px;cursor:pointer}
#cjSalesOverlay button:disabled{opacity:.55;cursor:not-allowed}
#cjSalesOverlay .cjs-card{border:1px solid #dfe5ee;border-radius:14px;padding:16px;margin:10px 0;background:#f8fafc}
#cjSalesOverlay .cjs-warning{border-left:4px solid #c87f2e;background:#fff8ed;padding:12px}
#cjSalesOverlay .cjs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:12px}
#cjSalesOverlay label{font-weight:600;font-size:13px;display:block}
#cjSalesOverlay input,#cjSalesOverlay select{width:100%;margin-top:5px;padding:10px;border:1px solid #bfccda;border-radius:8px;font-size:14px;background:white}
`;
let root=null,last=null;
const providers=[
 ["shopify","Shopify","Storefront, orders, refunds and sales attribution"],
 ["meta","Facebook & Instagram","Business page visibility and Instagram publishing; outreach/ads separately authorized"],
 ["tiktok","TikTok","Profile access; content publishing needs separate platform approval"],
 ["google","Google Business Profile","Business profile and authorized review management"],
 ["gmail","Gmail Business Email","Authorized send-only email connection (outreach separately approved)"],
 ["outlook","Microsoft 365 / Outlook","Future Microsoft Graph email connection"],
 ["meta_ads","Meta Ads","Approved campaigns, budgets and reporting"]
];
async function specialty(slug,body){
 const session=(await sb.auth.getSession()).data.session;
 if(!session?.access_token)throw Error("Sign into CreateJourney first");
 const r=await fetch(SUPABASE_URL+"/functions/v1/"+slug,{method:"POST",headers:{
 Authorization:"Bearer "+session.access_token,apikey:SUPABASE_PUBLISHABLE_KEY,
 "Content-Type":"application/json"},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.error||"Service unavailable");
 return j;
}
async function request(action,fields={}){
 if(typeof sb==="undefined"||!sb||typeof SUPABASE_URL==="undefined")throw Error("Supabase session unavailable");
 const session=(await sb.auth.getSession()).data.session;
 if(!session?.access_token)throw Error("Sign into CreateJourney first");
 const response=await fetch(endpoint(),{method:"POST",headers:{"Authorization":"Bearer "+session.access_token,
  "apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({action,...fields})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(data.error||"Sales service unavailable");
 return data;
}
const clear=n=>{while(n.firstChild)n.firstChild.remove()};
function message(s,isError=false){if(!root)return;const m=root.querySelector("#cjs-message");m.textContent=s;m.style.color=isError?"#a32424":"#2b506f"}
async function refresh(){
 if(!root)return;
 message("Loading authorized campaign information…");
 try{last=await request("overview");render(last);message("Read-only readiness refreshed. No campaigns launched.")}catch(e){message(e.message||String(e),true)}
}
function render(data){
 const container=root.querySelector("#cjs-content");clear(container);
 const summary=el("div",{className:"cjs-card cjs-warning"},container);
 el("strong",{text:"Sales launch status: "+(data.readiness?.status||"UNKNOWN")},summary);
 el("p",{text:"Campaign approval is for planning only. No social posts, outreach, ads, or Shopify operations are being executed."},summary);
 const blockers=data.readiness?.blockers||[];
 el("p",{text:"Outstanding verification gates: "+(blockers.length?blockers.join(" · "):"None reported")},summary);
 renderMarketingHub(data,container);
 el("h2",{text:"Registered AI specialist capabilities"},container);
 const agentBox=el("div",{className:"cjs-grid"},container);
 for(const group of data.agent_capabilities||[]){
  const card=el("div",{className:"cjs-card"},agentBox);
  el("strong",{text:group.key.replaceAll("_"," ").toUpperCase()},card);
  el("p",{text:group.agents.map(a=>"#"+a.agent_no+" "+a.status).join(", ")},card);
  el("small",{text:"External execution: NOT VERIFIED"},card);
 }
 el("h2",{text:"Connected platforms"},container);
 const integrations=el("div",{className:"cjs-card"},container);
 if(!data.integrations?.length)el("p",{text:"No business integrations verified."},integrations);
 for(const c of data.integrations||[]){
  el("p",{text:c.provider+" — "+c.connection_status+" — Operational verification: pending"},integrations);
 }
 el("h2",{text:"Campaigns (planning only)"},container);
 const campaigns=el("div",{},container);
 if(!data.campaigns?.length)el("p",{text:"No campaigns configured yet."},campaigns);
 for(const campaign of data.campaigns||[]){
  const card=el("div",{className:"cjs-card"},campaigns);
  el("strong",{text:campaign.name+" — "+campaign.status.toUpperCase()},card);
  el("p",{text:campaign.product_name+" | "+campaign.currency+" "+(campaign.sale_price_cents/100).toFixed(2)+" | "+campaign.order_target+" order target | Daily ad limit "+(campaign.daily_ad_cap_cents/100).toFixed(2)},card);
  const toolbar=el("div",{className:"cjs-flex"},card);
  if(campaign.status!=="approved"){
   const button=el("button",{type:"button",text:"Approve planning only"},toolbar);
   button.onclick=()=>change("approve",campaign.id);
  }
  if(campaign.status!=="paused"){
   const button=el("button",{type:"button",text:"Pause campaign"},toolbar);
   button.onclick=()=>change("pause",campaign.id);
  }
 }
 el("h2",{text:"Recent agent execution records"},container);
 const jobs=el("div",{className:"cjs-card"},container);
 if(!data.execution_results?.length)el("p",{text:"No recorded agent executions for this business."},jobs);
 for(const job of data.execution_results||[])
  el("p",{text:"#"+job.agent_no+" — "+job.status+" / "+job.execution_type+" — External action NOT VERIFIED"},jobs);
}

function renderMarketingHub(data,container){
 const intro=el("div",{className:"cjs-card"},container);
 el("h2",{text:"One Marketing Command Center"},intro);
 el("p",{text:"Account connections, AI sales team, campaign drafts, outreach readiness and performance — all in one place. This view will never claim a connection or an agent is operational without evidence."},intro);
 const toolbar=el("div",{className:"cjs-flex"},intro);
 const activate=el("button",{type:"button",text:"Activate AI Sales Team — check readiness"},toolbar);
 activate.onclick=async()=>{
  activate.disabled=true;message("Checking agent activation requirements…");
  try{
   const r=await specialty("cj-agent-activation-controller",{action:"activation_plan",business_id:data.business_id});
   message((r.pilot_candidates||[]).length+" pilot-test candidates; "+(r.requires_development||[]).length+
   " agents still require development. No automatic agent activation performed.");
  }catch(e){message(e.message||String(e),true)}finally{activate.disabled=false}
 };
 const draft=el("button",{type:"button",text:"Create Flourished Images marketing plan"},toolbar);
 const plan=el("div",{className:"cjs-card"},intro);plan.hidden=true;
 draft.onclick=()=>{plan.hidden=!plan.hidden};
 el("p",{text:"Owner-initiated AI planning only. Setup does not connect accounts, publish content or spend advertising funds."},plan);
 const setup=el("button",{type:"button",text:"Set up Flourished Images workspace"},plan);
 setup.onclick=async()=>{
  setup.disabled=true;
  try{
   const result=await specialty("cj-marketing-launch-squad",{
    action:"setup_brand",brand_name:"Flourished Images",confirm_brand_control:true,
    website_url:"https://flourishedimages.com",
    product_brief:{product:"Premium multifunctional display frame",price_usd:240,
    launch_units_planned:100,shipping_goal_days:20,shipping_capacity_verified:false,
    checkout_verified:false}});
   message("Marketing workspace: "+result.status+". No third-party accounts connected.");
  }catch(e){message(e.message||String(e),true)}finally{setup.disabled=false}
 };
 const approval=el("label",{},plan);
 const check=el("input",{type:"checkbox"},approval);check.style.width="auto";
 approval.append(document.createTextNode(" I authorize AI usage charges for one draft-only campaign run."));
 const run=el("button",{type:"button",text:"Generate draft campaign (AI usage)"},plan);
 const resultBox=el("pre",{className:"cjs-card"},plan);resultBox.hidden=true;
 resultBox.style.whiteSpace="pre-wrap";resultBox.style.overflowWrap="anywhere";
 run.onclick=async()=>{
  if(!check.checked){message("Approve AI usage before running specialists.",true);return}
  run.disabled=true;message("Preparing draft…");
  try{
   const r=await specialty("cj-marketing-launch-squad",{action:"draft_campaign",
    brand_name:"Flourished Images",confirm_draft_only:true,confirm_analysis_cost:true,
    request:"Draft a detailed 14-day marketing plan for a premium $240 display frame with an initial target of 100 preorders. Separate verified facts from assumptions. Suggest outreach, creatives and measurement. Shipping within 20 days remains unverified."});
   resultBox.hidden=false;resultBox.textContent=JSON.stringify(r.campaign_draft||r,null,2);
   message("Draft generated. No publishing, outbound contact or ad spending.");
  }catch(e){message(e.message||String(e),true)}finally{run.disabled=false}
 };
 el("h2",{text:"Marketing account connections"},container);
 el("p",{text:"Check connection readiness before authorizing a platform. Only configured OAuth providers receive a Connect button. Connecting does not authorize posting, messaging or ad spend."},container);
 const connActions=el("div",{className:"cjs-flex"},container);
 const checkConn=el("button",{type:"button",text:"Check connection readiness"},connActions);
 const grid=el("div",{className:"cjs-grid"},container);
 function drawConnections(snapshot){
  clear(grid);
  for(const [key,name,purpose] of providers){
   const providerKey=key==="meta_ads"?"meta":key;
   const supports=["meta","google","shopify","gmail","tiktok"].includes(key);
   const state=key==="shopify"?snapshot?.shopify:["gmail","tiktok"].includes(key)?snapshot?.marketing?.[key]:snapshot?.accounts?.find(a=>a.provider===providerKey);
   const canOAuth=supports&&(key==="shopify"?snapshot?.shopify?.oauth_configured===true:["gmail","tiktok"].includes(key)?snapshot?.marketing?.[key]?.oauth_configured===true:snapshot?.readiness?.[providerKey]?.oauth_configured===true);
   const configured=state?.status==="connected";
   const box=el("div",{className:"cjs-card"},grid);
   el("strong",{text:name},box);el("p",{text:purpose},box);
   const status=el("p",{text:!supports?
    "Connector under development — no live OAuth":
    !snapshot?"Readiness not checked — not verified":
    configured?"Connected record — verify operational permissions":
    state?"Status: "+state.status:
    canOAuth?"Ready to authorize — not connected":"OAuth configuration required"},box);
   let storeInput=null;
   if(key==="shopify"&&canOAuth&&!configured){
    const label=el("label",{text:"Shop domain (.myshopify.com)"},box);
    storeInput=el("input",{type:"text",placeholder:"your-store.myshopify.com"},label);
    storeInput.autocomplete="off";storeInput.maxLength=90;
   }
   const button=el("button",{type:"button",text:canOAuth&&key!=="meta_ads"?
    configured?(key==="shopify"?"Verify store":"Verify account"):"Connect "+name:"View requirements"},box);
   button.onclick=async()=>{
    if(!supports||key==="meta_ads"){message(name+" is not available as a separately verified marketing connector yet.",true);return}
    if(!snapshot){message("Check connection readiness first.",true);return}
    if(!canOAuth){message(name+" requires provider OAuth credentials and encrypted token storage configured in Supabase.",true);return}
    button.disabled=true;
    try{
     if(key==="shopify"){
      if(configured){
       const verified=await specialty("cj-shopify-integration",{action:"verify",business_id:data.business_id});
       if(!verified.identity_verified)throw Error("Shopify identity not verified");
       message("Shopify verified for "+verified.store+". Orders, refunds, checkout attribution and publishing require separate verified webhooks.");
       await loadConnections();return;
      }
      const shop=String(storeInput?.value||"").trim().toLowerCase();
      if(!/^[a-z0-9][a-z0-9-]{0,62}\.myshopify\.com$/.test(shop))
       throw Error("Enter the exact Shopify .myshopify.com store domain");
      const started=await specialty("cj-shopify-integration",{action:"begin",business_id:data.business_id,shop});
      if(!started.authorization_url||!/^https:\/\//.test(started.authorization_url))throw Error("Shopify authorization URL unavailable");
      window.location.assign(started.authorization_url);
     }else if(configured){
      const basic=["gmail","tiktok"].includes(key);
      const verification=await specialty(basic?"cj-marketing-oauth":"journey-integrations",
       {action:basic?"verify":"sync_account",business_id:data.business_id,provider:providerKey});
      if(!(verification.verified||verification.identity_verified))throw Error(verification.error||"Provider verification failed");
      message(name+" provider account verified. Publishing and campaign permissions require separate tests.");
      await loadConnections();
     }else{
      const oauthBasic=["gmail","tiktok"].includes(key);
      const started=await specialty(oauthBasic?"cj-marketing-oauth":"journey-integrations",
       {action:oauthBasic?"begin":"begin_connection",business_id:data.business_id,provider:providerKey});
      if(!started.authorization_url||!/^https:\/\//.test(started.authorization_url))throw Error("Provider authorization URL unavailable");
      window.location.assign(started.authorization_url);
     }
    }catch(e){message(e.message||String(e),true)}finally{button.disabled=false}
   };
   if(configured&&supports&&key!=="meta_ads"){
    const disconnect=el("button",{type:"button",text:"Disconnect "+name},box);
    disconnect.onclick=async()=>{
     if(!confirm("Disconnect "+name+" from this business? Scheduled external actions must be stopped separately."))return;
     disconnect.disabled=true;
     try{await specialty(key==="shopify"?"cj-shopify-integration":
        ["gmail","tiktok"].includes(key)?"cj-marketing-oauth":"journey-integrations",
       {action:"disconnect",business_id:data.business_id,...(key==="shopify"?{}:{provider:providerKey})});
      await loadConnections();message(name+" disconnected in CreateJourney.");
     }catch(e){message(e.message||String(e),true)}finally{disconnect.disabled=false}
    };
   }
  }
 }
 async function loadConnections(){
  checkConn.disabled=true;
  try{
   const main=await specialty("journey-integrations",{action:"status",business_id:data.business_id});
   let shopify=null;
   try{shopify=await specialty("cj-shopify-integration",{action:"status",business_id:data.business_id})}
   catch(e){shopify={status:"unavailable",oauth_configured:false}}
   const marketing={};
   for(const provider of ["gmail","tiktok"]){
    try{marketing[provider]=await specialty("cj-marketing-oauth",
     {action:"status",business_id:data.business_id,provider});}
    catch(e){marketing[provider]={status:"unavailable",oauth_configured:false}}
   }
   drawConnections({...main,shopify,marketing});
   message("Connection readiness checked. This does not prove publishing or sales execution.");
  }catch(e){drawConnections(null);message(e.message||String(e),true)}
  finally{checkConn.disabled=false}
 }
 checkConn.onclick=loadConnections;
 drawConnections(null);
 const gate=el("div",{className:"cjs-card"},container);
 el("h2",{text:"Live sales readiness"},gate);
 el("p",{text:"Campaign planning is available below. Provider publishing, advertising, outreach and order verification remain blocked until their secure connectors and test receipts pass."},gate);
}
async function change(action,campaign_id){
 if(action==="approve"&&!confirm("Approve this campaign for planning? This does NOT send posts, messages, or spend money."))return;
 try{await request(action,{campaign_id});await refresh()}catch(e){message(e.message||String(e),true)}
}
function createForm(container){
 const box=el("div",{className:"cjs-card"},container);
 el("h2",{text:"Create a campaign draft"},box);
 const form=el("form",{className:"cjs-grid"},box);
 const fields=[
 ["name","Campaign name","text","",true],["product_name","Product","text","",true],
 ["product_url","Product URL (HTTPS)","url","",true],["sale_price","Sale price (USD)","number","240",true],
 ["regular_price","Regular price (USD)","number","240",true],["order_target","Initial order target","number","100",true],
 ["daily_ad_cap","Maximum daily advertising (USD)","number","10",true],
 ["daily_research_target","Daily prospect research goal","number","120",true]
 ];
 const inputs={};
 for(const [id,label,type,placeholder,required] of fields){
  const wrap=el("label",{text:label},form);
  const input=el("input",{type,placeholder},wrap);if(required)input.required=true;
  if(type==="number")input.min="0";
  inputs[id]=input;
 }
 const shipping=el("label",{text:"Shipping policy"},form);
 const select=el("select",{},shipping);for(const [value,label] of [["buyer_pays","Buyer pays"],["seller_pays","Seller pays"],["calculated","Calculated"]]){
 const o=el("option",{value,text:label},select);o.value=value}
 const button=el("button",{type:"submit",text:"Save draft — no sales actions"},form);
 form.onsubmit=async(ev)=>{
  ev.preventDefault();button.disabled=true;
  try{
   const price=s=>Math.round(Number(s)*100);
   await request("create",{campaign:{
    name:inputs.name.value,product_name:inputs.product_name.value,product_url:inputs.product_url.value,
    sale_price_cents:price(inputs.sale_price.value),regular_price_cents:price(inputs.regular_price.value),
    order_target:Number(inputs.order_target.value),daily_ad_cap_cents:price(inputs.daily_ad_cap.value),
    daily_research_target:Number(inputs.daily_research_target.value),shipping_policy:select.value}});
   form.reset();await refresh();
  }catch(e){message(e.message||String(e),true)}finally{button.disabled=false}
 };
}
function open(){
 if(root){root.hidden=false;return refresh()}
 if(!document.getElementById("cjs-style")){const style=el("style",{id:"cjs-style"});style.textContent=css;document.head.append(style)}
 root=el("section",{id:"cjSalesOverlay",role:"dialog","aria-modal":"true","aria-label":"Marketing & Sales Command Center"},document.body);
 const shell=el("main",{className:"cjs-shell"},root);
 const buttons=el("div",{className:"cjs-flex"},shell);
 el("h1",{text:"Marketing & Sales Command Center"},buttons);
 const refreshBtn=el("button",{type:"button",text:"Refresh status"},buttons);refreshBtn.onclick=refresh;
 const closeBtn=el("button",{type:"button",text:"Close"},buttons);closeBtn.onclick=()=>{root.remove();root=null};
 el("p",{text:"Manage connected accounts, your AI marketing team, campaigns and sales readiness. External actions remain approval-gated."},shell);
 el("p",{id:"cjs-message",role:"status"},shell);
 const data=el("div",{id:"cjs-content"},shell);
 createForm(shell);
 refresh();
}
function installButton(){
 // Replace the native Marketing tile with one visually identical dedicated launcher.
 // Existing command-center capture handlers otherwise intercept the native action.
 const controls=document.querySelector(".cjx-controls");
 if(controls){
  const native=controls.querySelector('[data-cjx-home-action="marketing"]');
  if(native){
   const replacement=native.cloneNode(true);
   replacement.removeAttribute("data-cjx-home-action");
   replacement.removeAttribute("id");
   replacement.setAttribute("data-cjs-launch","true");
   replacement.setAttribute("aria-label","Marketing");
   replacement.onclick=(event)=>{event.preventDefault();event.stopPropagation();open()};
   native.replaceWith(replacement);
  }else if(!controls.querySelector("[data-cjs-launch]")){
   const b=el("button",{type:"button","data-cjs-launch":"true",className:"cjx-control"},controls);
   el("strong",{text:"Marketing"},b);
   b.onclick=(event)=>{event.preventDefault();event.stopPropagation();open()};
  }
 }
 // Retain access from the existing (advanced) Marketing workspace too.
 const host=document.getElementById("aiWorkspaceMarketingPanel");
 if(host&&!host.querySelector("[data-cjs-open]")){
  const b=el("button",{type:"button","data-cjs-open":"true",text:"Marketing & Sales Command Center"},host);
  b.style.cssText="display:block;margin:16px 0;padding:12px 18px;border:0;border-radius:12px;background:#193e77;color:white;font-weight:700;cursor:pointer";
  b.onclick=open;
 }
}
// The homepage uses delegated document-level capture handlers to route controls.
// Take ownership of the *dedicated* Sales tile at window capture phase,
// before any home rerender, scrolling or generic navigation can intercept it.
window.addEventListener("click",(event)=>{
 const node=event.target instanceof Element ? event.target.closest("[data-cjs-launch]") : null;
 if(!node)return;
 event.preventDefault();
 event.stopImmediatePropagation();
 open();
},true);
window.CJSalesCommandCenter=Object.freeze({open,request,refresh,close:()=>{if(root){root.remove();root=null}}});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installButton,{once:true});else installButton();
window.addEventListener("cj:journey-context",installButton);
// The Command Center renders after login and can re-render during navigation.
// Keep a low-cost check alive so the direct Sales tile survives those transitions.
setInterval(()=>{if(!document.hidden)installButton()},3500);
})();
