/* CreateJourney — Journey AI Discovery + Creative Chat Routing
   Loaded after the main inline application script.
*/
(function(){
'use strict';

let discoveryMode = '';

const originalHandleAiPrompt = window.handleAiPrompt;
const originalOpenAI = window.openAI;


/* =========================================================
   #01 DISCOVERY STYLES
   ========================================================= */

function injectStyles(){

  if(document.getElementById('cjJourneyAiDiscoveryStyles')) return;

  const style = document.createElement('style');

  style.id = 'cjJourneyAiDiscoveryStyles';

  style.textContent = `

    .ai-chip.discovery-primary{
      background:#e7f1ff;
      color:#2f6fc2;
      font-weight:750;
    }

    .ai-chat-creative{
      max-width:96%;
      width:96%;
    }

    .ai-chat-image-grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:7px;
      margin-top:3px;
    }

    .ai-chat-image-grid.one{
      grid-template-columns:1fr;
    }

    .ai-chat-image-grid img{
      width:100%;
      aspect-ratio:1/1;
      object-fit:cover;
      border-radius:10px;
      display:block;
      border:1px solid #e3e9f1;
    }

  `;

  document.head.appendChild(style);
}


/* =========================================================
   #02 JOURNEY AI DISCOVERY SHORTCUTS
   ========================================================= */

function shortcutButtons(){

  const base = [

    {
      label:'Image',
      prompt:'Image',
      primary:true
    },

    {
      label:'About CreateJourney',
      prompt:'About CreateJourney',
      primary:true
    },

    {
      label:'Journey AI',
      prompt:'Journey AI',
      primary:true
    },

    {
      label:'What can I do?',
      prompt:'What can I do?',
      primary:true
    },

    {
      label:'Show me something cool',
      prompt:'Show me something cool',
      primary:true
    }

  ];

  const context = String(
    typeof currentScreenContext === 'function'
      ? currentScreenContext()
      : ''
  ).toLowerCase();

  const extras = [];

  const add = (label,prompt=label)=>{

    if(
      !base.some(x=>x.label===label) &&
      !extras.some(x=>x.label===label)
    ){
      extras.push({label,prompt});
    }

  };


  if(context.includes('dashboard')){

    add('SmartBoards');

    add('Analytics');

    add('Improve my setup');

  }

  else if(context.includes('journey ai')){

    add('Business Brain');

    add('Marketing');

    add('Automations');

    add('Connected Accounts');

  }

  else if(context.includes('board')){

    add('Journeys');

    add('SmartBoards');

    add(
      'How do I use this page?',
      'How do I use this page?'
    );

  }

  else{

    add('Grow my business');

    add('Ideas for me');

    add(
      'How do I use this page?',
      'How do I use this page?'
    );

  }


  try{

    if(!(aiBusinessBrain?.facts||[]).length){

      add('Business Brain');

    }

  }catch(_){

    add('Business Brain');

  }


  return [...base,...extras].slice(0,9);

}



function renderShortcuts(){

  const row =
    document.querySelector(
      '#journeyAiPanel .ai-quick'
    );

  if(!row) return;

  row.innerHTML = '';

  row.setAttribute(
    'aria-label',
    'Journey AI shortcuts'
  );


  shortcutButtons().forEach(x=>{

    const button =
      document.createElement('button');

    button.className =
      'ai-chip' +
      (x.primary ? ' discovery-primary' : '');

    button.type = 'button';

    button.dataset.prompt = x.prompt;

    button.textContent = x.label;

    button.addEventListener(
      'click',
      ()=>window.handleAiPrompt(x.prompt)
    );

    row.appendChild(button);

  });

}


/* =========================================================
   #03 NORMALIZE USER REQUEST
   ========================================================= */

function keyOf(value){

  return String(value||'')

    .toLowerCase()

    .replace(/[?!.]+$/g,'')

    .replace(/\s+/g,' ')

    .trim();

}


/* =========================================================
   #04 CREATEJOURNEY DISCOVERY KNOWLEDGE
   ========================================================= */

function discoveryResponse(key){

  let boardCount = 0;

  let connected = 0;


  try{

    boardCount =
      Array.isArray(boards)
        ? boards.length
        : 0;

  }catch(_){}


  try{

    connected =
      (connectedAccounts||[])
      .filter(x=>x.status==='connected')
      .length;

  }catch(_){}


  const responses = {


    'about createjourney':

      'CreateJourney connects physical NFC/QR SmartBoards to configurable customer Journeys. A tap can guide someone through simple actions such as Pay, Review, Book, Subscribe, Social, Website, Deals or custom links. Owners can manage boards, Journeys, team permissions, analytics, connected services and Journey AI from one workspace. Each board keeps a permanent platform identity while its purpose and Journey can change without rewriting the NFC tag.',


    'createjourney':

      'CreateJourney connects physical NFC/QR SmartBoards to configurable customer Journeys. A tap can guide someone through Pay, Review, Book, Subscribe, Social, Website, Deals or custom links, while the business manages boards, Journeys, team access, analytics and Journey AI from one workspace.',


    'journey ai':

      'Journey AI is the operating copilot inside CreateJourney. You can use voice or text, teach it your Business Brain, create images, organize conversations and decisions, inspect boards and Journeys, prepare marketing work, surface opportunities, analyze performance, and prepare approved operational actions using saved business context.',


    'what can i do':

      `You can ask me to explain CreateJourney, create an image, inspect your ${boardCount} visible board${boardCount===1?'':'s'}, explain or improve Journeys, review analytics, work with Business Brain, prepare marketing ideas, or explain the current page. As connected services come online, I can also help coordinate approved external actions and automations.`,


    'smartboards':

      'SmartBoards are physical NFC/QR entry points into CreateJourney. Each board has a permanent platform identity, can be assigned to a business, location or person, and can be reconfigured with a different Journey without rewriting the NFC tag. Owners can rename, pause, reassign and manage boards from the dashboard.',


    'journeys':

      'A Journey is the short customer flow behind a SmartBoard, usually 1–3 useful actions such as Pay → Review → Book. CreateJourney can conditionally remove or substitute optional prompts for returning visitors so the experience stays relevant instead of repeatedly nagging them.',


    'grow my business':

      'I can help use CreateJourney data and your Business Brain to improve SmartBoard placement, simplify weak Journeys, create promotional images and content, identify missing destinations, compare performance, prepare campaigns and recommend follow-up actions. I should distinguish measured data from suggestions instead of inventing results.',


    'marketing':

      'Journey AI marketing is designed for branded content, campaign concepts, social, website and email drafts, image generation, content planning and performance follow-up. It uses Business Brain, brand rules, services and saved preferences so the work stays consistent.',


    'automations':

      'CreateJourney automation is designed for repeatable workflows such as scheduled content, follow-up tasks and operational routines. Low-risk workflows can eventually run under defined permissions, while consequential external actions remain approval-gated.',


    'analytics':

      `CreateJourney analytics are meant to show taps, visitors, actions, Journey performance and business-level trends. Your current workspace shows ${boardCount} visible board${boardCount===1?'':'s'}. Journey AI can use confirmed analytics to identify opportunities without inventing live performance data.`,


    'connected accounts':

      `Connected Accounts lets CreateJourney securely connect outside providers so Journey AI can work with authorized data or prepare actions. You currently have ${connected} connected provider${connected===1?'':'s'} recorded in this workspace. Provider permissions are meant to stay explicit and revocable.`,


    'business brain':

      "Business Brain is Journey AI's structured knowledge about your business: what you do, services, goals, brand voice, colors, differentiators, preferences, important facts and decisions. The more accurate it is, the less generic Journey AI's recommendations and creative work become.",


    'ideas for me':

      'A useful start is to complete Business Brain, verify every active Journey destination, then use Journey AI to create one customer-facing improvement and one marketing asset. After real activity accumulates, compare which boards and Journey steps actually perform before scaling a tactic.',


    'improve my setup':

      'First verify Business Brain, every active SmartBoard destination, board assignments, and that each customer Journey stays to the fewest useful actions. Then test the physical NFC/QR flow from a clean phone before optimizing analytics or automation.',


    'show me something cool':

      'Try Image: describe a branded promotion in plain English. Journey AI can combine the request with your Business Brain, create visual variations, save them into Journey Library, and keep the work attached to your business context. You can also use voice to ask about boards or navigate the workspace.'

  };


  if(
    key === 'how do i use this page' &&
    typeof explainCurrentPage === 'function'
  ){

    return explainCurrentPage();

  }


  return responses[key] || null;

}


/* =========================================================
   #05 IMAGE REQUEST DETECTION
   ========================================================= */

function looksLikeImageRequest(text){

  if(discoveryMode === 'image'){

    return true;

  }


  const create =

    /(^|\b)(create|make|generate|design|draw|produce|build)(\b|$)/i

    .test(text);


  const visual =

    /(^|\b)(image|picture|photo|graphic|poster|flyer|artwork|visual|instagram post|social media post|social post|ad creative)(\b|$)/i

    .test(text);


  return create && visual;

}


/* =========================================================
   #06 DISPLAY GENERATED IMAGES IN CHAT
   ========================================================= */

function addCreativeAssetsMessage(
  assets,
  text,
  voiceReply=false
){

  addAiMessage(
    'ai',
    text,
    null,
    voiceReply
  );


  const message =
    document.createElement('div');

  message.className =
    'msg ai ai-chat-creative';


  const grid =
    document.createElement('div');

  grid.className =
    'ai-chat-image-grid' +
    (assets.length===1 ? ' one' : '');


  assets.slice(0,8).forEach(asset=>{

    const img =
      document.createElement('img');

    img.src = asset.url;

    img.alt =
      asset.name ||
      'Journey AI generated image';

    img.loading = 'lazy';

    grid.appendChild(img);

  });


  message.appendChild(grid);


  el('aiThread').appendChild(message);


  el('aiThread').scrollTop =
    el('aiThread').scrollHeight;

}


/* =========================================================
   #07 GENERATE IMAGE THROUGH JOURNEY AI
   ========================================================= */

async function generateFromChat(
  prompt,
  voiceReply=false
){

  let count = 4;


  try{

    count = Math.max(
      1,
      Math.min(
        8,
        Number(
          aiCreativePreferences?.variationCount || 4
        )
      )
    );

  }catch(_){}


  const lower =
    String(prompt||'').toLowerCase();


  const purpose =

    /instagram|social/.test(lower)

      ? 'social_post'

      : /flyer/.test(lower)

      ? 'flyer'

      : /poster/.test(lower)

      ? 'poster'

      : 'promotion';


  const aspect =

    /story|vertical|9:16/.test(lower)

      ? '9:16'

      : /landscape|16:9/.test(lower)

      ? '16:9'

      : '1:1';


  const job = {

    id:
      'aicr_chat_' +
      Date.now() +
      '_' +
      Math.random()
      .toString(36)
      .slice(2,7),

    prompt,

    purpose,

    aspect,

    status:'Generating',

    createdAt:
      new Date().toISOString(),

    brand:
      aiCreativeBrandContext(),

    variationCount:count

  };


  aiCreativeJobs.unshift(job);


  persistLocalState();


  addAiMessage(

    'ai',

    `Creating ${count} image variation${count===1?'':'s'} using your Business Brain and creative preferences...`,

    null,

    voiceReply

  );


  try{


    const result =
      await aiCreativeBackendRequest({

        prompt,

        purpose,

        aspect_ratio:aspect,

        variation_count:count,

        brand_context:{

          ...job.brand,

          business_brain:
            businessBrainSummary(),

          creative_preferences:
            aiCreativePreferences

        },

        reference_asset_ids:[

          aiBusinessProfile
          ?.brandLogoServerAssetId

        ].filter(Boolean)

      });



    if(!result?.ok){

      job.status =
        'Needs attention';

      job.updatedAt =
        new Date().toISOString();

      persistLocalState();


      addAiMessage(

        'ai',

        `I could not generate the image yet. ${
          result?.error ||
          'The secure creative service did not confirm the request.'
        }`

      );

      return;

    }


    const assets =
      normalizeCreativeAssetsResponse(result);


    if(!assets.length){

      job.status =
        'Needs attention';

      job.updatedAt =
        new Date().toISOString();

      persistLocalState();


      addAiMessage(

        'ai',

        'The creative service responded, but it did not return a valid image asset. Nothing was falsely marked generated.'

      );

      return;

    }


    job.status =
      'Generated';

    job.assets =
      assets;

    job.assetUrl =
      assets[0].url;

    job.updatedAt =
      new Date().toISOString();

    job.name =
      String(
        result.name ||
        `${aiBusinessArchetype()} ${purpose.replace(/_/g,' ')} creative`
      );

    job.explanation =

      result.explanation ||

      assets[0]?.explanation ||

      '';


    assets.forEach((asset,index)=>{

      aiMediaLibrary.unshift(

        normalizeAiMediaItem({

          name:
            asset.name ||
            `${job.name} ${index+1}`,

          detail:prompt,

          icon:'AI',

          category:'Promotion',

          status:'Generated',

          assetUrl:asset.url,

          url:asset.url,

          explanation:
            asset.explanation ||
            job.explanation

        })

      );

    });


    aiTimelineAdd(

      'AI Work',

      `Generated ${assets.length} creative variation${assets.length===1?'':'s'} from chat and saved them to Journey Library.`,

      {
        purpose
      }

    );


    persistLocalState();


    try{

      renderAiCreativeJobs();

    }catch(_){}


    try{

      renderAiWorkspaceMedia();

    }catch(_){}


    try{

      renderJourneyLibrary();

    }catch(_){}


    try{

      syncJourneyLibrary(false);

    }catch(_){}


    addCreativeAssetsMessage(

      assets,

      `Done. I created ${assets.length} variation${assets.length===1?'':'s'} and saved ${assets.length===1?'it':'them'} to Journey Library.`

    );


    if(/caption/.test(lower)){

      addAiMessage(

        'ai',

        /barber|barbershop/.test(lower)

          ? 'Caption idea: Keep showing up, keep sharpening the craft, and let the work speak for itself. ✂️'

          : 'Caption idea: Keep building, keep improving, and let consistent work speak for itself.'

      );

    }


  }

  catch(error){


    job.status =
      'Needs attention';

    job.updatedAt =
      new Date().toISOString();


    persistLocalState();


    addAiMessage(

      'ai',

      `I could not complete that image request. ${
        error?.message ||
        'Please try again.'
      }`

    );

  }

}


/* =========================================================
   #08 EXTEND JOURNEY AI PROMPT ROUTING
   ========================================================= */

window.handleAiPrompt =
function(raw,voiceReply=false){

  const text =
    String(raw||'').trim();


  if(!text) return;


  const key =
    keyOf(text);



  if(
    [
      'image',
      'create image',
      'make image',
      'generate image'
    ].includes(key)
  ){

    addAiMessage(
      'user',
      text
    );


    discoveryMode =
      'image';


    addAiMessage(

      'ai',

      'Image mode is ready. Describe what you want to see, the purpose or platform if relevant, and any style, colors or text you want included. I will use your Business Brain and current creative preferences automatically.',

      null,

      voiceReply

    );


    return;

  }



  const answer =
    discoveryResponse(key);


  if(answer){

    addAiMessage(
      'user',
      text
    );


    addAiMessage(
      'ai',
      answer,
      null,
      voiceReply
    );


    return;

  }



  if(
    looksLikeImageRequest(text)
  ){

    addAiMessage(
      'user',
      text
    );


    discoveryMode =
      '';


    generateFromChat(
      text,
      voiceReply
    );


    return;

  }



  return originalHandleAiPrompt(
    raw,
    voiceReply
  );

};


/* =========================================================
   #09 EXTEND JOURNEY AI OPEN
   ========================================================= */

window.openAI =
function(){

  const result =
    originalOpenAI.apply(
      this,
      arguments
    );


  renderShortcuts();


  return result;

};


/* =========================================================
   #10 INITIALIZE
   ========================================================= */

injectStyles();

renderShortcuts();


})();


