// 用法：NODE_PATH=<puppeteer-core 所在 node_modules> node tests/browser_check.js [url]
const puppeteer = require('puppeteer-core'), path = require('path'), { execFileSync } = require('child_process');
const url = process.argv[2] || 'http://127.0.0.1:8080/', out = path.join(__dirname, '..', 'screenshots');
function todayWord(date) {
  return execFileSync('python3', [path.join(__dirname, '..', 'passphrase.py'), date], { encoding: 'utf8' }).trim();
}
(async () => {
  const br = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--font-render-hinting=none'] });
  async function run(tag, endpoint) {
    const pg = await br.newPage();
    await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
    await pg.evaluateOnNewDocument(() => { try { localStorage.clear(); } catch (e) {} });
    if (endpoint !== undefined) {
      await pg.setRequestInterception(true);
      pg.on('request', rq => rq.url().endsWith('/config.js')
        ? rq.respond({ contentType: 'application/javascript', body: "window.TIGER_CONFIG={ENDPOINT:'" + endpoint + "',IG_URL:'https://www.instagram.com/aura_lightning_zaomu/',FB_URL:'https://www.facebook.com/1418130474718466',YT_URL:'https://www.youtube.com/@weipin-8278',CONTACT_NOTE:'私訊幻湮宮'};" })
        : rq.continue());
    }
    await pg.goto(url, { waitUntil: 'networkidle0' });
    await pg.waitForFunction(() => {
      const g = document.getElementById('gate'), f = document.getElementById('f');
      return (g && !g.hidden) || (f && !f.hidden);
    });
    const gated = await pg.$eval('#gate', e => !e.hidden);
    let gateWrong = '', gateRight = false;
    if (gated) {
      if (tag === 'empty') await pg.screenshot({ path: path.join(out, 'gate.png'), fullPage: true });
      await pg.click('#gateGo');
      gateWrong = await pg.$eval('#gateErr', e => e.textContent);
      const date = await pg.evaluate(() => (window.__pwDate) || null) || await pg.evaluate(async () => {
        const d = await fetch('data.json', { cache: 'no-cache' }).then(r => r.json());
        return d.passphrase && d.passphrase.date;
      });
      await pg.evaluate(() => { document.getElementById('passphrase').value = '測試'; });
      await pg.click('#gateGo');
      await new Promise(r => setTimeout(r, 400));
      gateWrong = await pg.$eval('#gateErr', e => e.textContent);
      const word = todayWord(date);
      await pg.evaluate(w => { document.getElementById('passphrase').value = w; }, word);
      await pg.click('#gateGo');
      await pg.waitForSelector('#f:not([hidden])');
      gateRight = true;
    }
    if (tag === 'empty') await pg.screenshot({ path: path.join(out, 'form.png'), fullPage: true });
    await pg.type('input[name=nick]', '阿斌');
    await pg.select('select[name=by]', '1988'); await pg.select('select[name=bm]', '7'); await pg.select('select[name=bd]', '15');
    await pg.select('select[name=bh]', '10'); await pg.select('select[name=bmi]', '30');
    await pg.click('input[name=gender][value=男]');
    // 先測驗證：未填聯絡方式
    await pg.click('input[name=consent]');
    await pg.click('button[type=submit]');
    const e1 = await pg.$eval('#err', e => e.textContent);
    await pg.type('input[name=email]', 'test@example.com'); await pg.type('input[name=line]', 'abin88');
    await pg.click('input[name=optin]');
    await pg.click('button[type=submit]');
    await pg.waitForSelector('#result:not([hidden])'); await new Promise(r => setTimeout(r, 1500));
    const res = await pg.evaluate(() => ({ balls: [...document.querySelectorAll('.ball .n')].map(e => e.textContent), draw: document.getElementById('drawDate').textContent,
      pillars: [...document.querySelectorAll('#pillars tr')].slice(1, 3).map(r => [...r.children].map(c => c.textContent).join('')), send: document.getElementById('sendStatus').textContent,
      warn: document.querySelector('.warn').textContent }));
    console.log(tag, JSON.stringify({ gateWrong, gateRight, validation: e1, ...res, errors: errs }));
    if (tag === 'empty') { await pg.screenshot({ path: path.join(out, 'result.png'), fullPage: true }); await (await pg.$('#result')).screenshot({ path: path.join(out, 'result_card.png') }); }
    await pg.close();
  }
  await run('empty', '');                               // 未設定 ENDPOINT
  await run('mock', 'http://127.0.0.1:8099/exec');       // 送出成功
  await run('fail', 'http://127.0.0.1:1/exec');          // 送出失敗 → 仍顯示結果
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
