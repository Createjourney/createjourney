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
