/* 幻湮宮｜虎爺賜號 — 計算核心（瀏覽器與 Node 共用）
 * 依賴 lunar-javascript（vendor/lunar.js，MIT）。
 * 規則說明見 README.md「號碼怎麼算」。 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory;
  else root.TigerCalc = factory;
})(this, function (L) {
  var Solar = L.Solar;
  var STEMS = '甲乙丙丁戊己庚辛壬癸', BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
  var STEM_EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  var BR_EL = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  var ELS = ['木', '火', '土', '金', '水'];
  var GEN = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };   // 我生
  var CTL = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };   // 我剋
  function inv(m, v) { for (var k in m) if (m[k] === v) return k; }
  // 河圖數 / 尾數：1,6水 2,7火 3,8木 4,9金 5,0土
  var TAIL = { 水: [1, 6], 火: [2, 7], 木: [3, 8], 金: [4, 9], 土: [5, 0] };
  var SHICHEN = ['子時(23-01)', '丑時(01-03)', '寅時(03-05)', '卯時(05-07)', '辰時(07-09)', '巳時(09-11)',
    '午時(11-13)', '未時(13-15)', '申時(15-17)', '酉時(17-19)', '戌時(19-21)', '亥時(21-23)'];
  var WEEK = '日一二三四五六';

  // 台灣夏令時間（日光節約）期間，出生鐘錶時間需減 1 小時
  var TW_DST = [[1945, 1951, '05-01', '09-30'], [1952, 1952, '03-01', '10-31'], [1953, 1954, '04-01', '10-31'],
    [1955, 1959, '04-01', '09-30'], [1960, 1961, '06-01', '09-30'], [1974, 1975, '04-01', '09-30'], [1979, 1979, '07-01', '09-30']];
  function isTwDst(y, m, d) {
    var md = (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
    for (var i = 0; i < TW_DST.length; i++) { var r = TW_DST[i]; if (y >= r[0] && y <= r[1] && md >= r[2] && md <= r[3]) return true; }
    return false;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // 以 Asia/Taipei 取得「現在」的年月日時分與星期（不受手機時區影響）
  function taipeiNow(date) {
    date = date || new Date();
    var t = new Date(date.getTime() + 8 * 3600 * 1000); // UTC+8，台灣無夏令時間
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds(), wd: t.getUTCDay(),
      iso: t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()) + 'T' + pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()) + ':' + pad(t.getUTCSeconds()) + '+08:00' };
  }
  function shichenIndex(h) { return Math.floor((h + 1) / 2) % 12; }

  // 下一期今彩539開獎日（週一至週六 20:30 左右開獎；當天 20:00 後算下一期；週日不開）
  function nextDrawDate(now, lastDraw) {
    var d = new Date(Date.UTC(now.y, now.m - 1, now.d));
    if (now.h >= 20 || now.wd === 0) d.setUTCDate(d.getUTCDate() + 1);
    function iso(x) { return x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate()); }
    for (var guard = 0; guard < 10; guard++) {
      if (d.getUTCDay() !== 0 && (!lastDraw || iso(d) > lastDraw)) break;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return { iso: iso(d), label: d.getUTCFullYear() + '/' + pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate()) + '（週' + WEEK[d.getUTCDay()] + '）' };
  }

  // FNV-1a 32-bit + mulberry32 → [0,1) 決定性亂數
  function hash32(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  function rand01(seed) { var t = (seed + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

  // 排八字
  function bazi(b) {
    var y = b.y, m = b.m, d = b.d, h = b.timeKnown ? b.h : 12, mi = b.timeKnown ? b.mi : 0, dst = false;
    if (b.timeKnown && isTwDst(y, m, d)) { // 夏令時間校正
      dst = true;
      var t = new Date(Date.UTC(y, m - 1, d, h, mi) - 3600 * 1000);
      y = t.getUTCFullYear(); m = t.getUTCMonth() + 1; d = t.getUTCDate(); h = t.getUTCHours(); mi = t.getUTCMinutes();
    }
    var lunar = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar();
    var ec = lunar.getEightChar();
    var p = { year: ec.getYear(), month: ec.getMonth(), day: ec.getDay(), hour: b.timeKnown ? ec.getTime() : null };
    return { pillars: p, dst: dst, lunarText: lunar.getYearInGanZhi() + '年 ' + lunar.getMonthInChinese() + '月' + lunar.getDayInChinese() };
  }

  // 五行計分：天干各 1、地支本氣各 1、月支（月令）再加 1
  function analyse(p) {
    var cnt = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    var list = [p.year, p.month, p.day]; if (p.hour) list.push(p.hour);
    list.forEach(function (gz) { cnt[STEM_EL[gz[0]]] += 1; cnt[BR_EL[gz[1]]] += 1; });
    cnt[BR_EL[p.month[1]]] += 1;
    var dm = p.day[0], me = STEM_EL[dm];
    var rel = { 比劫: me, 印: inv(GEN, me), 食傷: GEN[me], 財: CTL[me], 官殺: inv(CTL, me) };
    var total = 0; ELS.forEach(function (e) { total += cnt[e]; });
    var support = cnt[rel.比劫] + cnt[rel.印];
    var strong = support >= total / 2;
    var cands = strong ? ['食傷', '財', '官殺'] : ['印', '比劫'];
    var order = cands.map(function (k, i) { return { k: k, e: rel[k], c: cnt[rel[k]], i: i }; })
      .sort(function (a, b) { return a.c - b.c || a.i - b.i; });
    return { count: cnt, total: total, support: support, strong: strong, dayMaster: dm, dmEl: me, rel: rel,
      xi: order[0], yong: order[1] };
  }

  function poolOf(el) { var t = TAIL[el], r = []; for (var n = 1; n <= 39; n++) if (t.indexOf(n % 10) >= 0) r.push(n); return r; }

  // 主函式
  function compute(birth, data, nowDate) {
    var bz = bazi(birth), an = analyse(bz.pillars);
    var now = taipeiNow(nowDate), si = shichenIndex(now.h);
    var nowGz = Solar.fromYmdHms(now.y, now.m, now.d, now.h, now.mi, 0).getLunar().getTimeInGanZhi();
    var draw = nextDrawDate(now, data && data.last_draw);
    var seedStr = [birth.y, birth.m, birth.d, birth.timeKnown ? birth.h + ':' + birth.mi : 'x', birth.gender, BRANCHES[si], draw.iso].join('|');
    var seed = hash32(seedStr);
    var A = data.all, R = data.recent;
    var amin = Math.min.apply(null, A), amax = Math.max.apply(null, A), rmin = Math.min.apply(null, R), rmax = Math.max.apply(null, R);
    function score(n) {
      var a = (A[n - 1] - amin) / ((amax - amin) || 1), r = (R[n - 1] - rmin) / ((rmax - rmin) || 1);
      var j = rand01(seed ^ hash32('n' + n));
      return { n: n, base: 0.4 * a + 0.6 * r, jit: j, s: 0.4 * a + 0.6 * r + 0.5 * j, all: A[n - 1], recent: R[n - 1] };
    }
    function pick(el) { var pool = poolOf(el).map(score).sort(function (a, b) { return b.s - a.s || a.n - b.n; }); return { el: el, pool: pool, best: pool[0] }; }
    var p1 = pick(an.xi.e), p2 = pick(an.yong.e);
    var nums = [p1.best.n, p2.best.n];
    var nowEl = BR_EL[BRANCHES[si]];
    return { bazi: bz, an: an, now: now, shichen: SHICHEN[si], shichenBranch: BRANCHES[si], shichenEl: nowEl, nowGz: nowGz,
      draw: draw, picks: [p1, p2], numbers: nums, seed: seed, seedStr: seedStr,
      avgAll: Math.round(data.total_draws * 5 / 39), avgRecent: Math.round(data.recent_window * 5 / 39 * 10) / 10 };
  }

  return { compute: compute, bazi: bazi, analyse: analyse, poolOf: poolOf, nextDrawDate: nextDrawDate, taipeiNow: taipeiNow,
    shichenIndex: shichenIndex, isTwDst: isTwDst, STEM_EL: STEM_EL, BR_EL: BR_EL, TAIL: TAIL, SHICHEN: SHICHEN };
});
