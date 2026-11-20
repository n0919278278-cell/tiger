/* 財神幻湮宮｜預約計價、檢核、試算表欄位打包（瀏覽器與 Node 共用）
 * 舊版 Google Apps Script 只會收下固定鍵，且每個欄位約 200 字。
 * 服務、地址、7-11、備註必須寫進 numbers／draw_date（target_period）等既有欄位。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.PalaceBooking = factory();
})(this, function () {
  var SERVICES = [
    { id: 'base', name: '基礎清理淨化', price: 300, group: 'remote', needsBase: false },
    { id: 'group', name: '團體祈福', price: 600, group: 'remote', needsBase: true },
    { id: 'deep', name: '深層強力清理淨化', price: 1200, group: 'remote', needsBase: true },
    { id: 'boost', name: '強力補運', price: 2400, group: 'remote', needsBase: true },
    { id: 'wealth', name: '五路財神補財庫', price: 3600, group: 'remote', needsBase: true },
    { id: 'd3', name: '三日持咒秘儀加持', price: 12000, group: 'personal', needsBase: true },
    { id: 'd7', name: '七日持咒秘儀加持', price: 36000, group: 'personal', needsBase: true }
  ];
  var BY_ID = {};
  SERVICES.forEach(function (s) { BY_ID[s.id] = s; });
  var INCENSE_PRICE = 888;
  var SHIPPING = 60;
  var INCENSE_MAX = 10;
  var LEGACY_MAX = 190;
  var SHICHEN = [
    { id: '子', label: '子時（23:00–01:00）' },
    { id: '丑', label: '丑時（01:00–03:00）' },
    { id: '寅', label: '寅時（03:00–05:00）' },
    { id: '卯', label: '卯時（05:00–07:00）' },
    { id: '辰', label: '辰時（07:00–09:00）' },
    { id: '巳', label: '巳時（09:00–11:00）' },
    { id: '午', label: '午時（11:00–13:00）' },
    { id: '未', label: '未時（13:00–15:00）' },
    { id: '申', label: '申時（15:00–17:00）' },
    { id: '酉', label: '酉時（17:00–19:00）' },
    { id: '戌', label: '戌時（19:00–21:00）' },
    { id: '亥', label: '亥時（21:00–23:00）' }
  ];
  var SHICHEN_BY_ID = {};
  SHICHEN.forEach(function (s) { SHICHEN_BY_ID[s.id] = s; });

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ntd(n) {
    var s = String(Math.round(n));
    return 'NT$' + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function tidy(s) {
    return String(s || '').replace(/\u3000/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim();
  }
  function asciiDigits(s) {
    return String(s || '').replace(/[０-９]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
  }
  function normPhone(s) {
    var d = asciiDigits(s).replace(/[\s\-()]/g, '');
    if (d.indexOf('+886') === 0) d = '0' + d.slice(4);
    return d;
  }
  function clip(s, n) {
    s = String(s || '');
    if (s.length <= n) return s;
    return s.slice(0, Math.max(0, n - 1)) + '…';
  }
  function taipeiParts(date) {
    var t = new Date((date || new Date()).getTime() + 8 * 3600 * 1000);
    return {
      y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
      h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds()
    };
  }
  function taipeiStamp(date) {
    var p = taipeiParts(date);
    return p.y + '-' + pad(p.m) + '-' + pad(p.d) + ' ' + pad(p.h) + ':' + pad(p.mi);
  }
  function taipeiIso(date) {
    var p = taipeiParts(date);
    return p.y + '-' + pad(p.m) + '-' + pad(p.d) + 'T' + pad(p.h) + ':' + pad(p.mi) + ':' + pad(p.s) + '+08:00';
  }
  function rawFlags(input) {
    var flags = {};
    SERVICES.forEach(function (s) { flags[s.id] = !!(input.flags && input.flags[s.id]); });
    return flags;
  }
  function needsBase(flags) {
    return SERVICES.some(function (s) { return s.needsBase && flags[s.id]; });
  }
  function effectiveFlags(input) {
    var flags = rawFlags(input);
    if (input.pre === 'addon') flags.base = true;
    if (input.pre === 'done') flags.base = false;
    return flags;
  }
  function clampQty(n) {
    n = parseInt(n, 10);
    if (!isFinite(n) || n < 0) return 0;
    if (n > INCENSE_MAX) return INCENSE_MAX;
    return n;
  }
  function quote(input) {
    input = input || {};
    var flags = effectiveFlags(input);
    var qty = clampQty(input.incenseQty);
    var items = [];
    SERVICES.forEach(function (s) {
      if (!flags[s.id]) return;
      items.push({ id: s.id, name: s.name, price: s.price, qty: 1, amount: s.price });
    });
    if (qty > 0) {
      items.push({ id: 'incense', name: '持咒開運香粉', price: INCENSE_PRICE, qty: qty, amount: INCENSE_PRICE * qty });
      items.push({ id: 'ship', name: '7-11 店到店運費', price: SHIPPING, qty: 1, amount: SHIPPING });
    }
    var sum = 0;
    items.forEach(function (it) { sum += it.amount; });
    return { items: items, total: sum, flags: flags, qty: qty, needsBase: needsBase(rawFlags(input)) };
  }
  function preCleanLabel(input, flags) {
    if (flags.base) return '本次含基礎清理淨化';
    if (input.pre === 'done') return '近期已完成基礎清理淨化';
    return '無';
  }
  function servicePacked(items, total) {
    var parts = items.map(function (it) {
      if (it.id === 'incense') return '開運香粉x' + it.qty + ntd(it.amount);
      if (it.id === 'ship') return '運費' + ntd(it.amount);
      return it.name + ntd(it.amount);
    });
    parts.push('合計' + ntd(total));
    return clip('服務:' + parts.join('、'), LEGACY_MAX);
  }
  function packTarget(address, store, note) {
    var aMax = 100, sMax = 36, nMax = 41;
    function cut(s, n) {
      s = tidy(s) || '無';
      return clip(s, n);
    }
    return '地址:' + cut(address, aMax) + '｜7-11:' + cut(store, sMax) + '｜備註:' + cut(note, nMax);
  }
  function validDate(y, m, d) {
    if (!y || !m || !d) return false;
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  function validate(input) {
    input = input || {};
    var errors = [];
    if (tidy(input.honeypot)) return { ok: false, bot: true, errors: errors };
    var name = tidy(input.name);
    var raw = rawFlags(input);
    var flags = effectiveFlags(input);
    var phoneRaw = tidy(input.phone);
    var phone = normPhone(phoneRaw);
    var line = tidy(input.line);
    var email = tidy(input.email);
    var address = tidy(input.address);
    var note = tidy(input.note);
    var storeName = tidy(input.storeName);
    var storeCode = asciiDigits(input.storeCode || '').replace(/\s+/g, '');
    if (!name) errors.push('請填寫姓名或稱呼');
    else if (name.length > 30) errors.push('姓名或稱呼請在 30 字以內');
    var y = parseInt(input.y, 10), m = parseInt(input.m, 10), d = parseInt(input.d, 10);
    if (!validDate(y, m, d)) errors.push('請選擇完整的出生年月日');
    else if (y < 1912 || y > taipeiParts(input.now).y) errors.push('出生年份不正確');
    if (!input.timeUnknown && !SHICHEN_BY_ID[input.shichenId]) errors.push('請選擇出生時辰，或勾選「不確定時辰」');
    if (input.gender !== '男' && input.gender !== '女' && input.gender !== '其他') errors.push('請選擇性別');
    if (!address) errors.push('請填寫居住地址（遠端定位與祈福用）');
    else if (address.length < 8) errors.push('地址請寫到縣市、區與街道，至少 8 個字');
    else if (address.length > 100) errors.push('地址請在 100 字以內');
    if (!phoneRaw && !line && !email) errors.push('手機、LINE ID、Email 請至少填一項');
    if (phoneRaw && !/^09\d{8}$/.test(phone) && !/^0\d{8,9}$/.test(phone)) errors.push('手機號碼格式不正確，請填 09 開頭的 10 碼');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email 格式不正確');
    if (line && (line.length < 2 || line.length > 40)) errors.push('LINE ID 請填 2 到 40 個字');
    if (note.length > 120) errors.push('備註請在 120 字以內');
    if (/\d{13,19}/.test(note.replace(/\s+/g, ''))) errors.push('請勿在備註填寫信用卡號或長串數字');
    var qtyNum = Number(input.incenseQty);
    if (!isFinite(qtyNum) || qtyNum < 0 || qtyNum > INCENSE_MAX || Math.floor(qtyNum) !== qtyNum) {
      errors.push('香粉數量請填 0 到 ' + INCENSE_MAX + ' 的整數');
    }
    var wantIncense = qtyNum > 0;
    if (wantIncense) {
      if (storeName.length < 2) errors.push('請填寫 7-11 取貨門市名稱');
      else if (storeName.length > 24) errors.push('門市名稱請在 24 字以內');
      if (!/^\d{4,8}$/.test(storeCode)) errors.push('請填寫 7-11 店號（4 到 8 位數字）');
    }
    var anyService = SERVICES.some(function (s) { return raw[s.id]; }) || input.pre === 'addon' || wantIncense;
    if (!anyService) errors.push('請至少勾選一項服務，或選擇香粉數量');
    if (input.pre === 'done' && raw.base) errors.push('「加購基礎清理淨化」與「我近期已完成」請只勾選一項');
    if (needsBase(raw) && !flags.base && input.pre !== 'done') {
      errors.push('您選的項目須先完成基礎清理淨化。請加購 NT$300，或勾選「我近期已在本宮完成過基礎清理淨化」');
    }
    if (!input.consent) errors.push('請勾選同意個資與服務告知');
    return { ok: errors.length === 0, bot: false, errors: errors };
  }
  function build(input, now) {
    now = now || input.now || new Date();
    var q = quote(input);
    var flags = q.flags;
    var phone = normPhone(input.phone);
    var line = tidy(input.line);
    var email = tidy(input.email);
    var lineForSheet = line;
    if (!lineForSheet && !email && phone) lineForSheet = '手機:' + phone;
    var y = parseInt(input.y, 10), m = parseInt(input.m, 10), d = parseInt(input.d, 10);
    var birthDate = (y && m && d) ? (y + '-' + pad(m) + '-' + pad(d)) : '';
    var birthTime = input.timeUnknown ? '不確定' : (SHICHEN_BY_ID[input.shichenId] ? SHICHEN_BY_ID[input.shichenId].label : '');
    var address = tidy(input.address);
    var note = tidy(input.note);
    var storeName = q.qty > 0 ? tidy(input.storeName) : '';
    var storeCode = q.qty > 0 ? asciiDigits(input.storeCode || '').replace(/\s+/g, '') : '';
    var storeText = storeName ? (storeName + '／' + storeCode) : '無';
    var preLabel = preCleanLabel(input, flags);
    var opt = input.marketing ? 'Y' : 'N';
    var numbers = servicePacked(q.items, q.total);
    var target = packTarget(address, storeText, note || '無');
    var servicesText = q.items.map(function (it) {
      var qty = it.qty > 1 ? ' x' + it.qty : '';
      return it.name + qty + ' ' + ntd(it.amount);
    }).join('；');
    if (!servicesText) servicesText = '無';
    servicesText += '；合計 ' + ntd(q.total);
    var payload = {
      ts: taipeiIso(now),
      name: clip(tidy(input.name), 30),
      email: email,
      line: lineForSheet,
      line_id: lineForSheet,
      optin: opt,
      marketing_opt_in: opt,
      consent: input.consent ? 'Y' : '',
      birth_date: birthDate,
      birth_time: birthTime,
      gender: input.gender || '',
      bazi: clip('7-11:' + storeText, LEGACY_MAX),
      day_master: clip('手機:' + (phone || '無') + '；前置:' + preLabel, LEGACY_MAX),
      xi_yong: clip('備註:' + (note || '無'), LEGACY_MAX),
      numbers: numbers,
      draw_date: target,
      target_period: target,
      shichen: clip(birthTime, LEGACY_MAX),
      source: clip(tidy(input.source) || '官網', 120),
      ua: clip(String(input.ua || ''), 160),
      passphrase_ok: '',
      services_text: servicesText,
      address: address,
      store_name: storeName,
      store_code: storeCode,
      note: note,
      phone: phone,
      incense_qty: String(q.qty),
      shipping_fee: String(q.qty > 0 ? SHIPPING : 0),
      total: String(q.total),
      pre_clean: preLabel
    };
    var summary = buildSummary(input, q, payload, now);
    return { payload: payload, summary: summary, items: q.items, total: q.total, qty: q.qty };
  }
  function buildSummary(input, q, payload, now) {
    var lines = [];
    lines.push('【財神幻湮宮・預約摘要】');
    lines.push('送出時間：' + taipeiStamp(now) + '（台北）');
    lines.push('姓名：' + payload.name);
    lines.push('出生日期：' + payload.birth_date);
    lines.push('出生時辰：' + payload.birth_time);
    lines.push('性別：' + payload.gender);
    lines.push('居住地址：' + payload.address);
    lines.push('手機：' + (payload.phone || '未填'));
    lines.push('LINE ID：' + (tidy(input.line) || '未填'));
    lines.push('Email：' + (payload.email || '未填'));
    lines.push('');
    lines.push('預約項目：');
    if (!q.items.length) lines.push('（無）');
    q.items.forEach(function (it, i) {
      var qty = it.qty > 1 ? ' × ' + it.qty : '';
      lines.push((i + 1) + '. ' + it.name + qty + '　' + ntd(it.amount));
    });
    lines.push('合計：' + ntd(q.total));
    lines.push('前置清理：' + payload.pre_clean);
    if (q.qty > 0) {
      lines.push('7-11 取貨門市：' + payload.store_name);
      lines.push('7-11 店號：' + payload.store_code);
      lines.push('香粉運費：已含 7-11 店到店 NT$60');
    }
    lines.push('祈福或改善事項：' + (payload.note || '未填'));
    lines.push('');
    lines.push('付款：綠界線上刷卡／付款審核開通中。請將這則摘要私訊 FB 粉專「財神幻湮宮-今彩539聚地」或傳 LINE，確認付款與排程。請勿在對話中留下信用卡號。');
    return lines.join('\n');
  }

  return {
    SERVICES: SERVICES,
    BY_ID: BY_ID,
    SHICHEN: SHICHEN,
    INCENSE_PRICE: INCENSE_PRICE,
    SHIPPING: SHIPPING,
    INCENSE_MAX: INCENSE_MAX,
    LEGACY_MAX: LEGACY_MAX,
    ntd: ntd,
    tidy: tidy,
    normPhone: normPhone,
    taipeiParts: taipeiParts,
    taipeiStamp: taipeiStamp,
    quote: quote,
    needsBase: needsBase,
    rawFlags: rawFlags,
    validate: validate,
    build: build,
    packTarget: packTarget
  };
});
