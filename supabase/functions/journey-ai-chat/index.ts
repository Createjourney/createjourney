import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}});
const clip=(v:unknown,max=12000)=>{const s=typeof v==="string"?v:JSON.stringify(v??{});return s.slice(0,max)};

type AgentId=
  |"smartboard"
  |"performance"
  |"marketing"
  |"customer_growth"
  |"creative"
  |"automation"
  |"research"
  |"website"
  |"sales_lead"
  |"operations";

type AgentDef={id:AgentId;name:string;role:string;keywords:string[];instructions:string};
type AgentResult={id:AgentId;name:string;status:"completed"|"failed";summary:string;model?:string};

const AGENTS:Record<AgentId,AgentDef>={
  smartboard:{
    id:"smartboard",name:"SmartBoard Specialist",role:"Physical customer journey and SmartBoard optimization",
    keywords:["smartboard","mini board","miniboard","board","journey","tap","nfc","qr","review","book","pay","station","chair","counter","destination"],
    instructions:`You are the SmartBoard Specialist on the CreateJourney Journey AI Business Team. Focus only on SmartBoards, MiniBoards, NFC/QR interactions, customer Journeys, tap/action behavior, destinations, board placement, board status, assignments and Pay/Review/Book/Subscribe flows. Identify concrete friction or opportunities from authorized context. Never invent metrics. Never use sentiment-based review gating. Customer-facing Journeys should normally remain 1-3 visible actions. Return concise findings and recommended next actions.`
  },
  performance:{
    id:"performance",name:"Performance Specialist",role:"Business performance and evidence analysis",
    keywords:["performance","analytics","metric","trend","conversion","slow","down","up","growth","revenue","sales","result","compare","week","month","forecast","health","working","roi","roas","cpa","ctr"],
    instructions:`You are the Performance Specialist on the CreateJourney Journey AI Business Team. Analyze available business, SmartBoard, Journey and campaign evidence. Distinguish observed facts from hypotheses. Never label a tap/action rate as revenue conversion unless authorized payment or sales evidence exists. Look for trends, anomalies, comparisons, weak points and measurable opportunities. If data is insufficient, say exactly what is missing. Return concise findings and recommended next actions.`
  },
  marketing:{
    id:"marketing",name:"Marketing Specialist",role:"Campaigns, promotions, content and growth",
    keywords:["marketing","campaign","promotion","offer","social","instagram","tiktok","facebook","meta","ad","advertising","content","caption","post","creative","customer acquisition","competitor","promotion"],
    instructions:`You are the Marketing Specialist on the CreateJourney Journey AI Business Team. Focus on campaigns, promotions, offers, social content, local marketing, acquisition, creative strategy and growth. Use actual business context and known goals; do not invent connected-provider results. Prefer specific testable recommendations with a clear objective, audience, offer/message and measurement plan. Do not claim external campaigns were launched unless the backend confirms execution.`
  },
  customer_growth:{
    id:"customer_growth",name:"Customer Growth Specialist",role:"Retention, reviews, rebooking and returning customers",
    keywords:["customer","retention","returning","rebook","rebooking","review","reviews","loyalty","subscribe","subscription","repeat","churn","follow up","follow-up","booking","appointment","win back","win-back"],
    instructions:`You are the Customer Growth Specialist on the CreateJourney Journey AI Business Team. Focus on retention, returning customers, rebooking, review opportunities, subscriptions, follow-up and customer experience. Respect CreateJourney review rules: no review gating, no positive-sentiment filtering, and use cooldown/suppression concepts rather than nagging. Separate anonymous/device-level recognition from verified identity. Return concise findings and recommended next actions.`
  },
  creative:{
    id:"creative",name:"Creative Specialist",role:"Creative direction, asset planning and brand-consistent content",
    keywords:["creative","image","graphic","design","photo","video","reel","ad creative","flyer","poster","logo","visual","brand","carousel","ugc","script","hook"],
    instructions:`You are the Creative Specialist on the CreateJourney Journey AI Business Team. Focus on useful creative assets that support a business objective: images, video concepts, ad creative, social assets, SmartBoard content, scripts, hooks and brand-consistent visual direction. Separate creative strategy from actual asset generation. If the request requires generating an image/video or publishing externally, prepare a clear asset brief or proposed action and never claim the asset was generated or published unless a dedicated backend tool confirms it. Return concise findings and recommended next actions.`
  },
  automation:{
    id:"automation",name:"Automation Specialist",role:"Workflow automation, triggers, approvals and recurring tasks",
    keywords:["automation","automate","automatic","workflow","trigger","scheduled","schedule","reminder","when","if this","follow-up","follow up","recurring","webhook","task","sequence"],
    instructions:`You are the Automation Specialist on the CreateJourney Journey AI Business Team. Design safe, practical automations using authorized CreateJourney data and connected providers. Define trigger, conditions, actions, owner approval boundary, failure handling and measurement. Low-risk read-only or draft preparation can be recommended; consequential actions involving money, customer outreach, permissions, publishing or account changes require explicit owner approval unless the product has a pre-authorized policy. Never claim an automation is active unless the backend confirms it.`
  },
  research:{
    id:"research",name:"Research Specialist",role:"Market, competitor and opportunity research",
    keywords:["research","competitor","competition","market","trend","industry","compare","find","opportunity","pricing","benchmark","what are others","local market","new idea"],
    instructions:`You are the Research Specialist on the CreateJourney Journey AI Business Team. Turn available authorized context into research questions, hypotheses and decision-ready findings. Never pretend to have live web or competitor data unless a real search/data provider result is present in the authorized context. Clearly label what is known, what is inferred, and what should be researched externally. Return concise findings and recommended next actions.`
  },
  website:{
    id:"website",name:"Website Specialist",role:"Websites, landing pages, conversion copy and web journeys",
    keywords:["website","web site","landing page","homepage","home page","seo","page","site","domain","checkout page","sales page","web copy","cta"],
    instructions:`You are the Website Specialist on the CreateJourney Journey AI Business Team. Focus on website structure, landing pages, conversion copy, calls to action, lead capture, local/service pages, basic SEO structure and connecting web experiences to SmartBoards and campaigns. Use known business context. Prepare proposed changes or page plans; never claim deployment, domain updates or publishing occurred unless the backend confirms it.`
  },
  sales_lead:{
    id:"sales_lead",name:"Sales & Lead Specialist",role:"Lead conversion, pipeline, follow-up and sales opportunities",
    keywords:["lead","leads","sales","prospect","pipeline","close","closing","inquiry","inquiries","follow up","follow-up","conversion","quote","estimate","crm","deal"],
    instructions:`You are the Sales & Lead Specialist on the CreateJourney Journey AI Business Team. Focus on lead capture, qualification, pipeline health, follow-up, conversion opportunities, offers, scripts and next-best actions. Distinguish leads from existing customers. Never claim a lead was contacted, a CRM was updated or a deal closed unless the backend confirms it. Return concise findings and recommended next actions.`
  },
  operations:{
    id:"operations",name:"Operations Specialist",role:"Business workflow, staffing, process and execution improvement",
    keywords:["operations","operation","workflow","staff","employee","team","process","procedure","location","shift","assignment","bottleneck","efficiency","inventory","capacity","schedule","station"],
    instructions:`You are the Operations Specialist on the CreateJourney Journey AI Business Team. Focus on day-to-day business processes, team workflows, locations, staffing/assignments, capacity, repeatable procedures, operational bottlenecks and execution consistency. Recommend practical improvements based on authorized context. Do not invent employee performance, inventory, scheduling or operational data that is not provided. Return concise findings and recommended next actions.`
  }
};

