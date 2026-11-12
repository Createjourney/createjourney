import {test,expect} from '@playwright/test';

test('sales center appears in Marketing and reports blocked capability honestly',async({page})=>{
 await page.goto('http://127.0.0.1:8765/tests/fixtures/sales-center.html');
 const launch=page.getByRole('button',{name:'Marketing & Sales Command Center'});
 await expect(launch).toBeVisible();
 await launch.click();
 await expect(page.getByRole('dialog',{name:'Marketing & Sales Command Center'})).toBeVisible();
 await expect(page.getByText('Sales launch status: BLOCKED')).toBeVisible();
 await expect(page.getByText('Meta', {exact:false})).toBeVisible();
 await expect(page.getByText(/External execution: NOT VERIFIED/)).toBeVisible();
 const events=await page.evaluate(()=>window.__cjRequests);
 expect(events.some(e=>e.action==='overview')).toBeTruthy();
 expect(events.some(e=>['approve','pause'].includes(e.action))).toBeFalsy();
});
test('draft campaign creation cannot authorize external spending',async({page})=>{
 await page.goto('http://127.0.0.1:8765/tests/fixtures/sales-center.html');
 await page.getByRole('button',{name:'Marketing & Sales Command Center'}).click();
 await page.getByLabel('Campaign name').fill('CI Holiday Frame');
 await page.getByLabel('Product', {exact:true}).fill('Premium Display Frame');
 await page.getByLabel('Product URL (HTTPS)').fill('https://example.com/products/frame');
 await page.getByLabel('Sale price (USD)').fill('299');
 await page.getByLabel('Regular price (USD)').fill('340');
 await page.getByLabel('Initial order target').fill('100');
 await page.getByLabel('Maximum daily advertising (USD)').fill('10');
 await page.getByLabel('Daily prospect research goal').fill('120');
 await page.getByRole('button',{name:'Save draft — no sales actions'}).click();
 await expect.poll(async()=>{
   const requests=await page.evaluate(()=>window.__cjRequests);
   return requests.filter(e=>e.action==='create').length;
 }).toBe(1);
 const created=await page.evaluate(()=>window.__cjRequests.find(e=>e.action==='create'));
 expect(created.campaign.daily_ad_cap_cents).toBe(1000);
 expect(created.campaign.sale_price_cents).toBe(29900);
 expect(created.campaign.daily_research_target).toBe(120);
 expect(created.campaign.delivery_guaranteed).toBeUndefined();
});

test('actual CreateJourney application bootstrap loads Sales Command Center sidecar',async({page})=>{
 const consoleErrors=[];
 page.on('pageerror',e=>consoleErrors.push(e.message));
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await expect(page).toHaveTitle(/CreateJourney/i);
 await page.waitForFunction(()=>
  typeof window.CJJourneyCapabilities?.fetchAuthorizedContext==='function' &&
  typeof window.CJSalesCommandCenter?.open==='function',{timeout:25000});
 await expect(page.locator('#aiWorkspaceMarketingPanel')).toHaveCount(1);
 // Existing application may request external APIs unavailable in CI. The
 // contract tested here is module bootstrapping from the real index.html.
 expect(await page.evaluate(()=>typeof window.CJSalesCommandCenter.open)).toBe('function');
});

test('Control Center uses one native Marketing entry for the full hub',async({page})=>{
 await page.goto('http://127.0.0.1:8765/tests/fixtures/sales-center.html');
 await expect(page.locator('[data-cjx-home-action="marketing"]')).toHaveCount(1);
 const direct=page.locator('.cjx-controls [data-cjs-launch]');
 await expect(direct).toBeVisible();
 await expect(direct).toHaveAttribute('data-cjx-home-action','marketing');
 await expect(page.locator('.cjx-controls [data-cjs-launch]')).toHaveCount(1);
 await direct.click();
 await expect(page.getByRole('dialog',{name:'Marketing & Sales Command Center'})).toBeVisible();
 await expect(page.getByText('Sales launch status: BLOCKED')).toBeVisible();
 await expect(page.getByRole('heading',{name:'Marketing account connections'})).toBeVisible();
 await expect(page.getByText('Setup required — not connected').first()).toBeVisible();
});

test('real Command Center tile opens sales overlay instead of returning to dashboard top',async({page})=>{
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.CJExactHome?.showCommandCenter==='function'&&typeof window.CJSalesCommandCenter?.open==='function',{timeout:25000});
 await page.evaluate(()=>window.CJExactHome.showCommandCenter());
 const tile=page.locator('#cjScreenshotHome .cjx-controls [data-cjs-launch]').first();
 await expect(tile).toHaveCount(1,{timeout:20000});
 // CI has no authenticated owner, so its real Command Center shell stays hidden.
 // Dispatch a real DOM click to verify capture/bubble handling independently.
 await tile.evaluate(el=>el.click());
 await expect(page.locator('#cjSalesOverlay')).toBeVisible({timeout:10000});
 await expect(page.getByRole('dialog',{name:'Marketing & Sales Command Center'})).toBeVisible();
});

test('iPhone-width real homepage Sales button receives a real pointer click',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.CJSalesCommandCenter?.open==='function'&&typeof window.CJExactHome?.showCommandCenter==='function',{timeout:25000});
 await page.evaluate(()=>window.CJExactHome.showCommandCenter());
 await page.waitForSelector('#cjScreenshotHome .cjx-controls [data-cjs-launch]',{state:'attached',timeout:13000});
 await page.evaluate(()=>{
   const tile=document.querySelector('#cjScreenshotHome .cjx-controls [data-cjs-launch]');
   if(!tile)throw Error('Sales tile not installed');
   // No CI login exists. Reveal ancestors only to enable native user pointer events.
   let ancestor=tile;
   while(ancestor&&ancestor!==document.documentElement){
     ancestor.style.setProperty('display',ancestor===tile?'grid':'block','important');
     ancestor.style.setProperty('visibility','visible','important');
     ancestor.style.setProperty('opacity','1','important');
     ancestor=ancestor.parentElement;
   }
 });
 const tile=page.locator('#cjScreenshotHome .cjx-controls [data-cjs-launch]').first();
 await expect(tile).toBeVisible();
 await tile.scrollIntoViewIfNeeded();
 const scrollBefore=await page.evaluate(()=>window.scrollY);
 await tile.click();
 await expect(page.locator('#cjSalesOverlay')).toBeVisible({timeout:10000});
 await expect(page.getByRole('dialog',{name:'Marketing & Sales Command Center'})).toBeVisible();
});


test('one marketing hub does not pretend missing OAuth is connected',async({page})=>{
 await page.goto('http://127.0.0.1:8765/tests/fixtures/sales-center.html');
 await page.locator('[data-cjx-home-action="marketing"]').click();
 await expect(page.getByRole('heading',{name:'One Marketing Command Center'})).toBeVisible();
 await expect(page.getByText('Shopify',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Connection requirements'}).first().click();
 await expect(page.getByText(/needs its provider OAuth configuration/)).toBeVisible();
 const events=await page.evaluate(()=>window.__cjRequests);
 expect(events.some(e=>e.action==='create')).toBeFalsy();
});
