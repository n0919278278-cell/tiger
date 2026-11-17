/* 幻湮宮｜虎爺賜號 — 頁面互動 */
(function () {
  var C = window.TIGER_CONFIG || {}, T = window.TigerCalc(window), DATA = null;
  var f = document.getElementById('f'), $ = function (id) { return document.getElementById(id); };
  var nowT = T.taipeiNow();
  var unlockedDate = '';
  var S2T = { '纳': '納', '宝': '寶', '运': '運', '开': '開', '鸿': '鴻', '寿': '壽', '贵': '貴', '兴': '興', '气': '氣', '发': '發', '临': '臨', '庆': '慶', '赐': '賜', '禄': '祿', '来': '來', '丰': '豐', '乐': '樂', '泽': '澤', '顺': '順', '万': '萬', '余': '餘', '满': '滿', '达': '達', '财': '財', '进': '進' };
  function opts(sel, from, to, fmt, sel0) {
    for (var i = from; from <= to ? i <= to : i >= to; from <= to ? i++ : i--) {
      var o = document.createElement('option'); o.value = i; o.textContent = fmt(i); if (i === sel0) o.selected = true; sel.appendChild(o);
    }
  }
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  opts(f.by, nowT.y, 1920, function (i) { return i + ' 年（民國' + (i > 1911 ? i - 1911 : '前' + (1912 - i)) + '）'; });
  opts(f.bm, 1, 12, function (i) { return i + ' 月'; });
  function fillDays() {
    var y = +f.by.value || 2000, m = +f.bm.value || 1, keep = +f.bd.value, dim = new Date(y, m, 0).getDate();
    f.bd.length = 1; opts(f.bd, 1, dim, function (i) { return i + ' 日'; }, keep && keep <= dim ? keep : 0);
  }
  fillDays(); f.by.onchange = f.bm.onchange = fillDays;
  opts(f.bh, 0, 23, function (i) { return p2(i) + ' 時'; });
  opts(f.bmi, 0, 59, function (i) { return p2(i) + ' 分'; });
  f.unknownTime.onchange = function () { f.bh.disabled = f.bmi.disabled = this.checked; };
  document.querySelector('.contact-note').textContent = C.CONTACT_NOTE || '私訊財神幻湮宮-今彩539聚地';
  ['ig', 'fb', 'yt'].forEach(function (k) {
    var u = C[k.toUpperCase() + '_URL'];
    [k, 'gate-' + k].forEach(function (id) {
      var a = $(id);
      if (!a) return;
      if (u) a.href = u; else a.hidden = true;
    });
  });

  function normPw(s) {
    return String(s || '').replace(/\s+/g, '').split('').map(function (c) { return S2T[c] || c; }).join('');
  }
  function sha256hex(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function lsKey(d) { return 'tiger_passphrase_ok:' + d; }
  function pwSpec() { return DATA && DATA.passphrase && DATA.passphrase.date && DATA.passphrase.hash ? DATA.passphrase : null; }
  function showForm() { $('gate').hidden = true; f.hidden = false; }
  function showGate() { $('gate').hidden = false; f.hidden = true; }
  function gateMsg(msg) { $('gateErr').textContent = msg || ''; }

  var dataReady = fetch('data.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    var sp = pwSpec();
    if (!sp) { showForm(); return d; }
    if (localStorage.getItem(lsKey(sp.date)) === '1') { unlockedDate = sp.date; showForm(); }
    else showGate();
    return d;
  }).catch(function (e) { console.error(e); showForm(); throw e; });

  function rejectGate() {
    gateMsg('請到幻湮宮今日影片，聽虎爺說出今日暗號');
    var help = $('gateHelp');
    if (help) help.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function acceptGate(date) {
    unlockedDate = date;
    try { localStorage.setItem(lsKey(date), '1'); } catch (e) {}
    gateMsg('');
    showForm();
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('gateGo').addEventListener('click', function () {
    var sp = pwSpec(), raw = $('passphrase').value, word = normPw(raw);
    gateMsg('');
    if (!sp) { showForm(); return; }
    if (!word) { rejectGate(); return; }
    var btn = $('gateGo'); btn.disabled = true;
    var msg = (sp.pepper || 'hyy539-passphrase-v1') + '|' + sp.date + '|' + word;
    sha256hex(msg).then(function (h) {
      if (h === String(sp.hash).toLowerCase()) acceptGate(sp.date);
      else rejectGate();
    }).catch(function () { rejectGate(); })
      .then(function () { btn.disabled = false; });
  });
  $('passphrase').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); $('gateGo').click(); }
  });

  function err(msg) { $('err').textContent = msg; if (msg) $('err').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  f.addEventListener('submit', function (ev) {
    ev.preventDefault(); err('');
    var sp = pwSpec();
    if (sp && unlockedDate !== sp.date) { showGate(); rejectGate(); return; }
    var name = f.nick.value.trim(), email = f.email.value.trim(), line = f.line.value.trim();
    var g = (f.querySelector('input[name=gender]:checked') || {}).value, unk = f.unknownTime.checked;
    if (!name) return err('請填寫暱稱');
    if (!f.by.value || !f.bm.value || !f.bd.value) return err('請選擇完整的出生日期');
    if (!unk && (f.bh.value === '' || f.bmi.value === '')) return err('請選擇出生時間，或勾選「不確定時辰」');
    if (!g) return err('請選擇性別');
    if (!email && !line) return err('Email 與 LINE ID 請至少填一項');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Email 格式不正確');
    if (!f.consent.checked) return err('請勾選同意個資蒐集告知');
    var birth = { y: +f.by.value, m: +f.bm.value, d: +f.bd.value, h: unk ? null : +f.bh.value, mi: unk ? null : +f.bmi.value, timeKnown: !unk, gender: g };
    var btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = '虎爺降駕中…';
    dataReady.then(function (data) {
      var r = T.compute(birth, data);
      render(r, name);
      send(r, { name: name, email: email, line: line, optin: f.optin.checked, birth: birth, hp: (f.hp_zx91 && f.hp_zx91.value) || '' });
    }).catch(function (e) { console.error(e); err('排盤資料載入失敗，請重新整理頁面再試一次'); })
      .then(function () { btn.disabled = false; btn.textContent = '開始排盤・恭迎虎爺'; });
  });

  function render(r, name) {
    var a = r.an, p = r.bazi.pillars;
    $('drawDate').textContent = r.draw.label;
    $('balls').innerHTML = r.picks.map(function (pk) {
      return '<div class="ball"><span class="n">' + p2(pk.best.n) + '</span><span class="e">' + pk.el + '</span></div>';
    }).join('');
    var cols = [['年柱', p.year], ['月柱', p.month], ['日柱', p.day], ['時柱', p.hour]];
    $('pillars').innerHTML = '<tr>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr>' +
      '<tr>' + cols.map(function (c, i) { return '<td' + (i === 2 ? ' class="dm"' : '') + '>' + (c[1] ? c[1][0] : '－') + '</td>'; }).join('') + '</tr>' +
      '<tr>' + cols.map(function (c, i) { return '<td' + (i === 2 ? ' class="dm"' : '') + '>' + (c[1] ? c[1][1] : '－') + '</td>'; }).join('') + '</tr>' +
      '<tr>' + cols.map(function (c) { return '<td class="el">' + (c[1] ? T.STEM_EL[c[1][0]] + T.BR_EL[c[1][1]] : '時辰不詳') + '</td>'; }).join('') + '</tr>';
    var mx = Math.max.apply(null, ['木', '火', '土', '金', '水'].map(function (e) { return a.count[e]; })) || 1;
    $('elbars').innerHTML = ['木', '火', '土', '金', '水'].map(function (e) {
      var xy = e === a.xi.e || e === a.yong.e;
      return '<div class="bar' + (xy ? ' xy' : '') + '"><span>' + e + '</span><i style="width:' + Math.max(4, a.count[e] / mx * 70) + '%"></i>' + a.count[e] + (xy ? '　★喜用' : '') + '</div>';
    }).join('');
    var tails = function (e) { return T.TAIL[e].join('、'); };
    var nm = esc(name);
    var html = [];
    html.push('<p><b>' + nm + '</b>，你的日主為「<b>' + a.dayMaster + a.dmEl + '</b>」（' + (r.bazi.pillars.hour ? '' : '時辰不詳，以三柱論；') +
      '月令' + p.month[1] + '屬' + T.BR_EL[p.month[1]] + '）。命盤中幫身的' + a.rel.比劫 + '（比劫）與' + a.rel.印 + '（印）共 ' + a.support + ' 分，佔全盤 ' + a.total + ' 分的' +
      (a.strong ? '一半以上，屬<b>身強</b>，宜洩、宜耗，' : '不到一半，屬<b>身弱</b>，宜生、宜扶，') + '故取 <b>' + a.xi.e + '</b>（' + a.xi.k + '）為喜、<b>' + a.yong.e + '</b>（' + a.yong.k + '）為用。</p>');
    html.push('<p>依河圖數，' + a.xi.e + '對應尾數 ' + tails(a.xi.e) + '，' + a.yong.e + '對應尾數 ' + tails(a.yong.e) + '。虎爺在這兩組號碼中，參考今彩539自 ' +
      DATA.first_draw.slice(0, 4) + '年以來共 ' + DATA.total_draws + ' 期開獎紀錄的冷熱，並以你恭迎虎爺的此刻「<b>' + r.shichen.slice(0, 2) + '</b>」（' + r.nowGz + '時，屬' + r.shichenEl + '）落定：</p>');
    r.picks.forEach(function (pk) {
      html.push('<p>◆ <b>' + p2(pk.best.n) + '</b>：尾數 ' + (pk.best.n % 10) + ' 屬' + pk.el + '，合你的' + (pk.el === a.xi.e ? '喜神' : '用神') +
        '；歷史開出 ' + pk.best.all + ' 次（平均約 ' + r.avgAll + '）、近 ' + DATA.recent_window + ' 期開出 ' + pk.best.recent + ' 次（平均約 ' + r.avgRecent + '）。</p>');
    });
    if (r.shichenEl === a.xi.e || r.shichenEl === a.yong.e) html.push('<p>此刻' + r.shichen.slice(0, 2) + '屬' + r.shichenEl + '，正合你的喜用，虎爺加持。</p>');
    if (r.bazi.dst) html.push('<p class="fine">※ 你的生日落在台灣夏令時間期間，已自動將出生時間減 1 小時排盤。</p>');
    html.push('<p class="fine">※ 同一組生辰在同一時辰、同一期別所得號碼相同；換時辰或換期別，虎爺會重新落定。號碼為命理與統計的娛樂解讀，彩券開獎為隨機，<b>不保證中獎</b>。</p>');
    $('explain').innerHTML = html.join('');
    f.hidden = true; $('result').hidden = false;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var sendTimer = null;
  function send(r, u) {
    var st = $('sendStatus');
    if (u.hp) { st.className = 'send'; st.textContent = ''; return; } // 機器人
    if (!C.ENDPOINT) { st.className = 'send'; st.textContent = ''; return; }
    var payload = {
      ts: r.now.iso, name: u.name, email: u.email, line: u.line, optin: u.optin ? 'Y' : 'N', consent: 'Y',
      birth_date: u.birth.y + '-' + (u.birth.m < 10 ? '0' : '') + u.birth.m + '-' + (u.birth.d < 10 ? '0' : '') + u.birth.d,
      birth_time: u.birth.timeKnown ? (u.birth.h < 10 ? '0' : '') + u.birth.h + ':' + (u.birth.mi < 10 ? '0' : '') + u.birth.mi : '不確定',
      gender: u.birth.gender, bazi: [r.bazi.pillars.year, r.bazi.pillars.month, r.bazi.pillars.day, r.bazi.pillars.hour || '--'].join(' '),
      day_master: r.an.dayMaster + r.an.dmEl, xi_yong: r.an.xi.e + r.an.yong.e, numbers: r.numbers.map(p2).join(','),
      draw_date: r.draw.iso, shichen: r.shichenBranch, source: location.search.slice(1, 120), ua: navigator.userAgent.slice(0, 160),
      passphrase_ok: unlockedDate ? 'Y' : ''
    };
    function showOk() {
      st.className = 'send ok';
      st.textContent = '已登記虎爺名冊 ✔';
    }
    function showFail() {
      st.className = 'send fail';
      st.textContent = '';
      var p = document.createElement('p');
      p.style.margin = '0 0 8px';
      p.appendChild(document.createTextNode('名冊登記失敗，請再試一次。若仍不行，請'));
      var a = document.createElement('a');
      a.href = C.FB_URL || 'https://www.facebook.com/1418130474718466';
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = '私訊 Facebook 粉專「財神幻湮宮-今彩539聚地」';
      p.appendChild(a);
      p.appendChild(document.createTextNode('，我們會幫你補登記。號碼仍可先記下。'));
      st.appendChild(p);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ghost';
      btn.id = 'sendRetry';
      btn.textContent = '再試一次';
      btn.onclick = function () { send(r, u); };
      st.appendChild(btn);
    }
    st.className = 'send';
    st.textContent = '正在為你登記虎爺名冊…';
    if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
    var ctrl = window.AbortController ? new AbortController() : null;
    sendTimer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    // text/plain + 一般 fetch（非 no-cors）：Apps Script 會 302 到可讀 JSON；只在 {"ok":true} 時顯示已登記
    fetch(C.ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl && ctrl.signal, redirect: 'follow' })
      .then(function (res) {
        return res.text().then(function (t) {
          var data = null;
          try { data = JSON.parse(t); } catch (e) {}
          if (res.ok && data && data.ok === true) showOk();
          else showFail();
        });
      })
      .catch(function () { showFail(); })
      .then(function () { if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; } });
  }

  $('again').onclick = function () { $('result').hidden = true; f.hidden = false; f.scrollIntoView({ behavior: 'smooth' }); };
})();
