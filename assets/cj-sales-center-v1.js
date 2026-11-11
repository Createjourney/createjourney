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
 ["product_url","Product URL (HTTPS)","url","",true],["sale_price","Sale price (USD)","number","299",true],
 ["regular_price","Regular price (USD)","number","340",true],["order_target","Initial order target","number","100",true],
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
 root=el("section",{id:"cjSalesOverlay",role:"dialog","aria-modal":"true","aria-label":"Autonomous Sales Command Center"},document.body);
 const shell=el("main",{className:"cjs-shell"},root);
 const buttons=el("div",{className:"cjs-flex"},shell);
 el("h1",{text:"Autonomous Sales Command Center"},buttons);
 const refreshBtn=el("button",{type:"button",text:"Refresh status"},buttons);refreshBtn.onclick=refresh;
 const closeBtn=el("button",{type:"button",text:"Close"},buttons);closeBtn.onclick=()=>{root.remove();root=null};
 el("p",{text:"Manage campaign drafts and inspect verified readiness. Live campaign automation is not available yet."},shell);
 el("p",{id:"cjs-message",role:"status"},shell);
 const data=el("div",{id:"cjs-content"},shell);
 createForm(shell);
 refresh();
}
function installButton(){
 // The original Marketing control intentionally starts a Journey AI chat.
 // Keep that workflow intact; provide a separate, direct Sales entry point.
 const controls=document.querySelector(".cjx-controls");
 if(controls&&!controls.querySelector("[data-cjs-launch]")){
  const b=el("button",{type:"button","data-cjs-launch":"true",className:"cjx-control"},controls);
  const icon=el("span",{className:"cjx-iconbox cjx-pink"},b);
  icon.textContent="↗";
  const content=el("span",{},b);
  el("strong",{text:"AI Sales Command Center"},content);
  el("span",{className:"cjx-copy",text:"Campaigns, agents & sales readiness"},content);
  el("span",{className:"cjx-arrow",text:"›"},b);
  b.onclick=(event)=>{event.preventDefault();event.stopPropagation();open()};
 }
 // Retain access from the existing (advanced) Marketing workspace too.
 const host=document.getElementById("aiWorkspaceMarketingPanel");
 if(host&&!host.querySelector("[data-cjs-open]")){
  const b=el("button",{type:"button","data-cjs-open":"true",text:"Autonomous Sales — Launch Readiness"},host);
  b.style.cssText="display:block;margin:16px 0;padding:12px 18px;border:0;border-radius:12px;background:#193e77;color:white;font-weight:700;cursor:pointer";
  b.onclick=open;
 }
}
window.CJSalesCommandCenter=Object.freeze({open,request,refresh,close:()=>{if(root){root.remove();root=null}}});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installButton,{once:true});else installButton();
window.addEventListener("cj:journey-context",installButton);
let attempts=0;const timer=setInterval(()=>{installButton();if(++attempts>=20)clearInterval(timer)},1500);
})();
