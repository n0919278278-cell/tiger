/* 財神幻湮宮｜官網門面互動 */
(function () {
  var C = window.PALACE_CONFIG || window.TIGER_CONFIG || {};
  var B = window.PalaceBooking;
  var f = document.getElementById('f');
  var $ = function (id) { return document.getElementById(id); };
  var err = $('err');
  var qty = 0;
  var lock = false;
  var sending = false;
  var preOpened = false;
  var summaryText = '';

  function field(name) { return f.elements[name]; }
  function svc(id) { return document.querySelector('.svc-input[data-id="' + id + '"]'); }

  function roc(y) {
    if (y >= 1912) return '民國' + (y - 1911) + '年（' + y + '）';
    return '民國前' + (1912 - y) + '年（' + y + '）';
  }
  function addOpt(sel, value, text) {
    var o = document.createElement('option');
    o.value = String(value);
    o.textContent = text;
    sel.appendChild(o);
  }
  var nowY = B.taipeiParts().y;
  for (var y = nowY; y >= 1912; y--) addOpt(field('by'), y, roc(y));
  for (var m = 1; m <= 12; m++) addOpt(field('bm'), m, m + '月');
  B.SHICHEN.forEach(function (s) { addOpt(field('shichen'), s.id, s.label); });
  function fillDays() {
    var yy = parseInt(field('by').value, 10) || nowY;
    var mm = parseInt(field('bm').value, 10) || 1;
    var keep = field('bd').value;
    var dim = new Date(yy, mm, 0).getDate();
    while (field('bd').options.length > 1) field('bd').remove(1);
    for (var d = 1; d <= dim; d++) addOpt(field('bd'), d, d + '日');
    if (keep && parseInt(keep, 10) <= dim) field('bd').value = keep;
  }
  fillDays();
  field('by').addEventListener('change', fillDays);
  field('bm').addEventListener('change', fillDays);

  var contact = document.querySelector('.contact-note');
  if (contact) contact.textContent = C.CONTACT_NOTE || '私訊粉專「財神幻湮宮-今彩539聚地」';

  function applyLinks() {
    var map = {
      fb: C.FB_URL,
      ig: C.IG_URL,
      yt: C.YT_URL,
      portaly: C.PORTALY_URL,
      messenger: C.MESSENGER_URL || C.FB_URL
    };
    Object.keys(map).forEach(function (key) {
      var url = map[key];
      document.querySelectorAll('[data-link="' + key + '"]').forEach(function (a) {
        if (url) { a.href = url; a.hidden = false; }
        else a.hidden = true;
      });
    });
  }
  applyLinks();

  function readInput() {
    var flags = {};
    document.querySelectorAll('.svc-input').forEach(function (el) {
      flags[el.getAttribute('data-id')] = el.checked;
    });
    var pre = '';
    if ($('preDone').checked) pre = 'done';
    else if ($('preAddon').checked) pre = 'addon';
    var genderEl = f.querySelector('input[name=gender]:checked');
    return {
      name: field('name').value,
      y: field('by').value,
      m: field('bm').value,
      d: field('bd').value,
      shichenId: field('shichen').value,
      timeUnknown: field('unknownTime').checked,
      gender: genderEl ? genderEl.value : '',
      address: field('address').value,
      phone: field('phone').value,
      line: field('line').value,
      email: field('email').value,
      storeName: field('store_name').value,
      storeCode: field('store_code').value,
      note: field('note').value,
      consent: field('consent').checked,
      marketing: field('optin').checked,
      flags: flags,
      incenseQty: qty,
      pre: pre,
      honeypot: field('hp_zx91').value,
      source: location.search.replace(/^\?/, ''),
      ua: navigator.userAgent
    };
  }

  function paint() {
    document.querySelectorAll('.svc').forEach(function (lab) {
      lab.classList.toggle('on', lab.querySelector('input').checked);
    });
    document.querySelectorAll('.seg label').forEach(function (lab) {
      lab.classList.toggle('on', lab.querySelector('input').checked);
    });
  }

  function refresh() {
    var input = readInput();
    var q = B.quote(input);
    var raw = B.rawFlags(input);
    var lines = $('estLines');
    lines.textContent = '';
    q.items.forEach(function (it) {
      var li = document.createElement('li');
      var extra = it.qty > 1 ? ' × ' + it.qty : '';
      li.textContent = it.name + extra + '　' + B.ntd(it.amount);
      lines.appendChild(li);
    });
    $('estEmpty').hidden = q.items.length > 0;
    $('estTotal').textContent = '合計 ' + B.ntd(q.total);
    $('stickyTotal').textContent = B.ntd(q.total);
    $('storeBlock').hidden = q.qty === 0;
    $('incenseQty').textContent = String(q.qty);
    var need = B.needsBase(raw);
    var box = $('preBox');
    box.hidden = !need;
    if (need) {
      var names = B.SERVICES.filter(function (s) { return s.needsBase && raw[s.id]; }).map(function (s) { return s.name; });
      $('preLead').textContent = '您選了「' + names.join('、') + '」。這些項目開始前，必須先完成基礎清理淨化，不可繞過。請勾選下面其中一項，才能送出。';
      if (input.pre === 'done') $('preState').textContent = '已確認：您近期已在本宮完成基礎清理淨化，本次不加收 NT$300。';
      else if (q.flags.base) $('preState').textContent = '已確認：本次會一併安排基礎清理淨化（NT$300）。';
      else $('preState').textContent = '尚未確認。未勾選其中一項就不能送出。';
      box.classList.toggle('ok', input.pre === 'done' || !!q.flags.base);
      if (!preOpened) {
        preOpened = true;
        box.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
    paint();
  }

  function syncFromBase() {
    if (lock) return;
    lock = true;
    if (svc('base').checked) {
      $('preDone').checked = false;
      $('preAddon').checked = true;
    } else if (!$('preDone').checked) {
      $('preAddon').checked = false;
    }
    lock = false;
    refresh();
  }

  document.querySelectorAll('.svc-input').forEach(function (el) {
    el.addEventListener('change', function () {
      if (!sending) err.textContent = '';
      if (el.getAttribute('data-id') === 'base') syncFromBase();
      else refresh();
    });
  });
  $('preAddon').addEventListener('change', function () {
    if (lock) return;
    lock = true;
    if (this.checked) {
      $('preDone').checked = false;
      svc('base').checked = true;
    } else svc('base').checked = false;
    lock = false;
    if (!sending) err.textContent = '';
    refresh();
  });
  $('preDone').addEventListener('change', function () {
    if (lock) return;
    lock = true;
    if (this.checked) {
      $('preAddon').checked = false;
      svc('base').checked = false;
    }
    lock = false;
    if (!sending) err.textContent = '';
    refresh();
  });
  field('unknownTime').addEventListener('change', function () {
    field('shichen').disabled = this.checked;
    if (this.checked) field('shichen').value = '';
  });
  f.addEventListener('input', function () { if (!sending) err.textContent = ''; });
  f.addEventListener('change', refresh);

  function setQty(n) {
    qty = Math.max(0, Math.min(B.INCENSE_MAX, n));
    if (!sending) err.textContent = '';
    refresh();
  }
  $('qtyMinus').addEventListener('click', function () { setQty(qty - 1); });
  $('qtyPlus').addEventListener('click', function () { setQty(qty + 1); });

  function showErrors(list) {
    err.textContent = '';
    if (!list || !list.length) return;
    var p = document.createElement('p');
    p.textContent = '請先補齊下面幾項：';
    var ul = document.createElement('ul');
    list.forEach(function (msg) {
      var li = document.createElement('li');
      li.textContent = msg;
      ul.appendChild(li);
    });
    err.appendChild(p);
    err.appendChild(ul);
    err.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function setBusy(on) {
    sending = on;
    $('submitBtn').disabled = on;
    $('stickyGo').disabled = on;
    $('submitBtn').textContent = on ? '送出中，請稍候…' : '送出預約登記';
  }

  function showOk(built) {
    summaryText = built.summary;
    $('successSummary').textContent = built.summary;
    $('copyMsg').textContent = '';
    var lineUrl = 'https://line.me/R/msg/text/?' + encodeURIComponent(built.summary);
    $('lineGo').href = lineUrl;
    f.hidden = true;
    $('success').hidden = false;
    $('sticky').hidden = true;
    $('success').scrollIntoView({ block: 'start', behavior: 'smooth' });
    setBusy(false);
  }

  function showFail() {
    setBusy(false);
    var fb = C.FB_NAME || '財神幻湮宮-今彩539聚地';
    showErrors(['預約沒有送出成功，請再按一次。若仍失敗，請私訊 FB 粉專「' + fb + '」，我們會幫您登記。']);
  }

  var sendTimer = null;
  function send(built) {
    if (built.payload && field('hp_zx91').value) { showFail(); return; }
    if (!C.ENDPOINT) { showFail(); return; }
    setBusy(true);
    if (sendTimer) clearTimeout(sendTimer);
    var ctrl = window.AbortController ? new AbortController() : null;
    sendTimer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    fetch(C.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(built.payload),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.text().then(function (t) {
        var data = null;
        try { data = JSON.parse(t); } catch (e) {}
        if (res.ok && data && data.ok === true) showOk(built);
        else showFail();
      });
    }).catch(function () { showFail(); })
      .then(function () { if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; } });
  }

  f.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) return;
    var input = readInput();
    var check = B.validate(input);
    if (check.bot) return showErrors(['無法送出，請改私訊粉專，我們會協助您登記。']);
    if (!check.ok) return showErrors(check.errors);
    var built = B.build(input);
    if (built.total >= 12000) {
      var sure = window.confirm('本次合計 ' + B.ntd(built.total) + '。金額較高，確定送出預約登記嗎？');
      if (!sure) return;
    }
    send(built);
  });

  $('stickyGo').addEventListener('click', function () {
    if (!$('success').hidden) return;
    if (f.requestSubmit) f.requestSubmit();
    else f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function selectSummary() {
    var pre = $('successSummary');
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(pre);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function copySummary() {
    var text = $('successSummary').textContent || summaryText;
    selectSummary();
    var done = function () { $('copyMsg').textContent = '已複製，可以貼到 FB 或 LINE。'; };
    var fail = function () { $('copyMsg').textContent = '按鈕沒有複製成功，摘要已選取，請長按後選擇複製。'; };
    var afterFallback = function () { fallbackCopy(text) ? done() : fail(); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, afterFallback);
    } else afterFallback();
  }
  $('copyTop').addEventListener('click', copySummary);
  $('copyBottom').addEventListener('click', copySummary);

  $('back').addEventListener('click', function () {
    $('success').hidden = true;
    f.hidden = false;
    $('sticky').hidden = false;
    f.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  refresh();
})();