/* =========================================================
   #11 CONTEXT-FIRST ASSISTANT — 2026-10-08
   Reuses the existing app chat and action dispatcher.
   No fabricated completion or optimistic success states.
   ========================================================= */
(function(){
  'use strict';
  const bubbleSVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-8.7 8.3 9.3 9.3 0 0 1-3.8-.9L3.5 20l1.2-4A8 8 0 0 1 3.5 11.6a8.5 8.5 0 0 1 8.5-8.3 8.5 8.5 0 0 1 8.5 8.3Z"/></svg>';
  const micSVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4m-4 0h8"/></svg>';
  const style=document.createElement('style');
  style.id='cjContextFirst20261008';
  style.textContent=`
   #journeyAiPanel, #journeyAiPanel *, .ai-panel, .ai-panel * {box-sizing:border-box}
   #journeyAiPanel {max-width:min(100vw - 20px, 480px); min-width:0}
   #journeyAiPanel textarea, #journeyAiPanel input {min-width:0;max-width:100%;box-sizing:border-box}
   #journeyAiPanel .ai-thread, #journeyAiPanel #aiThread {min-width:0;max-width:100%;overflow-wrap:anywhere}
   .cj-context-choice-group{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0 4px}
   .cj-context-choice{border:1px solid #a9c7ed;background:#eaf3ff;color:#174574;padding:9px 12px;border-radius:12px;cursor:pointer;text-align:left;font-size:13px;font-weight:600}
   .cj-context-choice:focus-visible{outline:2px solid #2789ed;outline-offset:2px}
   .cj-context-hint{font-size:11px;opacity:.75;display:block;margin:8px 0 4px}
   .cj-mic-live-indicator{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:12px;background:#fee7e7;color:#b32424;font-weight:800;font-size:11px;vertical-align:middle}
   .cj-mic-live-indicator:before{content:'';width:7px;height:7px;background:#ed3232;border-radius:50%;animation:cjLivePulse 1s infinite}
   @keyframes cjLivePulse{50%{opacity:.25;transform:scale(1.45)}}
   .cj-outline-mic svg{width:80%;height:80%;display:block;margin:auto}
   .cj-outline-bubble svg{width:88%;height:88%;display:block;margin:auto}
   .cj-outline-mic,.cj-outline-bubble{background-image:none!important}
   .cj-outline-mic.cj-listening svg{animation:cjLivePulse 1.2s infinite}
   @media(max-width:600px){#journeyAiPanel{left:auto!important;right:8px!important;width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;} #journeyAiPanel .ai-thread{overflow-x:hidden}}
  `;
  document.head.appendChild(style);

  let lastContext='',pendingContext=null;
  const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,135);
  function labelFor(el){
    return clean(el.getAttribute('aria-label')||el.getAttribute('title')||el.dataset?.title||el.dataset?.label||
      el.querySelector('h2,h3,h4,strong,.title')?.textContent||el.textContent);
  }
  function isExcluded(el){
    return !!el.closest('#journeyAiPanel, .ai-panel, input,textarea,select,[contenteditable="true"],[data-cj-no-context],dialog');
  }
  function contextFor(el){
    const section=el.closest('section,article,[class*="card"],[class*="panel"],[class*="section"]');
    const heading=section?.querySelector('h1,h2,h3,h4')?.textContent;
    const tab=document.querySelector('[aria-current="page"],[role="tab"][aria-selected="true"],.nav-item.active,.bottom-nav .active');
    return {item:labelFor(el),section:clean(heading),page:clean(tab?.textContent||document.querySelector('main h1')?.textContent||'CreateJourney')};
  }
  function buttonsFor(context){
    const k=(context.item+' '+context.section).toLowerCase();
    if(/google|seo|search/.test(k)) return ['Review Google & SEO opportunities','Improve my business profile','Plan a local SEO campaign','Show connected data'];
    if(/rebook|booking/.test(k)) return ['Show what was completed','Review booking performance','Improve rebooking','What should we do next?'];
    if(/marketing|campaign|social/.test(k)) return ['Plan a campaign','Create a social media image','Review performance','Recommend a first priority'];
    if(/board|journey/.test(k)) return ['Inspect this board or Journey','Recommend improvements','Update the Journey','Review activity'];
    if(/performance|metric|analytic/.test(k)) return ['Explain these results','Compare last week','Identify an opportunity','Recommend next steps'];
    return ['Explain this section','Show me the current status','Recommend improvements','Help me take action'];
  }
  function makeMessage(ctx){
    const name=ctx.item;
    const scope=ctx.section && !name.toLowerCase().includes(ctx.section.toLowerCase())?' under '+ctx.section:'';
    return 'You selected “'+name+'”'+scope+'. I can help you understand what this does, review available business information, and work through an improvement. Choose where you want to start. I’ll distinguish verified results from recommendations and confirm any changes only after they succeed.';
  }
  function appendChoices(ctx){
    const thread=document.getElementById('aiThread');
    if(!thread)return;
    const wrap=document.createElement('div');
    wrap.className='msg ai cj-context-options';
    const small=document.createElement('span');
    small.className='cj-context-hint';
    small.textContent='Select one of these:';
    const row=document.createElement('div');
    row.className='cj-context-choice-group';
    for(const choice of buttonsFor(ctx)){
      const button=document.createElement('button');
      button.type='button';button.className='cj-context-choice';button.textContent=choice;
      button.addEventListener('click',()=>{
        // Route through the existing Journey AI dispatcher, which owns
        // real permissions, integrations and execution verification.
        const prompt='Regarding '+ctx.item+(ctx.section?' in '+ctx.section:'')+': '+choice+
          '. Inspect available workspace data; explain what is confirmed, then perform only supported authorized actions. Report actual results, and offer next steps.';
        if(typeof window.handleAiPrompt==='function')window.handleAiPrompt(prompt);
      });
      row.appendChild(button);
    }
    wrap.append(small,row);thread.appendChild(wrap);thread.scrollTop=thread.scrollHeight;
  }
  function showContext(ctx){
    if(!ctx.item)return;
    // Intentionally do not write into the text composer.
    try{if(typeof window.openAI==='function')window.openAI();}catch(_){}
    if(typeof window.addAiMessage==='function')window.addAiMessage('ai',makeMessage(ctx));
    else if(typeof addAiMessage==='function')addAiMessage('ai',makeMessage(ctx));
    else return;
    appendChoices(ctx);
  }
  document.addEventListener('click',e=>{
    const el=e.target.closest('button,a,[role="button"],[role="tab"],[data-action],.clickable');
    if(!el||isExcluded(el))return;
    const ctx=contextFor(el);
    if(!ctx.item||ctx.item.length>125)return;
    const id=[ctx.page,ctx.section,ctx.item].join('|');
    if(id===lastContext && Date.now()-(pendingContext?.time||0)<700)return;
    lastContext=id;pendingContext={time:Date.now()};
    // After app navigation handlers run, present the selected action.
    setTimeout(()=>showContext(ctx),110);
  },false);

  function removePlaceholder(){
    const journeyPage=[...document.querySelectorAll('h1,h2,h3')].find(x=>/^journeys?$/i.test(clean(x.textContent)));
    if(!journeyPage)return;
    const wrapper=journeyPage.closest('header,section,[class*="header"]')||journeyPage.parentElement;
    if(!wrapper)return;
    for(const node of wrapper.querySelectorAll('span,small,button,div')){
      if(node.children.length===0 && /^new york(?:,\s*ny)?$/i.test(clean(node.textContent))){node.remove();}
    }
  }
  const observer=new MutationObserver(()=>{removePlaceholder();decorateIcons();});
  let decorationPending=false;
  function decorateIcons(){
    if(decorationPending)return;
    decorationPending=true;
    requestAnimationFrame(()=>{
      decorationPending=false;
      const panel=document.getElementById('journeyAiPanel');
      const candidates=[...document.querySelectorAll('button[aria-label],button[title],button[id],button[class]')];
      for(const btn of candidates){
        if(btn.dataset.cjContextIconDone)continue;
        const attr=(btn.getAttribute('aria-label')||btn.getAttribute('title')||btn.id||'').toLowerCase();
        const text=clean(btn.textContent).toLowerCase();
        const isChat=/journey.*(chat|ai)|open.*chat/.test(attr)||(/journey ai/.test(text)&&!panel?.contains(btn)&&btn.getBoundingClientRect().width<110);
        const isMic=/(microphone|voice|mic)/.test(attr)&&!/(mute|permission|settings)/.test(attr);
        if(!isChat&&!isMic)continue;
        btn.dataset.cjContextIconDone='1';
        if(isChat){btn.classList.add('cj-outline-bubble');if(!btn.querySelector('svg'))btn.innerHTML=bubbleSVG;}
        if(isMic){
          btn.classList.add('cj-outline-mic');
          // Only replace an icon if it has no nested descriptive UI.
          if(!btn.querySelector('svg')&&btn.children.length===0)btn.innerHTML=micSVG;
          btn.addEventListener('click',()=>{
            setTimeout(()=>{
              const listening=btn.getAttribute('aria-pressed')==='true'||btn.classList.contains('active')||btn.classList.contains('listening');
              btn.classList.toggle('cj-listening',listening);
              let notice=btn.parentElement?.querySelector('.cj-mic-live-indicator');
              if(listening&&!notice){notice=document.createElement('span');notice.className='cj-mic-live-indicator';notice.textContent='LIVE · Listening';btn.insertAdjacentElement('afterend',notice);}
              else if(!listening&&notice)notice.remove();
            },130);
          });
        }
      }
    });
  }
  const start=()=>{removePlaceholder();decorateIcons();observer.observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
