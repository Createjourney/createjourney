/* SmartBoard owner activation wizard. Rear activation QR: ?activate_board=CJ-...&activation=<secret>
   Public NFC/front QR is distinct: ?board=<permanent public token>. */
(function(){
"use strict";
function $(id){return document.getElementById(id)}
function getQR(){const p=new URLSearchParams(location.search);return {number:(p.get("activate_board")||p.get("cj_board")||"").trim().toUpperCase(),code:(p.get("activation")||p.get("cj_code")||"").trim()}}
function prefill(){const q=getQR();if(!q.number||!q.code)return;try{sessionStorage.setItem("cj_activation_pending",JSON.stringify(q));history.replaceState({},document.title,location.pathname+location.hash)}catch(_){}const n=$("cjRegistrationBoardNumber"),c=$("cjRegistrationActivationCode");if(n){n.value=q.number;n.dispatchEvent(new Event("input",{bubbles:true}))}if(c){c.value=q.code;c.dispatchEvent(new Event("input",{bubbles:true}))}}
function pending(){try{return JSON.parse(sessionStorage.getItem("cj_activation_pending")||"null")}catch{return null}}
function ensureOverlay(){
 if($("cjBoardActivationWizard"))return $("cjBoardActivationWizard");
 const root=document.createElement("div");root.id="cjBoardActivationWizard";root.style.cssText="position:fixed;inset:0;background:#f5f8fc;z-index:2147482000;overflow:auto;padding:28px 16px 90px;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif";
 root.innerHTML='<main style="max-width:520px;margin:35px auto;background:#fff;border-radius:20px;padding:24px;box-shadow:0 12px 35px #102b4c18"><h1 style="font-size:25px;margin:0 0 8px">Set Up Your SmartBoard Journey</h1><p style="color:#56657a">Add 1–3 links. Only the actions you enter will appear when customers tap your board.</p><form id="cjWizardForm"><label style="display:block;margin:16px 0 6px">Pay / Tip link (optional)</label><input id="cjWizardPay" type="url" placeholder="https://..." style="width:100%;padding:13px;border:1px solid #cdd7e4;border-radius:10px;font-size:16px"><label style="display:block;margin:16px 0 6px">Google Review link (optional)</label><input id="cjWizardReview" type="url" placeholder="https://..." style="width:100%;padding:13px;border:1px solid #cdd7e4;border-radius:10px;font-size:16px"><label style="display:block;margin:16px 0 6px">Booking link (optional)</label><input id="cjWizardBook" type="url" placeholder="https://..." style="width:100%;padding:13px;border:1px solid #cdd7e4;border-radius:10px;font-size:16px"><p id="cjWizardError" role="alert" style="color:#b42318;min-height:22px;font-size:13px"></p><button id="cjWizardPublish" type="submit" style="width:100%;padding:15px;background:#1678e6;color:#fff;border:0;border-radius:12px;font-weight:750;font-size:16px">Publish & Activate SmartBoard</button></form></main>';
 document.body.appendChild(root);return root;
}
async function start(number,code,alreadyClaimed){
 number=String(number||"").trim().toUpperCase();code=String(code||"").trim();
 if(!number)throw Error("SmartBoard number required");
 if(typeof initBackend!=="function")throw Error("Backend unavailable");initBackend();
 if(!sb)throw Error("Sign in before activating your SmartBoard");
 const user=(await sb.auth.getUser()).data.user;if(!user)throw Error("Sign in before activating your SmartBoard");
 if(!alreadyClaimed){
  if(!code)throw Error("Scan the back-of-board activation QR, or enter the activation code");
  const claim=await sb.rpc("cj_claim_board_verified",{p_board_number:number,p_activation_code:code});
  if(claim.error)throw claim.error;if(!claim.data?.success)throw Error("SmartBoard could not be claimed");
 }
 if(typeof cjBootstrapWorkspaceV24==="function")await cjBootstrapWorkspaceV24(user);
 const root=ensureOverlay();root.hidden=false;
 $("cjWizardForm").onsubmit=async function(e){
  e.preventDefault();const error=$("cjWizardError"),btn=$("cjWizardPublish");error.textContent="";
  const fields=[["pay",$("cjWizardPay").value],["review",$("cjWizardReview").value],["book",$("cjWizardBook").value]];
  const actions=fields.filter(x=>x[1].trim()).map(x=>({type:x[0],url:x[1].trim()}));
  if(!actions.length){error.textContent="Enter at least one destination URL.";return}
  for(const item of actions){try{const u=new URL(item.url);if(u.protocol!=="https:")throw 0}catch{error.textContent="Each link must be a complete HTTPS URL.";return}}
  btn.disabled=true;btn.textContent="Publishing…";
  try{
   const result=await sb.rpc("cj_publish_claimed_board_journey",{p_board_number:number,p_actions:actions});
   if(result.error)throw result.error;if(!result.data?.success)throw Error("Publishing was not confirmed");
   const data=result.data;
   if(typeof boards!=="undefined"&&typeof makeBoard==="function"){
    const existing=boards.find(b=>b.id===number);
    const destinations={};const labels=actions.map(a=>a.type);
    actions.forEach(a=>destinations[a.type]=a.url);
    const b=existing||makeBoard({id:number,name:number,actions:labels,destinations,active:true,demo:false});
    b.actions=labels;b.destinations=destinations;b.active=true;b.status="active";b.demo=false;b.route=labels.map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join(" → ");b.publicId=data.public_id;b.backendId=data.board_id;
    if(!existing)boards.push(b);
    if(typeof currentBoardId!=="undefined")currentBoardId=b.id;
    if(typeof persistLocalState==="function")persistLocalState();if(typeof syncCloudSnapshot==="function"){const saved=await syncCloudSnapshot();if(!saved)console.warn("SmartBoard is published, but workspace snapshot sync needs attention") }
   }
   sessionStorage.removeItem("cj_activation_pending");root.hidden=true;
   if(typeof openAiBusinessSetup==="function"){openAiBusinessSetup()}
   else if(typeof openDashboard==="function")openDashboard();
  }catch(err){error.textContent=String(err.message||err)}
  finally{btn.disabled=false;btn.textContent="Publish & Activate SmartBoard"}
 };
}
window.CJBoardActivationWizard={start,prefill,pending};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",prefill,{once:true});else prefill();
})();