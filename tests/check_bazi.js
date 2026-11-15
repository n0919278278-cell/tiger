// Node 檢查：範例生辰排盤 + 第二方法交叉驗證 + 號碼合法性 + 決定性
const path = require('path'), root = path.join(__dirname, '..');
const L = require(path.join(root, 'vendor/lunar.js')), T = require(path.join(root, 'tiger.js'))(L);
const data = require(path.join(root, 'data.json'));
const ST = '甲乙丙丁戊己庚辛壬癸', BR = '子丑寅卯辰巳午未申酉戌亥';
const gz = i => ST[i % 10] + BR[i % 12];
// 第二方法：儒略日數算日柱（JDN 2451545 = 2000-01-01 = 戊午，干支序 54）
function jdn(y, m, d) { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; }
function dayGz(y, m, d) { return gz(((jdn(y, m, d) - 2451545 + 54) % 60 + 60) % 60); }
// 年柱：以立春（節氣表取自 lunar 只取時間）→ 這裡用 (年-4)%60，生日在立春後即可
function yearGz(y) { return gz(((y - 4) % 60 + 60) % 60); }
// 五鼠遁：日干 → 子時天干
function hourGz(dayStem, h) { const bi = Math.floor((h + 1) / 2) % 12; const start = [0, 2, 4, 6, 8][ST.indexOf(dayStem) % 5]; return ST[(start + bi) % 10] + BR[bi]; }
// 五虎遁：年干 → 寅月天干；月支由節氣（小暑 7/7 前後）決定，此處只用於 7/15 範例（未月）
function monthGz(yearStem, branchIdx) { const yin = [2, 4, 6, 8, 0][ST.indexOf(yearStem) % 5]; const k = (branchIdx - 2 + 12) % 12; return ST[(yin + k) % 10] + BR[branchIdx]; }
let fail = 0; const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) fail++; };

const b = { y: 1988, m: 7, d: 15, h: 10, mi: 30, timeKnown: true, gender: '男' };
const now = new Date('2026-11-15T10:50:00Z'); // 台北 18:50
const r = T.compute(b, data, now), p = r.bazi.pillars;
console.log('八字', p.year, p.month, p.day, p.hour, '日主', r.an.dayMaster + r.an.dmEl, r.an.strong ? '身強' : '身弱', '喜', r.an.xi.e, '用', r.an.yong.e, '號碼', r.numbers, '期別', r.draw.iso, r.shichen);
ok(p.year === yearGz(1988), '年柱 ' + p.year + ' == ' + yearGz(1988));
ok(p.month === monthGz(p.year[0], 7), '月柱 ' + p.month + ' == ' + monthGz(p.year[0], 7) + '（五虎遁，未月）');
ok(p.day === dayGz(1988, 7, 15), '日柱 ' + p.day + ' == ' + dayGz(1988, 7, 15) + '（儒略日）');
ok(p.hour === hourGz(p.day[0], 10), '時柱 ' + p.hour + ' == ' + hourGz(p.day[0], 10) + '（五鼠遁）');
// 大量日期比對日柱
let bad = 0; for (let t = Date.UTC(1930, 0, 1); t < Date.UTC(2026, 0, 1); t += 86400000 * 7) { const d = new Date(t); const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, dd = d.getUTCDate(); if (L.Solar.fromYmdHms(y, m, dd, 12, 0, 0).getLunar().getEightChar().getDay() !== dayGz(y, m, dd)) bad++; }
ok(bad === 0, '1930–2025 每週抽樣日柱與儒略日法一致（不符 ' + bad + '）');
ok(r.numbers.length === 2 && r.numbers[0] !== r.numbers[1] && r.numbers.every(n => n >= 1 && n <= 39 && Number.isInteger(n)), '兩個號碼 1–39 且不重複: ' + r.numbers);
ok(r.picks.every(pk => T.TAIL[pk.el].includes(pk.best.n % 10)), '號碼尾數符合喜用五行');
const r2 = T.compute(b, data, new Date('2026-11-15T10:20:00Z')); // 同酉時（17-19）
ok(r2.numbers.join() === r.numbers.join(), '同生辰、同時辰、同期別 → 相同號碼');
const r3 = T.compute({ ...b, timeKnown: false, h: null, mi: null }, data, now);
ok(r3.bazi.pillars.hour === null && r3.numbers.length === 2, '不確定時辰 → 三柱，仍出兩碼 ' + r3.numbers);
// 期別：週六 21:00 → 下週一；週一 10:00 → 當天
ok(T.nextDrawDate({ y: 2026, m: 11, d: 21, h: 21, wd: 6 }).iso === '2026-11-23', '週六 21:00 → 週一');
ok(T.nextDrawDate({ y: 2026, m: 11, d: 16, h: 10, wd: 1 }).iso === '2026-11-16', '週一 10:00 → 當天');
ok(T.isTwDst(1975, 6, 1) && !T.isTwDst(1988, 7, 15), '台灣夏令時間判斷');
// 隨機 2000 組生辰皆合法
let inval = 0; for (let i = 0; i < 2000; i++) { const y = 1930 + i % 90, m = 1 + i % 12, d = 1 + i % 28; const x = T.compute({ y, m, d, h: i % 24, mi: i % 60, timeKnown: true, gender: i % 2 ? '男' : '女' }, data, now); if (x.numbers[0] === x.numbers[1] || x.numbers.some(n => n < 1 || n > 39)) inval++; }
ok(inval === 0, '2000 組隨機生辰號碼皆合法');
process.exit(fail ? 1 : 0);
