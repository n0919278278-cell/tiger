/* 幻湮宮｜虎爺賜號 — 頁面互動 */
(function () {
  var C = window.TIGER_CONFIG || {}, T = window.TigerCalc(window), DATA = null;
  var f = document.getElementById('f'), $ = function (id) { return document.getElementById(id); };
  var nowT = T.taipeiNow();
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
  document.querySelector('.contact-note').textContent = C.CONTACT_NOTE || '私訊幻湮宮';
  ['ig', 'fb', 'yt'].forEach(function (k) { var a = $(k), u = C[k.toUpperCase() + '_URL']; if (u) a.href = u; else a.hidden = true; });

  var dataReady = fetch('data.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) { DATA = d; return d; });

  function err(msg) { $('err').textContent = msg; if (msg) $('err').scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  f.addEventListener('submit', function (ev) {
    ev.preventDefault(); err('');
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
      send(r, { name: name, email: email, line: line, optin: f.optin.checked, birth: birth, hp: f.website.value });
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

  function send(r, u) {
    var st = $('sendStatus');
    if (u.hp) { st.textContent = ''; return; } // 機器人
    if (!C.ENDPOINT) { st.textContent = ''; return; }
    var payload = {
      ts: r.now.iso, name: u.name, email: u.email, line: u.line, optin: u.optin ? 'Y' : 'N', consent: 'Y',
      birth_date: u.birth.y + '-' + (u.birth.m < 10 ? '0' : '') + u.birth.m + '-' + (u.birth.d < 10 ? '0' : '') + u.birth.d,
      birth_time: u.birth.timeKnown ? (u.birth.h < 10 ? '0' : '') + u.birth.h + ':' + (u.birth.mi < 10 ? '0' : '') + u.birth.mi : '不確定',
      gender: u.birth.gender, bazi: [r.bazi.pillars.year, r.bazi.pillars.month, r.bazi.pillars.day, r.bazi.pillars.hour || '--'].join(' '),
      day_master: r.an.dayMaster + r.an.dmEl, xi_yong: r.an.xi.e + r.an.yong.e, numbers: r.numbers.map(p2).join(','),
      draw_date: r.draw.iso, shichen: r.shichenBranch, source: location.search.slice(1, 120), ua: navigator.userAgent.slice(0, 160)
    };
    st.textContent = '正在為你登記虎爺名冊…';
    var ctrl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { ctrl && ctrl.abort(); }, 10000);
    // text/plain + no-cors：Apps Script 不需 CORS 預檢；回應不可讀，送出即視為成功
    fetch(C.ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload), signal: ctrl && ctrl.signal })
      .then(function () { st.textContent = '已登記虎爺名冊 ✔'; })
      .catch(function () { st.textContent = '（名冊登記暫時失敗，不影響你的號碼）'; })
      .then(function () { clearTimeout(to); });
  }

  $('again').onclick = function () { $('result').hidden = true; f.hidden = false; f.scrollIntoView({ behavior: 'smooth' }); };
})();
