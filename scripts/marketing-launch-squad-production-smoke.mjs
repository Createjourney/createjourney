// Signed-in owner acceptance is intentionally separate from public JWT denial smoke.
const endpoint=(process.env.CJ_SUPABASE_URL||"https://pbiivpehdatvmyaxwixk.supabase.co").replace(/\/$/,"")+"/functions/v1/cj-marketing-launch-squad";
const anon=process.env.CJ_SUPABASE_ANON_KEY||"";
async function check(label,token,expected){
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",
 "Authorization":token,"apikey":anon},body:JSON.stringify({action:"readiness",brand_name:"Flourished Images"}),
 signal:AbortSignal.timeout(12000)});
 const okay=res.status===expected;
 console.log(JSON.stringify({check:label,http:res.status,result:okay?"PASS":"FAIL"}));
 if(!okay)process.exitCode=1;
}
await check("marketing_anonymous_denied","",401);
await check("marketing_forged_token_denied","Bearer invalid.jwt.for-testing",401);
if(process.env.CJ_TEST_ACCESS_TOKEN&&anon){
 const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",
 "Authorization":"Bearer "+process.env.CJ_TEST_ACCESS_TOKEN,"apikey":anon},
 body:JSON.stringify({action:"readiness",brand_name:"Flourished Images"}),signal:AbortSignal.timeout(15000)});
 const data=await res.json().catch(()=>({}));
 const okay=res.status===200&&data.status==="LIVE_MARKETING_SQUAD_READINESS" &&
 data.execution_performed===false&&data.specialist_agents?.length===4&&data.marketing_live_publishing_implemented===false;
 console.log(JSON.stringify({check:"marketing_authenticated_owner_readiness",http:res.status,result:okay?"PASS":"FAIL"}));
 if(!okay)process.exitCode=1;
}else console.log(JSON.stringify({check:"marketing_authenticated_owner_readiness",
 result:"BLOCKED_MISSING_AUTHENTICATED_TEST_CREDENTIALS"}));
