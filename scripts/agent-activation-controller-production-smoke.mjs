// Standalone production auth smoke. Never print bearer tokens or request bodies.
const base=process.env.CJ_SUPABASE_URL||"https://pbiivpehdatvmyaxwixk.supabase.co";
const endpoint=base.replace(/\/$/,"")+"/functions/v1/cj-agent-activation-controller";
const anon=process.env.CJ_SUPABASE_ANON_KEY||"";
async function probe(label,token,expected){
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",
  "Authorization":token,"apikey":anon},body:JSON.stringify({action:"overview"}),
  signal:AbortSignal.timeout(12000)});
 const valid=res.status===expected;
 console.log(JSON.stringify({check:label,http:res.status,result:valid?"PASS":"FAIL"}));
 if(!valid)process.exitCode=1;
}
await probe("activation_controller_anonymous_denied","",401);
await probe("activation_controller_invalid_token_denied","Bearer this.is.not.a.valid.jwt",401);
if(process.env.CJ_TEST_ACCESS_TOKEN&&anon){
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",
 "Authorization":"Bearer "+process.env.CJ_TEST_ACCESS_TOKEN,"apikey":anon},
 body:JSON.stringify({action:"activation_plan"}),signal:AbortSignal.timeout(15000)});
 const data=await res.json().catch(()=>({}));
 const ok=res.status===200 && data.status==="READ_ONLY_LIVE" &&
  data.execution_performed===false && data.summary?.registered===607 &&
  Array.isArray(data.pilot_candidates)&&Array.isArray(data.requires_development);
 console.log(JSON.stringify({check:"authenticated_owner_activation_plan",
 http:res.status,result:ok?"PASS":"FAIL",registered:data.summary?.registered??null,
 pilot:data.summary?.pilot_callable_count??null,requires_development:data.unmet_requirements_count??null}));
 if(!ok)process.exitCode=1;
}else console.log(JSON.stringify({check:"authenticated_owner_activation_plan",
 result:"BLOCKED_MISSING_AUTHENTICATED_TEST_CREDENTIALS",
 note:"Owner test must use a legitimate authenticated account."}));