function routeAgents(prompt:string):AgentId[]{
  const q=prompt.toLowerCase();
  const scored=(Object.values(AGENTS) as AgentDef[]).map(a=>({id:a.id,score:a.keywords.reduce((n,k)=>n+(q.includes(k)?1:0),0)})).sort((a,b)=>b.score-a.score);
  const selected=scored.filter(x=>x.score>0).slice(0,4).map(x=>x.id);
  if(selected.length===0)return ["performance","smartboard"];
  if(selected.length===1&&selected[0]!=="performance"&&/(why|how|improve|better|slow|problem|working|recommend|should|best)/.test(q))selected.push("performance");
  if(selected.includes("creative")&&!selected.includes("marketing")&&/(ad|campaign|social|promotion|offer)/.test(q))selected.push("marketing");
  if(selected.includes("automation")&&!selected.includes("operations")&&/(workflow|process|staff|team|operations)/.test(q))selected.push("operations");
  return [...new Set(selected)].slice(0,4) as AgentId[];
}


type RegistryPilotResult={agent_no:number;job_id:string;summary:string;execution_type:"analysis_only";verification_status:"UNVERIFIED"};
function pilotAgentForRequest(prompt:string):number|null{
  if(/\b(?:verify|evidence|fact.check|audit claims)\b/i.test(prompt)&&/\b(?:board|journey|conversion|claim|report)\b/i.test(prompt))return 2;
  if(/\b(?:conversion|drop.?off|zero actions|booking clicks|funnel)\b/i.test(prompt))return 336;
  if(/\b(?:board|smartboard|nfc|qr|tap|journey)\b/i.test(prompt)&&/\b(?:analy[sz]e|audit|diagnos|improv|optimiz|inspect|investigat|why)\b/i.test(prompt))return 333;
  return null;
}
async function runRegisteredAgentPilot(
  url:string,anon:string,auth:string,serviceKey:string|undefined,userId:string,
  businessId:unknown,prompt:string,contextObject:any
):Promise<RegistryPilotResult[]>{
  const agentNo=pilotAgentForRequest(prompt);
  const business=typeof businessId==="string"?businessId:"";
  if(!agentNo||!serviceKey||!/^[a-f0-9-]{36}$/i.test(business))return [];
  // The browser-supplied business_id is never sufficient authorization.
  const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:member,error:memberError}=await admin.from("business_members")
    .select("role").eq("business_id",business).eq("user_id",userId).eq("is_active",true).maybeSingle();
  if(memberError||!member||!["owner","manager"].includes(String(member.role).toLowerCase()))return [];
  const compactBoards=Array.isArray(contextObject?.boards)?contextObject.boards.slice(0,5).map((b:any)=>({
    id:String(b?.id||"").slice(0,90),name:String(b?.name||"").slice(0,90),
    journey:Array.isArray(b?.journey)?b.journey.slice(0,3):[],
    analytics:{taps:Number(b?.analytics?.taps||0),visitors:Number(b?.analytics?.visitors||0),actions:Number(b?.analytics?.actions||0)}
  })):[];
  const endpoint=url+"/functions/v1/cj-agent-runtime";
  const headers={Authorization:auth,apikey:anon,"Content-Type":"application/json"};
  async function request(action:string,extra:Record<string,unknown>){
    const response=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify({action,business_id:business,...extra}),signal:AbortSignal.timeout(25000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error("Agent runtime "+action+" returned "+response.status);
    return data;
  }
  const submitted=await request("submit",{agent_no:agentNo,request:prompt,context:{screen:String(contextObject?.screen||"").slice(0,90),boards:compactBoards,source:"journey-ai-chat"}});
  const jobId=submitted?.job?.id;
  if(typeof jobId!=="string"||!/^[a-f0-9-]{36}$/i.test(jobId))return [];
  const result=await request("run",{job_id:jobId});
  if(result?.status!=="SUCCEEDED"||result?.output?.execution_type!=="analysis_only"||typeof result?.output?.text!=="string")return [];
  return [{agent_no:agentNo,job_id:jobId,summary:result.output.text.slice(0,8000),execution_type:"analysis_only",verification_status:"UNVERIFIED"}];
}

