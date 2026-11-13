import assert from "node:assert/strict";

const url=(process.env.CJ_LOCAL_API_URL||"http://127.0.0.1:54321").replace(/\/$/,"");
const anon=process.env.CJ_LOCAL_ANON_KEY||"";
assert.ok(anon,"Local Supabase anon key required");
const sampleBusiness="00000000-0000-4000-8000-000000000001";
const endpoints=[
 ["cj-shopify-integration",{action:"begin",business_id:sampleBusiness,shop:"test.myshopify.com"}],
 ["cj-marketing-oauth",{action:"begin",business_id:sampleBusiness,provider:"gmail"}],
 ["cj-marketing-oauth",{action:"begin",business_id:sampleBusiness,provider:"tiktok"}],
 ["cj-marketing-oauth",{action:"begin",business_id:sampleBusiness,provider:"outlook"}]
];
async function probe(slug,body,auth){
 const response=await fetch(url+"/functions/v1/"+slug,{
  method:"POST",
  headers:{"Content-Type":"application/json","apikey":anon,...(auth?{Authorization:"Bearer "+auth}:{})},
  body:JSON.stringify(body)
 });
 const result=await response.json();
 return {code:response.status,result};
}
async function warmedProbe(slug,body,auth){
 let last=null;
 for(let i=0;i<18;i++){
  try{
   last=await probe(slug,body,auth);
   if(last.code!==502&&last.code!==503)return last;
  }catch(e){last={code:0,result:{error:String(e)}}}
  await new Promise(done=>setTimeout(done,1000));
 }
 throw Error(slug+" did not start for OAuth smoke; last response "+JSON.stringify(last));
}
for(const [slug,body] of endpoints){
 const anonymous=await warmedProbe(slug,body);
 assert.equal(anonymous.code,401,slug+" must reject unauthenticated writes");
 assert.match(JSON.stringify(anonymous.result),/Authentication required/i);
 const invalid=await warmedProbe(slug,body,"deliberately-invalid-token");
 assert.equal(invalid.code,401,slug+" must reject invalid bearer tokens");
}
console.log("PASS marketing OAuth callbacks are not exposed through unauthenticated POST actions");
