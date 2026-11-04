/* CreateJourney owner-first NFC onboarding v2.1. Permanent public NFC token; private owner code. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=[["pay","Pay Now"],["review","Leave Review"],["book","Book Appointment"],["subscribe","Subscribe"],["website","Visit Website"],["custom","Custom Link"]];
const PENDING="cj_owner_tap_pending_v2";
const now=()=>Date.now();
const q=()=>new URLSearchParams(location.search);
function getSavedToken(){try{const v=JSON.parse(localStorage.getItem(PENDING)||"null");return v&&now()-v.at<86400000&&UUID.test(v.token)?v.token:""}catch(_){return ""}}
function remember(token){if(UUID.test(token))localStorage.setItem(PENDING,JSON.stringify({token,at:now()}))}
function clearPending(){localStorage.removeItem(PENDING);sessionStorage.removeItem("cj_activation_pending")}
function wantsOwnerSetup(){return q().has("activate")||q().has("activate_board")||!!getSavedToken()||sessionStorage.getItem("cj_owner_qr_pending")==="1"}
const sleep=t=>new Promise(r=>setTimeout(r,t));
async function client(){for(let i=0;i<40;i++){if(window.sb)return window.sb;await sleep(250)}throw Error("Secure sign-in is not available. Reload and try again.")}
async function user(){const s=await client();return (await s.auth.getUser()).data?.user||null}
function overlay(){
 let n=$("cjOwnerSetupV2");if(n)return n;
 n=document.createElement("div");n.id="cjOwnerSetupV2";
 n.style.cssText="position:fixed;inset:0;z-index:2147483400;background:#f2f6fc;overflow:auto;padding:28px 16px 80px;font:16px -apple-system,BlinkMacSystemFont,Arial,sans-serif;color:#15253c";
 n.innerHTML='<main style="max-width:590px;margin:30px auto;background:white;border-radius:20px;box-shadow:0 12px 35px #102b4c18;padding:24px"><div style="font-size:12px;font-weight:800;letter-spacing:1.3px;color:#3274bd">CREATEJOURNEY · SMARTBOARD</div><h1 id="cjSetupTitle" style="font-size:27px;margin:12px 0"></h1><p id="cjSetupInfo" style="color:#5a6c80;line-height:1.5"></p><div id="cjSetupBody"></div><p id="cjSetupError" role="alert" style="color:#b42318;font-size:14px;min-height:20px"></p></main>';
 document.body.appendChild(n);return n
}
function screen(title,info,html){const n=overlay();$("cjSetupTitle").textContent=title;$("cjSetupInfo").textContent=info;$("cjSetupBody").innerHTML=html;$("cjSetupError").textContent="";n.hidden=false;return n}
const btn=(id,label)=>'<button type="button" id="'+id+'" style="display:block;width:100%;padding:15px;margin-top:16px;border:0;border-radius:12px;background:#1974dc;color:white;font-size:16px;font-weight:750">'+label+'</button>';
const field=(id,label,placeholder,type="text")=>'<label for="'+id+'" style="display:block;margin:16px 0 7px;font-weight:650">'+label+'</label><input id="'+id+'" type="'+type+'" placeholder="'+placeholder+'" style="box-sizing:border-box;width:100%;font-size:16px;padding:12px;border:1px solid #bfcddd;border-radius:10px" />';
function error(e){$("cjSetupError").textContent=String(e?.message||e||"Something went wrong")}
function showSignup(){
 const auth=$("authApp"),onboard=$("onboardingApp");
 if(!auth||!onboard){error("Account screen unavailable. Reload this page.");return}
 // Use the existing authenticated registration flow and validation.
 $("authCreateTab")?.click();$("startCreateAccount")?.click();$("cjRegistrationBoardSkip")?.click();
 $("businessChoice")?.click();$("useContinue")?.click();
 const b=$("accountContinue");if(b)b.textContent="Create Account & Continue to SmartBoard";
}
async function routeOwnerQR(){
 sessionStorage.setItem("cj_owner_qr_pending","1");
 try{if(await user()){await awaitTap();return}}catch(_){}
 showSignup();
}
async function awaitTap(){
 screen("Now Tap Your SmartBoard","Your account is ready. Hold your phone near the NFC area of your physical SmartBoard. Open the link that appears. Your board will then ask for its private owner code.",
 '<p style="background:#ecf5ff;border-radius:12px;padding:15px;line-height:1.5">Keep this page available. You may use the same phone or another phone signed in to your owner account.</p>'+
 field("cjTappedLink","Or paste the NFC link","https://.../?board=...","url")+
 btn("cjUseTappedLink","Continue with Tapped Board"));
 $("cjUseTappedLink").onclick=async()=>{
  try{const u=new URL($("cjTappedLink").value.trim());const token=u.searchParams.get("board");if(!token||!UUID.test(token))throw Error("Use the permanent SmartBoard NFC link containing its board token.");remember(token);await beginClaim(token)}
  catch(e){error(e)}
 };
}
async function beginClaim(token){
 remember(token);
 try{if(!await user()){showSignup();return}}catch(e){showSignup();return}
 screen("Verify Your SmartBoard","Enter the one letter and six digits printed on the board's private activation label. This code must match the board you just tapped.",
 field("cjOwnerPrivateCode","Owner activation code","A123456")+
 btn("cjVerifyOwnerCode","Verify & Connect SmartBoard"));
 $("cjOwnerPrivateCode").maxLength=7;
 $("cjOwnerPrivateCode").addEventListener("input",e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"")});
 $("cjVerifyOwnerCode").onclick=async()=>{
  const code=$("cjOwnerPrivateCode").value.trim().toUpperCase();
  if(!/^[A-Z][0-9]{6}$/.test(code)){error("Enter exactly one letter followed by six digits.");return}
  const b=$("cjVerifyOwnerCode");b.disabled=true;b.textContent="Verifying…";
  try{
   const s=await client();const r=await s.rpc("cj_claim_tapped_board",{p_public_token:token,p_owner_code:code});
   if(r.error)throw r.error;if(!r.data?.success)throw Error(r.data?.error||"Unable to verify this board.");
   await start(r.data.board_number,"",true,token);
  }catch(e){error(e)}finally{b.disabled=false;b.textContent="Verify & Connect SmartBoard"}
 };
}
function rows(){
 const body=$("cjSetupRows");body.innerHTML="";
 TYPES.forEach(([type,label],i)=>{
  const row=document.createElement("div");row.dataset.type=type;row.style.cssText="border:1px solid #dce5f0;border-radius:12px;margin:9px 0;padding:12px";
  row.innerHTML='<label style="display:flex;align-items:center;gap:9px;font-weight:700"><input type="checkbox" class="cjEnable" style="width:20px;height:20px" '+(i<3?"checked":"")+' />'+label+'</label><div class="cjDetails">'+field("cjLink"+type,"Destination HTTPS URL","https://...","url")+'<div style="display:flex;gap:8px;margin-top:9px"><button type="button" data-dir="up" style="padding:9px;flex:1">↑ Earlier</button><button type="button" data-dir="down" style="padding:9px;flex:1">↓ Later</button></div></div>';
  const check=row.querySelector(".cjEnable"),details=row.querySelector(".cjDetails");
  function toggle(){details.hidden=!check.checked;const count=body.querySelectorAll(".cjEnable:checked").length;if(count>3){check.checked=false;details.hidden=true;error("Choose a maximum of three actions.");return}$("cjSetupError").textContent=""}
  check.onchange=toggle;
  row.addEventListener("click",e=>{const b=e.target.closest("[data-dir]");if(!b)return;const other=b.dataset.dir==="up"?row.previousElementSibling:row.nextElementSibling;if(other)body.insertBefore(b.dataset.dir==="up"?row:other,b.dataset.dir==="up"?other:row)});
  body.appendChild(row);toggle();
 });
}
async function start(number,code,alreadyClaimed,token){
 if(!/^CJ-[A-Z0-9-]+$/i.test(String(number||"")))throw Error("Board identity is invalid.");
 const s=await client();if(!await user())throw Error("Sign in before activating your SmartBoard.");
 if(!alreadyClaimed){const r=await s.rpc("cj_claim_board_verified",{p_board_number:number,p_activation_code:code});if(r.error)throw r.error;if(!r.data?.success)throw Error("The board could not be claimed")}
 if(!token)token=getSavedToken();
 screen("Build Your Customer Journey","Choose 1–3 actions, arrange their order, and enter each HTTPS destination. Only published actions will appear to customers.",
 '<div id="cjSetupRows"></div>'+field("cjOwnerBoardName","SmartBoard name (optional)","Front Desk")+
 btn("cjPublishNewJourney","Publish Customer Journey"));
 rows();
 $("cjPublishNewJourney").onclick=async()=>{
  const selections=[...$("cjSetupRows").children].filter(row=>row.querySelector(".cjEnable").checked);
  if(selections.length<1||selections.length>3){error("Choose between one and three actions.");return}
  const actions=[];
  for(const row of selections){
   const link=row.querySelector('input[type="url"]').value.trim();
   try{const u=new URL(link);if(u.protocol!=="https:"||!u.hostname)throw Error()}catch(_){error("Enter a complete HTTPS URL for every selected action.");return}
   actions.push({type:row.dataset.type,url:link});
  }
  const b=$("cjPublishNewJourney");b.disabled=true;b.textContent="Publishing…";
  try{
   const r=await s.rpc("cj_publish_claimed_board_journey",{p_board_number:number,p_actions:actions,p_board_name:$("cjOwnerBoardName").value.trim()||null});
   if(r.error)throw r.error;if(r.data?.success!==true)throw Error("The backend did not confirm publication.");
   const published=r.data.public_id;if(!UUID.test(published))throw Error("Published, but the permanent board identity could not be verified.");
   const publicURL=location.origin+location.pathname+"?board="+encodeURIComponent(published);
   // Confirm actual anonymous/public read-back, not just an owner-side write.
   const response=await fetch(window.SUPABASE_URL+"/functions/v1/journey-public",{
    method:"POST",headers:{"apikey":window.SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({action:"resolve_board",board_id:published})
   });
   const snapshot=await response.json();
   if(!response.ok||!snapshot?.board||actions.some((a,i)=>snapshot.board.actions?.[i]!==a.type||snapshot.board.destinations?.[a.type]!==a.url))throw Error("Saved to Supabase, but public Journey verification failed. Do not finish setup until this is resolved.");
   clearPending();sessionStorage.removeItem("cj_owner_qr_pending");
   showTest(number,publicURL,actions);
  }catch(e){error(e)}finally{b.disabled=false;b.textContent="Publish Customer Journey"}
 };
}
function showTest(number,url,actions){
 screen("Test Your SmartBoard","Your Journey is published and verified through the public backend. Now physically tap the SmartBoard with your phone to check the real customer experience.",
 '<p style="background:#e8f7ef;border-radius:10px;padding:13px;color:#176542">Published: '+actions.map(x=>x.type).join(" → ")+'</p>'+
 '<p style="overflow-wrap:anywhere;font-size:13px">Permanent customer URL: <a id="cjPublicTestLink" target="_blank" rel="noopener" href="#"></a></p>'+
 '<label style="display:flex;gap:10px;margin-top:18px;align-items:flex-start"><input id="cjConfirmTap" type="checkbox" style="margin-top:4px;width:20px;height:20px">I physically tapped the board and confirmed the correct Journey opens on my phone.</label>'+
 btn("cjFinishOwnerSetup","Continue to Business Setup"));
 $("cjPublicTestLink").href=url;$("cjPublicTestLink").textContent="Open published Journey";
 $("cjFinishOwnerSetup").disabled=true;
 $("cjConfirmTap").onchange=()=>{$("cjFinishOwnerSetup").disabled=!$("cjConfirmTap").checked};
 $("cjFinishOwnerSetup").onclick=()=>{
  overlay().hidden=true;
  if(typeof window.openAiBusinessSetup==="function")window.openAiBusinessSetup();
  else if(typeof window.openDashboard==="function")window.openDashboard();
  else error("Business setup is unavailable. Reload and sign in.");
 };
}
async function routeTap(token){
 if(!UUID.test(token))return false;
 let state=null;
 try{
  const r=await fetch(window.SUPABASE_URL+"/rest/v1/rpc/cj_tap_board_state",{
   method:"POST",headers:{"apikey":window.SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({p_public_token:token})
  });
  if(!r.ok)throw Error("Board status lookup failed");
  state=await r.json();
 }catch(e){console.error("Tap routing unavailable",e);return false}
 if(state==="active")return false;
 if(state!=="unclaimed")return false;
 await beginClaim(token);return true;
}
async function postSignup(){
 const token=getSavedToken();if(token){await beginClaim(token);return}
 if(wantsOwnerSetup()){await awaitTap();return}
}
function prefill(){const p=q();if(p.has("activate")||p.has("activate_board"))sessionStorage.setItem("cj_owner_qr_pending","1")}
window.CJBoardActivationWizard={start,prefill,wantsOwnerSetup,routeOwnerQR,routeTap,postSignup,awaitTap,beginClaim,pending:()=>null};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",prefill,{once:true});else prefill();
})();