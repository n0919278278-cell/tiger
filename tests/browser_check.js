/* 無頭 Chrome：官網渲染、手機寬度、必填與前置防呆、成功才顯示預約成功。
 * 用法：NODE_PATH=/tmp/pt/node_modules node tests/browser_check.js [url] */
const puppeteer = require('puppeteer-core');
const http = require('http');
const path = require('path');
const fs = require('fs');

const url = process.argv[2] || 'http://127.0.0.1:8080/';
const out = path.join(__dirname, '..', 'screenshots');
fs.mkdirSync(out, { recursive: true });
const banned = ['7×12', '7x12', '3×9', '3x9', '二合', '盈虧', '下注', '今日暗號', '恭迎虎爺'];
let fail = 0;
function ok(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) fail++;
}

function startMock(port, mode) {
  const hits = [];
  const server = http.createServer((req, res) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8'
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, headers); res.end(); return; }
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let data = null;
      try { data = JSON.parse(body); } catch (e) {}
      hits.push(data);
      if (mode === 'ok' && data && data.consent === 'Y' && (data.email || data.line)) {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: true }));
      } else {
        res.writeHead(200, headers);
        res.end(JSON.stringify({ ok: false, error: 'mock' }));
      }
    });
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, hits })));
}

(async () => {
  const mockOk = await startMock(8099, 'ok');
  const mockBad = await startMock(8098, 'bad');
  const br = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });
  const context = br.defaultBrowserContext();
  await context.overridePermissions(new URL(url).origin, ['clipboard-read', 'clipboard-write']);

  async function open(endpoint) {
    const pg = await br.newPage();
    const errors = [];
    pg.on('pageerror', (e) => errors.push(String(e)));
    pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await pg.setRequestInterception(true);
    pg.on('request', (rq) => {
      if (rq.url().split('?')[0].endsWith('/config.js')) {
        rq.respond({
          contentType: 'application/javascript',
          body: "window.PALACE_CONFIG={ENDPOINT:'" + endpoint + "',IG_URL:'https://www.instagram.com/aura_lightning_zaomu/',FB_URL:'https://www.facebook.com/1418130474718466',FB_NAME:'財神幻湮宮-今彩539聚地',MESSENGER_URL:'https://m.me/1418130474718466',YT_URL:'https://www.youtube.com/@weipin-8278',PORTALY_URL:'',CONTACT_NOTE:'私訊粉專'};window.TIGER_CONFIG=window.PALACE_CONFIG;"
        });
      } else if (rq.url().indexOf('script.google.com') >= 0) rq.abort();
      else rq.continue();
    });
    return { pg, errors };
  }

  async function shot(pg, name) {
    await new Promise((r) => setTimeout(r, 80));
    await pg.screenshot({ path: path.join(out, name), fullPage: false });
  }
  async function go(pg, id) {
    await pg.evaluate((sel) => document.getElementById(sel).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
  }

  const mobile = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const home = await open('http://127.0.0.1:8099/exec');
  await home.pg.setViewport(mobile);
  await home.pg.goto(url, { waitUntil: 'networkidle0' });
  await home.pg.waitForFunction(() => document.querySelector('select[name=by] option[value="1988"]'));

  const boot = await home.pg.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const btn = document.getElementById('submitBtn').getBoundingClientRect();
    const scripts = [...document.scripts].map((s) => s.src);
    return {
      title: document.title,
      h1: document.querySelector('h1').textContent,
      text: document.body.innerText,
      gate: !!document.getElementById('gate') || !!document.getElementById('passphrase'),
      formHidden: document.getElementById('f').hidden,
      font: parseFloat(cs.fontSize),
      color: cs.color,
      bg: cs.backgroundColor,
      btnH: btn.height,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scripts,
      prices: [...document.querySelectorAll('.svc-input')].map((el) => ({ id: el.dataset.id, price: el.dataset.price })),
      imgs: [...document.querySelectorAll('#incense img')].map((img) => ({ src: img.getAttribute('src'), w: img.naturalWidth, alt: img.alt }))
    };
  });
  ok(boot.title.indexOf('財神幻湮宮') >= 0, '標題');
  ok(boot.h1 === '財神幻湮宮', '主標');
  ok(boot.text.indexOf('僅供娛樂參考') >= 0 && boot.text.indexOf('遠端解事') >= 0, '品牌說明');
  ok(!boot.gate && !boot.formHidden, '沒有暗號鎖，表單直接可見');
  ok(boot.font >= 18, '正文字級 ' + boot.font);
  ok(boot.btnH >= 52, '送出按鈕高度 ' + Math.round(boot.btnH));
  ok(boot.overflow <= 1, '手機寬度沒有橫向捲軸 ' + boot.overflow);
  ok(!boot.scripts.some((s) => /tiger\.js|lunar\.js|data\.json/.test(s)), '沒有載入舊選號腳本');
  banned.forEach((w) => ok(boot.text.indexOf(w) < 0, '畫面沒有「' + w + '」'));
  const catalog = await home.pg.evaluate(() => window.PalaceBooking.SERVICES.map((s) => ({ id: s.id, price: String(s.price) })));
  ok(JSON.stringify(boot.prices) === JSON.stringify(catalog), '畫面上的價格與計價表一致');
  ok(boot.imgs.length === 2 && boot.imgs.every((img) => img.w > 100), '兩張香粉照片有載入 ' + JSON.stringify(boot.imgs.map((i) => i.w)));
  ok(home.errors.length === 0, '首頁沒有腳本錯誤 ' + home.errors.join(' | '));
  await shot(home.pg, 'mobile_home.png');
  await go(home.pg, 'personal');
  await shot(home.pg, 'mobile_services.png');
  await go(home.pg, 'incense');
  await shot(home.pg, 'mobile_incense.png');

  await home.pg.$eval('#submitBtn', (el) => el.click());
  const emptyErr = await home.pg.$eval('#err', (e) => e.textContent);
  ok(emptyErr.indexOf('姓名') >= 0 && emptyErr.indexOf('預約成功') < 0, '空白送出有必填提醒');

  await home.pg.click('.svc-input[data-id="group"]');
  await home.pg.waitForSelector('#preBox:not([hidden])');
  const preText = await home.pg.$eval('#preLead', (e) => e.textContent);
  ok(preText.indexOf('團體祈福') >= 0 && preText.indexOf('基礎清理') >= 0, '勾團體祈福後出現前置提醒');
  await home.pg.evaluate(() => {
    const f = document.getElementById('f');
    f.elements.name.value = '阿斌';
    f.elements.by.value = '1988';
    f.elements.bm.value = '7';
    f.elements.bm.dispatchEvent(new Event('change', { bubbles: true }));
    f.elements.bd.value = '15';
    f.elements.shichen.value = '辰';
    f.querySelector('input[name=gender][value=男]').checked = true;
    f.elements.address.value = '台北市大安區復興南路一段1號';
    f.elements.phone.value = '0912345678';
    f.elements.line.value = 'abin88';
    f.elements.email.value = 'test@example.com';
    f.elements.note.value = '希望家中平安';
    f.elements.consent.checked = true;
    f.elements.optin.checked = true;
  });
  await home.pg.$eval('#submitBtn', (el) => el.click());
  const preErr = await home.pg.$eval('#err', (e) => e.textContent);
  ok(preErr.indexOf('基礎清理') >= 0, '未確認前置不能送出');
  ok(await home.pg.$eval('#success', (e) => e.hidden), '此時不顯示預約成功');
  await go(home.pg, 'preBox');
  await shot(home.pg, 'mobile_precheck.png');

  await home.pg.$eval('#preDone', (el) => el.click());
  const doneTotal = await home.pg.$eval('#stickyTotal', (e) => e.textContent);
  ok(doneTotal === 'NT$600', '聲明已完成時合計 600，實測 ' + doneTotal);
  await home.pg.$eval('#preAddon', (el) => el.click());
  const addon = await home.pg.evaluate(() => ({
    base: document.querySelector('.svc-input[data-id=base]').checked,
    done: document.getElementById('preDone').checked,
    total: document.getElementById('stickyTotal').textContent
  }));
  ok(addon.base && !addon.done && addon.total === 'NT$900', '加購前置會勾基礎清理且合計 900 ' + JSON.stringify(addon));

  await home.pg.$eval('#qtyPlus', (el) => el.click());
  const ship = await home.pg.evaluate(() => ({
    qty: document.getElementById('incenseQty').textContent,
    storeHidden: document.getElementById('storeBlock').hidden,
    total: document.getElementById('stickyTotal').textContent
  }));
  ok(ship.qty === '1' && !ship.storeHidden && ship.total === 'NT$1,848', '一包香粉含運費後合計 1848 ' + JSON.stringify(ship));
  await home.pg.evaluate(() => {
    const f = document.getElementById('f');
    f.elements.store_name.value = '松山門市';
    f.elements.store_code.value = '123456';
  });
  await go(home.pg, 'book');
  await shot(home.pg, 'mobile_form.png');
  await home.pg.$eval('#submitBtn', (el) => el.click());
  await home.pg.waitForSelector('#success:not([hidden])', { timeout: 8000 });
  const success = await home.pg.evaluate(() => ({
    hidden: document.getElementById('success').hidden,
    title: document.querySelector('#success h2').textContent,
    summary: document.getElementById('successSummary').textContent,
    sticky: document.getElementById('sticky').hidden
  }));
  ok(success.title === '預約成功！', '成功標題');
  ok(success.summary.indexOf('阿斌') >= 0 && success.summary.indexOf('NT$1,848') >= 0, '摘要含姓名與金額');
  ok(success.summary.indexOf('台北市大安區復興南路一段1號') >= 0 && success.summary.indexOf('松山門市') >= 0, '摘要含地址與門市');
  ok(success.summary.indexOf('財神幻湮宮-今彩539聚地') >= 0, '摘要指向粉專');
  ok(success.sticky, '成功後收起底部列');
  const posted = mockOk.hits[mockOk.hits.length - 1];
  ok(posted && posted.consent === 'Y' && posted.email === 'test@example.com' && posted.line === 'abin88', '送出相容的聯絡欄位');
  ok(posted.marketing_opt_in === 'Y' && posted.optin === 'Y', '行銷同意');
  ok(posted.birth_date === '1988-07-15' && posted.birth_time.indexOf('辰時') >= 0 && posted.gender === '男', '生辰性別');
  ok(posted.numbers.indexOf('基礎清理淨化') >= 0 && posted.numbers.indexOf('合計NT$1,848') >= 0, 'numbers 寫入服務');
  ok(posted.draw_date === posted.target_period && posted.target_period.indexOf('地址:') >= 0 && posted.target_period.indexOf('123456') >= 0 && posted.target_period.indexOf('希望家中平安') >= 0, 'target_period 寫入地址門市備註');
  ok(posted.passphrase_ok === '', '沒有暗號通過標記');
  await home.pg.bringToFront();
  await home.pg.click('#copyTop');
  await home.pg.waitForFunction(() => document.getElementById('copyMsg').textContent.length > 0);
  const copied = await home.pg.evaluate(async () => {
    const msg = document.getElementById('copyMsg').textContent;
    let clip = '';
    try { clip = await navigator.clipboard.readText(); } catch (e) { clip = 'ERR ' + e.message; }
    const sel = String(window.getSelection());
    return { msg, clip, sel: sel.slice(0, 80) };
  });
  ok(copied.msg.indexOf('已複製') >= 0 || copied.sel.indexOf('阿斌') >= 0, '複製或已選取摘要 ' + JSON.stringify(copied));
  ok((copied.clip.indexOf('阿斌') >= 0 && copied.clip.indexOf('NT$1,848') >= 0) || copied.sel.indexOf('阿斌') >= 0, '摘要進剪貼簿或已選取');
  await shot(home.pg, 'mobile_success.png');

  await home.pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await home.pg.evaluate(() => window.scrollTo(0, 0));
  const desk = await home.pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(desk <= 1, '桌面寬度沒有橫向捲軸');
  await shot(home.pg, 'desktop_home.png');
  await home.pg.close();

  const bad = await open('http://127.0.0.1:8098/exec');
  await bad.pg.setViewport(mobile);
  await bad.pg.goto(url, { waitUntil: 'networkidle0' });
  await bad.pg.waitForFunction(() => document.querySelector('select[name=by] option[value="1988"]'));
  await bad.pg.click('.svc-input[data-id="base"]');
  await bad.pg.evaluate(() => {
    const f = document.getElementById('f');
    f.elements.name.value = '阿斌';
    f.elements.by.value = '1988';
    f.elements.bm.value = '7';
    f.elements.bd.value = '15';
    f.elements.shichen.value = '辰';
    f.querySelector('input[name=gender][value=女]').checked = true;
    f.elements.address.value = '新北市板橋區文化路一段1號';
    f.elements.email.value = 'test@example.com';
    f.elements.consent.checked = true;
  });
  await bad.pg.$eval('#submitBtn', (el) => el.click());
  await bad.pg.waitForFunction(() => document.getElementById('err').textContent.indexOf('沒有送出成功') >= 0);
  ok(await bad.pg.$eval('#success', (e) => e.hidden), '回傳 ok:false 不顯示預約成功');
  await bad.pg.close();

  const down = await open('http://127.0.0.1:1/exec');
  await down.pg.setViewport(mobile);
  await down.pg.goto(url, { waitUntil: 'networkidle0' });
  await down.pg.waitForFunction(() => document.querySelector('select[name=by] option[value="1988"]'));
  await down.pg.click('.svc-input[data-id="base"]');
  await down.pg.evaluate(() => {
    const f = document.getElementById('f');
    f.elements.name.value = '阿斌';
    f.elements.by.value = '1988';
    f.elements.bm.value = '7';
    f.elements.bd.value = '15';
    f.elements.unknownTime.checked = true;
    f.elements.unknownTime.dispatchEvent(new Event('change', { bubbles: true }));
    f.querySelector('input[name=gender][value=其他]').checked = true;
    f.elements.address.value = '台中市西區公益路100號';
    f.elements.line.value = 'abin88';
    f.elements.consent.checked = true;
  });
  await down.pg.$eval('#submitBtn', (el) => el.click());
  await down.pg.waitForFunction(() => document.getElementById('err').textContent.indexOf('沒有送出成功') >= 0, { timeout: 8000 });
  ok(await down.pg.$eval('#success', (e) => e.hidden), '網路失敗不顯示預約成功');
  const unknownSent = await down.pg.evaluate(() => document.querySelector('select[name=shichen]').disabled);
  ok(unknownSent, '不確定時辰會停用時辰選單');
  await down.pg.close();

  const high = await open('http://127.0.0.1:8099/exec');
  await high.pg.setViewport(mobile);
  await high.pg.goto(url, { waitUntil: 'networkidle0' });
  await high.pg.waitForFunction(() => document.querySelector('select[name=by] option[value="1988"]'));
  let dialogMsg = '';
  high.pg.once('dialog', async (d) => { dialogMsg = d.message(); await d.dismiss(); });
  await high.pg.$eval('.svc-input[data-id="d7"]', (el) => el.click());
  await high.pg.waitForSelector('#preBox:not([hidden])');
  await high.pg.$eval('#preDone', (el) => el.click());
  await high.pg.evaluate(() => {
    const f = document.getElementById('f');
    f.elements.name.value = '阿斌';
    f.elements.by.value = '1988';
    f.elements.bm.value = '7';
    f.elements.bd.value = '15';
    f.elements.shichen.value = '午';
    f.querySelector('input[name=gender][value=男]').checked = true;
    f.elements.address.value = '高雄市前鎮區成功二路1號';
    f.elements.phone.value = '0912345678';
    f.elements.consent.checked = true;
  });
  const before = mockOk.hits.length;
  await high.pg.$eval('#submitBtn', (el) => el.click());
  await new Promise((r) => setTimeout(r, 400));
  ok(dialogMsg.indexOf('NT$36,000') >= 0, '高額訂單有確認視窗 ' + dialogMsg);
  ok(await high.pg.$eval('#success', (e) => e.hidden), '取消確認不會送出');
  ok(mockOk.hits.length === before, '取消確認沒有打到名單');
  await high.pg.close();

  await br.close();
  mockOk.server.close();
  mockBad.server.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
