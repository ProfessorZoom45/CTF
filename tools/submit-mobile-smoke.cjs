const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require('C:/Users/jessi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    for (const [width, height] of [[375, 812], [844, 390], [932, 430]]) {
      const page = await browser.newPage({viewport: {width, height}});
      await page.route(/^https?:/, route => route.abort());
      await page.goto('file:///' + path.resolve(__dirname, '..', 'submit.html').replaceAll('\\', '/'));
      const state = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        fields: [...document.querySelectorAll('.cb-input')].filter(el => {
          const box = el.getBoundingClientRect();
          return box.width > 0 && (box.left < 0 || box.right > innerWidth + 1);
        }).length,
        submitVisible: !!document.querySelector('#submit-btn'),
        navVisible: !!document.querySelector('nav .menu-toggle'),
        discoveryVisible: !!document.querySelector('.discovery-path')
      }));
      assert(state.document <= state.viewport + 1, `Horizontal overflow at ${width}: ${JSON.stringify(state)}`);
      assert.equal(state.fields, 0, `Clipped fields at ${width}`);
      assert(state.submitVisible && state.discoveryVisible);
      assert(state.navVisible, `Mobile menu missing at ${width}`);
      await page.locator('nav.ctf-unified .menu-toggle').click();
      assert.equal(await page.locator('nav.ctf-unified .menu-toggle').getAttribute('aria-expanded'), 'true');
      await page.locator('nav.ctf-unified .menu-toggle').click();
      await page.locator('#c1-name').fill('Spark Scout');
      assert.equal(await page.locator('#c1-name').inputValue(), 'Spark Scout');
      await page.locator('#c1-level').selectOption('2');
      assert.equal(await page.locator('#c1-level').inputValue(), '2');
      await page.locator('#c1-align').selectOption('Demi-God');
      await page.locator('#c1-race').selectOption('Aquatic');
      assert((await page.locator('#c1-skill option').allTextContents()).includes('Pelagic'));
      assert(!(await page.locator('#c1-skill option').allTextContents()).includes('Torrential'));
      await page.locator('#c1-skill').selectOption('Pelagic');
      await page.locator('#c1-align').selectOption('Spirit');
      assert.equal(await page.locator('#c1-race').inputValue(), 'Aquatic');
      assert((await page.locator('#c1-skill option').allTextContents()).includes('Torrential'));
      assert(!(await page.locator('#c1-skill option').allTextContents()).includes('Pelagic'));
      assert(await page.evaluate(() => CTF_FORGE_TREE.validPath(V('c1-align'),V('c1-race'),V('c1-skill'))));
      await page.locator('.mat-btn').first().click();
      assert(await page.locator('.mat-btn').first().evaluate(el => el.classList.contains('selected')));
      await page.locator('.tt-btn').first().click();
      assert(await page.locator('.tt-btn').first().evaluate(el => el.classList.contains('selected')));
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==', 'base64');
      await page.locator('input[type=file]').first().setInputFiles({name:'spark.png', mimeType:'image/png', buffer:png});
      await page.waitForFunction(() => getTotalImageCount() === 1, {timeout: 10000});
      const delivery = await page.evaluate(async () => {
        const json = JSON.stringify({submission_id:'mobile-test-123456',submitter:{name:'Spark Scout',email:'spark@example.com'},cards:[{name:'Spark Scout'}],images:getImageSummary()});
        let sent;
        getDeliveryConfig = () => ({endpoint:'https://example.test/submit-card'});
        deliveryConfigured = () => true;
        turnstileToken = 'test-token';
        window.fetch = async (_url, request) => {sent = JSON.parse(request.body);return {ok:true,json:async()=>({owner_email_sent:true,submitter_email_sent:true})};};
        await deliverSubmissionEmails(json,'CTF_Cards_Spark.json','mobile-test-123456',getImageDataFull());
        return {json:sent.json, images:sent.images, token:sent.turnstile_token};
      });
      assert(!delivery.json.includes('data:image/'), 'JSON backup contains image bytes');
      assert.equal(delivery.images.length, 1);
      assert(delivery.images[0].data_url.startsWith('data:image/png;base64,'));
      assert.equal(delivery.token, 'test-token');
      console.log(`${width}x${height}: ${JSON.stringify(state)}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