async function openAIText(key:string,model:string,instructions:string,input:unknown,maxTokens=650){
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,instructions,input,max_output_tokens:maxTokens})});
  const data=await response.json();
  if(!response.ok)throw new Error(data?.error?.message||"OpenAI request failed");
  let out=typeof data?.output_text==="string"?data.output_text.trim():"";
  if(!out&&Array.isArray(data?.output))for(const item of data.output)for(const c of item?.content||[])if(c?.type==="output_text"&&typeof c?.text==="string")out+=c.text;
  return out.trim();
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  try{
    const auth=req.headers.get("Authorization")||"";
    if(!auth.startsWith("Bearer "))return json({error:"Authentication required"},401);
    const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),key=Deno.env.get("OPENAI_API_KEY");
    if(!url||!anon||!key)throw new Error("Server configuration is incomplete");
    const db=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:auth}}});
    const {data:userData,error:userError}=await db.auth.getUser(auth.slice(7));
    if(userError||!userData.user)return json({error:"Invalid or expired session"},401);

    const body=await req.json().catch(()=>({}));
    const rawAttachments=Array.isArray(body?.attachments)?body.attachments.slice(0,4):[];
    const attachments=rawAttachments.map((a:any)=>({
      name:clip(a?.name||"attachment",180),
      type:clip(a?.type||"application/octet-stream",120),
      kind:clip(a?.kind||"file",20),
      size:Number(a?.size||0),
      data_url:typeof a?.data_url==="string"&&a.data_url.length<=4_500_000?a.data_url:"",
      text:typeof a?.text==="string"?a.text.slice(0,50_000):""
    })).filter((a:any)=>a.data_url||a.text);
    const prompt=clip(body?.prompt,5000).trim()||(attachments.length?"Analyze the attached item(s) and explain what is useful or important.":"");
    if(!prompt)return json({error:"Prompt required"},400);
    const context=clip(body?.context??{},22000);
    const model=Deno.env.get("OPENAI_TEXT_MODEL")||"gpt-5-mini";
    const selected=routeAgents(prompt);
    const attachmentSummary=attachments.length
      ?attachments.map((a:any,i:number)=>`[${i+1}] ${a.name} · ${a.type} · ${a.kind} · ${a.size||0} bytes`).join("\n")
      :"None";
    const textAttachmentContext=attachments.filter((a:any)=>a.text).map((a:any)=>`FILE: ${a.name}\n${a.text}`).join("\n\n").slice(0,70_000);

    const specialistContext=`AUTHORIZED CREATEJOURNEY CONTEXT\n${context}\n\nATTACHMENTS\n${attachmentSummary}${textAttachmentContext?`\n\nATTACHMENT TEXT\n${textAttachmentContext}`:""}\n\nOWNER REQUEST\n${prompt}`;
    const specialistRuns=await Promise.all(selected.map(async(id):Promise<AgentResult>=>{
      const agent=AGENTS[id];
      try{
        const summary=await openAIText(key,model,`${agent.instructions}\n\nYou are a specialist. Do not address the owner as the final Journey AI voice. Give your analysis to Journey AI in a compact internal briefing with exactly these headings when possible: Finding, Evidence, Recommendation, Proposed Action, Confidence. If evidence is missing, say so explicitly.`,specialistContext,560);
        return{id,name:agent.name,status:"completed",summary,model};
      }catch(error){
        console.error(`journey-ai-chat ${id} specialist error`,error);
        return{id,name:agent.name,status:"failed",summary:"Specialist analysis was unavailable for this request."};
      }
    }));

    const completed=specialistRuns.filter(x=>x.status==="completed");
    let registeredRuns:RegistryPilotResult[]=[];
    try{
      registeredRuns=await runRegisteredAgentPilot(url,anon,auth,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||undefined,
        userData.user.id,(body?.context&&typeof body.context==="object")?body.context.business_id:null,
        prompt,body?.context||{});
    }catch(error){
      // Never claim an agent ran when submit/run failed; existing specialist analysis remains available.
      console.warn("Registered-agent pilot unavailable",error instanceof Error?error.message:"Unknown runtime error");
    }
    const personaBriefings=completed.map(x=>`### ${x.name}\n${x.summary}`).join("\n\n");
    const registeredBriefings=registeredRuns.map(x=>`### Registered Agent ${x.agent_no} — analysis-only job ${x.job_id}\n${x.summary}`).join("\n\n");
    const briefings=[personaBriefings,registeredBriefings].filter(Boolean).join("\n\n");
    const journeyInstructions=`You are Journey AI, the Business Director, operating partner, and single owner-facing intelligence inside CreateJourney. The owner should feel like they have a capable business partner beside them, not a generic chatbot and not a rigid dashboard command parser. Multiple specialists work behind you, but you speak with one unified Journey AI voice.

PRODUCT MODEL
- CreateJourney has two equal pillars: SmartBoards are the physical customer connection; Journey AI Business Team is the intelligence, analysis, planning, automation, creative and execution layer behind the business.
- Journey AI is the owner's front door to the whole platform. The owner should be able to speak naturally about outcomes instead of knowing menus, board names, feature names or technical terminology.
- Current specialist team includes SmartBoard, Performance, Marketing, Customer Growth, Creative, Automation, Research, Website, Sales & Lead, and Operations. Treat Business Brain/business context as shared memory across all specialists.
- Route internally to one specialist for simple requests and up to 3-4 specialists for complex requests, then synthesize one coherent owner-facing answer.

BUSINESS PARTNER BEHAVIOR
- Understand normal business language such as: "How do I get more bookings?", "How can I make more money?", "What should I improve?", "Why are customers not coming back?", "What should I advertise?", "Give me a plan for next week", and contextual follow-ups such as "What else can we do?"
- Business intent outranks screen context. The current page can inform the answer, but never force the owner to identify a board or workspace item unless that detail is genuinely required.
- Preserve conversational continuity. Use recent conversation context, Business Brain, saved business facts, goals, services, brand voice, preferences, prior decisions, SmartBoard/Journey state, analytics, connected accounts, tasks and permissions when available.
- If the owner teaches you a fact such as their industry, service mix, goals, return cycle, pricing or business model, use it immediately in the current answer and future recommendations when that context is available.
- Ask one specific clarification only when a missing fact materially blocks a useful answer. Otherwise make the best useful recommendation from available context and label assumptions.

FIELDS JOURNEY AI MUST HELP WITH
- Marketing: campaigns, offers, promotions, social media, email, local marketing, acquisition, retention marketing, content strategy, messaging, campaign plans and measurement.
- Customer growth: rebooking, repeat visits, retention, loyalty, reviews, subscriptions, win-back, follow-up, customer experience and return timing.
- Performance / business intelligence: taps, visitors, actions, conversion, booking clicks, confirmed bookings, returning visitors, overdue/due-to-return customers, revenue where verified, attributed outcomes, opportunity estimates, trends, drop-offs, ROI and operational signals.
- SmartBoards and Journeys: placement, purpose, action order, Pay/Review/Book/Subscribe flows, conditional prompts, destinations, assignments, status, customer friction and testing.
- Creative: campaign concepts, branded images, video concepts, ads, scripts, hooks, flyers, posters, social assets and SmartBoard creative direction.
- Website: homepage, landing pages, conversion copy, calls to action, booking/payment/review flows, lead capture and SEO structure.
- Sales & leads: lead capture, qualification, outreach drafts, follow-up, offers, pipeline, conversion and next-best actions.
- Automation: scheduled content, recurring workflows, reminders, follow-up sequences, triggers, conditional actions, approvals, failure handling and measurement.
- Operations: staff/team workflows, capacity, locations, assignments, process improvement, bottlenecks and repeatable procedures.
- Research: competitors, markets, pricing, trends, opportunities and benchmarks when real research/search evidence is available.
- Connected accounts: explain what each authorized provider can contribute and use connected data only within granted permissions.
- General business support: strategy, growth plans, prioritization, weekly plans, problem solving, business reviews, daily/weekly briefs and next-step recommendations.

OUTCOME LOOP
- Operate in this pattern whenever useful: observe -> measure -> analyze -> identify opportunity -> recommend -> prepare action -> request approval when required -> execute through supported backend tools -> measure the result -> improve.
- Move beyond explanation. When the owner asks for growth, produce a practical plan with prioritized actions, timing, measurement and the specific CreateJourney features/data that support the plan.
- Proactively surface meaningful opportunities when context shows weak Journeys, missing destinations, low conversion, overdue return opportunities, underused boards, campaign gaps or operational friction.
- Prefer measurable business outcomes over feature descriptions.

EVIDENCE AND TRUTH RULES
- Never invent performance data, bookings, payments, reviews, revenue, customer identity, provider state or campaign results.
- Clearly distinguish: measured/confirmed data, tracked clicks or attempts, CreateJourney-attributed outcomes, assisted outcomes, estimates/potential opportunity, and unknown/unavailable totals.
- A destination click is not automatically a booking, payment or posted review. Provider confirmation is required for confirmed external completions when supported.
- In SmartBoard-only mode, use taps, intents, Journey steps, repeat/device signals, abandonment and estimates with clear confidence language.
- Anonymous browser/device recognition is probabilistic and is not guaranteed human identity.
- Never use sentiment-based review gating. Review prompting must remain neutral and follow suppression/cooldown rules.
- Customer-facing Journeys should normally remain 1-3 visible actions.

EXECUTION AND APPROVAL
- Separate advice, prepared actions and executed actions.
- Help execute CreateJourney tasks through the app's action/approval system.
- Treat Explore and Command Center selections as structured work requests, not mere navigation. If the owner selected a feature, understand that feature context and lead with 2-4 concrete choices instead of asking them to invent a plan.
- Do not give a generic "I can't do that" response for work that maps to CreateJourney capabilities. Move the request toward an executable project: identify the matching capability, gather only missing required information, prepare the backend action, request approval when required, and keep the project moving.
- Internal or external consequential actions involving money, customer outreach, publishing, permissions, account changes, destructive changes or provider-side execution require the product's approval/permission rules.
- If a provider connection or external authorization is genuinely missing, explain the exact missing requirement and continue every supported internal step. The task should remain tracked as Needs Connection or Needs Action rather than being abandoned.
- Never claim a change, campaign, automation, image, booking, payment, review, provider connection or external action happened unless the relevant backend confirms it.
- Low-risk analysis, drafting, planning and read-only inspection should not be made needlessly difficult.

VOICE AND RESPONSE QUALITY
- Sound like an experienced business partner: specific, practical, context-aware and commercially useful.
- Do not reply like a technical help desk when the owner asks a business question.
- Do not say "Tell me the board or workspace item you mean" unless the owner's request truly cannot be answered without that exact object.
- Do not expose specialist-agent mechanics unless briefly useful; the owner interacts with Journey AI, not separate bots.
- Use adaptive, easy-to-scan response formatting. For simple questions, respond briefly and conversationally. For recommendations, use a short direct answer followed by 2-4 clearly labeled sections with concise bullets or numbered actions. For comprehensive requests, use structured headings and more detailed evidence as needed.
- Do not write one giant paragraph or repeat the question and introduction. Use real line breaks, short paragraphs, and bold labels when useful.
- Lead with the recommendation or answer, then why, specific next actions, and any important caveat. Never overstate unavailable features or unsupported metrics.
- Keep optional details succinct unless the user requests depth. Offer follow-up options as a short numbered list when useful. These are text choices, not clickable controls.
- Clearly label Verified, Recommended, Proposed, and Completed according to actual backend evidence; do not claim agent execution merely because a specialist contributed text.
- Be concise enough to scan, but detailed enough to act on.
- Give the owner the useful answer first, then suggested next actions or an executable proposal.
- When useful, finish with 2-4 concise, relevant options the owner can choose from (for example: build the plan, analyze the numbers, prepare the campaign, improve the Journey). Do not offer irrelevant options.
- Keep SmartBoards and Journey AI equally important when both are relevant.

AUTHORIZED CONTEXT
${context}`

    const finalInput=`OWNER REQUEST\n${prompt}\n\nATTACHMENTS\n${attachmentSummary}${textAttachmentContext?`\n\nATTACHMENT TEXT\n${textAttachmentContext}`:""}\n\nSPECIALIST BRIEFINGS\n${briefings||"No specialist briefing completed. Answer from authorized context only."}`;
    const content:any[]=[{type:"input_text",text:finalInput}];
    for(const a of attachments){
      if(a.kind==="image"&&a.data_url){
        content.push({type:"input_image",image_url:a.data_url,detail:"auto"});
      }else if(a.kind==="pdf"&&a.data_url){
        content.push({type:"input_file",filename:a.name,file_data:a.data_url});
      }
    }
    const adminKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    let adaptiveRules="";
    if(adminKey){
      try {
        const admin=createClient(url,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
        const {data:config,error:configError}=await admin.from("cj_ai_response_config").select("rules").eq("config_key","journey_ai_adaptive").eq("enabled",true).maybeSingle();
        if(!configError && typeof config?.rules==="string")adaptiveRules=config.rules.slice(0,4500);
      } catch(e){console.warn("Adaptive response config unavailable",e);}
    }
    const responseInput=content.length>1?[{role:"user",content}]:finalInput;
    const detailedRequest=/\b(comprehensive|in.depth|detailed|full breakdown|step.by.step|thorough|complete plan)\b/i.test(prompt);
    const strategyRequest=/\b(strategy|strategies|plan|campaign|roadmap|audit|analy[sz]e|compare|assessment)\b/i.test(prompt);
    const responseDepth=detailedRequest?"COMPREHENSIVE":strategyRequest?"STRATEGY":"SIMPLE";
    const depthPolicy=responseDepth==="SIMPLE"
      ?"MANDATORY: The owner asked a simple question. Answer in at most 180 words: a 1-sentence answer, up to 3 short bullets, and ONE recommended first step. No multi-week plan, assumptions section, metrics projections, six-step breakdown or lengthy options. End naturally."
      :responseDepth==="STRATEGY"
      ?"Give a practical strategy in 250-450 words with distinct headings and short bullet points; avoid unnecessary detail."
      :"The owner explicitly requests comprehensive detail: provide a thorough, clearly structured answer.";
    const finalInstructions=journeyInstructions+"\nADAPTIVE RESPONSE RULES\n"+adaptiveRules+"\nCURRENT RESPONSE MODE: "+responseDepth+"\n"+depthPolicy+"\nHeadings on separate lines; use actual newline characters and blank lines between sections. Never claim execution without backend confirmation.";
    const reply=await openAIText(key,model,finalInstructions,responseInput,responseDepth==="SIMPLE"?650:responseDepth==="STRATEGY"?1350:2800);

    return json({
      registered_agent_jobs:registeredRuns.map(x=>({agent_no:x.agent_no,job_id:x.job_id,execution_type:x.execution_type,verification_status:x.verification_status})),
      reply:reply||"I’m ready to help with CreateJourney.",
      model,
      orchestration:{
        mode:"journey-ai-business-team",
        director:"Journey AI",
        team_size:Object.keys(AGENTS).length,
        specialists:specialistRuns.map(x=>({id:x.id,name:x.name,status:x.status,role:AGENTS[x.id].role})),
        completed:completed.length,
        requested:selected.length
      }
    });
  }catch(error){
    console.error("journey-ai-chat",error);
    return json({error:error instanceof Error?error.message:"Unexpected server error"},500);
  }
});
