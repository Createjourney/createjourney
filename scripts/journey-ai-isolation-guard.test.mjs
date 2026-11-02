import test from "node:test";
import assert from "node:assert/strict";
import {assertIsolatedTestBusiness} from "./journey-ai-isolation-guard.mjs";

const business="11111111-1111-4111-8111-111111111111";
const user="22222222-2222-4222-8222-222222222222";
const base={url:"https://example.supabase.co",anon:"fixture-anon",token:"fixture-user-token",business};

function fixture({environment="test",member=true,boards=[],journeys=[],failPath=""}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
   calls.push({url,method:options.method});
   if(failPath&&url.includes(failPath))return {ok:false,status:403,json:async()=>({})};
   let body;
   if(url.includes("/auth/v1/user"))body={id:user};
   else if(url.includes("/rest/v1/businesses?"))body=[{id:business,data_environment:environment}];
   else if(url.includes("/rest/v1/business_members?"))body=member?[{role:"owner",is_active:true}]:[];
   else if(url.includes("/rest/v1/boards?"))body=boards;
   else if(url.includes("/rest/v1/journeys?"))body=journeys;
   else throw Error("Unexpected request "+url);
   return {ok:true,status:200,json:async()=>body};
 };
 return {fetchImpl,calls};
}

test("read-only preflight accepts empty test business owned by authenticated user",async()=>{
 const f=fixture();
 const result=await assertIsolatedTestBusiness({...base,fetchImpl:f.fetchImpl});
 assert.equal(result.data_environment,"test");
 assert.equal(result.user_id,user);
 assert.equal(f.calls.length,5);
 assert.ok(f.calls.every(c=>c.method==="GET"),"Preflight must never mutate state");
});

test("rejects production business before any write",async()=>{
 const f=fixture({environment:"production"});
 await assert.rejects(assertIsolatedTestBusiness({...base,fetchImpl:f.fetchImpl}),/not explicitly marked/);
 assert.equal(f.calls.length,2);
});

test("rejects missing owner or manager membership",async()=>{
 const f=fixture({member:false});
 await assert.rejects(assertIsolatedTestBusiness({...base,fetchImpl:f.fetchImpl}),/membership required/);
});

test("rejects test business containing boards",async()=>{
 const f=fixture({boards:[{id:"board"}]});
 await assert.rejects(assertIsolatedTestBusiness({...base,fetchImpl:f.fetchImpl}),/contains boards/);
});

test("rejects test business containing journeys",async()=>{
 const f=fixture({journeys:[{id:"journey"}]});
 await assert.rejects(assertIsolatedTestBusiness({...base,fetchImpl:f.fetchImpl}),/contains journeys/);
});

test("rejects inaccessible RLS data instead of assuming isolation",async()=>{
 const f=fixture({failPath:"/rest/v1/businesses?"});
 await assert.rejects(assertIsolatedTestBusiness({...base,fetchImpl:f.fetchImpl}),/authenticated read failed/);
});

test("rejects invalid business ID before network access",async()=>{
 const f=fixture();
 await assert.rejects(assertIsolatedTestBusiness({...base,business:"invalid",fetchImpl:f.fetchImpl}),/invalid business UUID/);
 assert.equal(f.calls.length,0);
});
