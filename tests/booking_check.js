/* 預約計價、防呆、舊試算表欄位。用法：node tests/booking_check.js */
var path = require('path');
var B = require(path.join(__dirname, '..', 'booking.js'));
var fs = require('fs');
var fail = 0;
function ok(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) fail++;
}
function flags(ids) {
  var o = {};
  B.SERVICES.forEach(function (s) { o[s.id] = ids.indexOf(s.id) >= 0; });
  return o;
}
function baseInput(over) {
  var input = {
    name: '阿斌', y: 1988, m: 7, d: 15, shichenId: '辰', timeUnknown: false, gender: '男',
    address: '台北市大安區復興南路一段1號', phone: '0912-345-678', line: 'abin88', email: 'test@example.com',
    storeName: '', storeCode: '', note: '希望家中平安', consent: true, marketing: true,
    flags: flags(['base', 'group']), incenseQty: 0, pre: 'addon', honeypot: '', source: 'ig', ua: 'test'
  };
  Object.keys(over || {}).forEach(function (k) { input[k] = over[k]; });
  return input;
}

ok(B.quote(baseInput()).total === 900, '基礎 300 + 團體 600 = 900');
ok(B.quote(baseInput({ pre: 'done', flags: flags(['group']) })).total === 600, '聲明已做過基礎清理時不加 300');
ok(B.quote(baseInput({ pre: 'addon', flags: flags(['group']) })).total === 900, '加購前置會補上基礎清理且只算一次');
ok(B.quote(baseInput({ flags: flags(['base', 'group']), pre: 'addon' })).total === 900, '服務列表已含基礎清理時不重複計價');
var incense = B.quote(baseInput({ incenseQty: 2, storeName: '松山門市', storeCode: '123456' }));
ok(incense.total === 900 + 888 * 2 + 60, '兩包香粉 ' + incense.total + ' 含運費 60');
ok(B.quote(baseInput({ flags: flags([]), pre: '', incenseQty: 1, storeName: '松山門市', storeCode: '123456' })).total === 948, '只買香粉 888+60');

var blocked = B.validate(baseInput({ flags: flags(['group']), pre: '', consent: true }));
ok(!blocked.ok && blocked.errors.some(function (e) { return e.indexOf('基礎清理') >= 0; }), '未確認前置不可送出');
['group', 'deep', 'boost', 'wealth', 'd3', 'd7'].forEach(function (id) {
  var v = B.validate(baseInput({ flags: flags([id]), pre: '' }));
  ok(!v.ok, id + ' 未加購也未聲明已完成時擋下');
});
var done = B.validate(baseInput({ flags: flags(['wealth']), pre: 'done' }));
ok(done.ok, '勾選近期已完成即可送出補財庫');
ok(B.quote(baseInput({ flags: flags(['wealth']), pre: 'done' })).total === 3600, '已完成則補財庫為 3600');

ok(!B.validate(baseInput({ consent: false })).ok, '未同意個資不可送出');
ok(!B.validate(baseInput({ phone: '', line: '', email: '' })).ok, '三種聯絡方式都空不可送出');
ok(B.validate(baseInput({ phone: '０９１２３４５６７８', line: '', email: '' })).ok, '全形手機且沒有 LINE／Email 可送出');
ok(!B.validate(baseInput({ address: '台北' })).ok, '地址太短不可送出');
ok(!B.validate(baseInput({ incenseQty: 1, storeName: '', storeCode: '' })).ok, '有香粉卻沒門市不可送出');
ok(B.validate(baseInput({ incenseQty: 1, storeName: '松山門市', storeCode: '123456' })).ok, '香粉門市齊全可送出');
ok(!B.validate(baseInput({ incenseQty: 11, storeName: '松山門市', storeCode: '123456' })).ok, '超過 10 包不可送出');
ok(!B.validate(baseInput({ flags: flags([]), pre: '', incenseQty: 0 })).ok, '沒選任何項目不可送出');
ok(B.validate(baseInput({ timeUnknown: true, shichenId: '' })).ok, '不確定時辰可送出');
ok(!B.validate(baseInput({ timeUnknown: false, shichenId: '' })).ok, '沒選時辰不可送出');
ok(B.validate(baseInput({ honeypot: 'http://spam' })).bot, '蜜罐判定為機器人');

var phoneOnly = B.build(baseInput({ phone: '0912345678', line: '', email: '', incenseQty: 0 }));
ok(phoneOnly.payload.line === '手機:0912345678' && phoneOnly.payload.line_id === phoneOnly.payload.line, '只留手機時寫進 line／line_id');
ok(phoneOnly.payload.email === '' && phoneOnly.payload.consent === 'Y', '同意為 Y，Email 可空白');
ok(phoneOnly.payload.optin === 'Y' && phoneOnly.payload.marketing_opt_in === 'Y', '行銷同意同時寫 optin 與 marketing_opt_in');
ok(phoneOnly.payload.birth_date === '1988-07-15', '生日格式');
ok(phoneOnly.payload.birth_time.indexOf('辰時') >= 0, '時辰寫入 birth_time');

var unknown = B.build(baseInput({ timeUnknown: true, shichenId: '辰' }));
ok(unknown.payload.birth_time === '不確定' && unknown.payload.shichen === '不確定', '不確定時辰');

var full = B.build(baseInput({ incenseQty: 2, storeName: '松山門市', storeCode: '１２３４５６', note: '希望家中平安' }), new Date('2026-11-20T02:10:00Z'));
ok(full.total === 2736, '完整訂單 2736');
ok(full.payload.numbers.indexOf('服務:') === 0 && full.payload.numbers.indexOf('合計NT$2,736') >= 0, 'numbers 含服務與合計');
ok(full.payload.numbers.indexOf('開運香粉x2') >= 0 && full.payload.numbers.indexOf('運費NT$60') >= 0, 'numbers 含香粉與運費');
ok(full.payload.draw_date === full.payload.target_period, 'draw_date 與 target_period 相同');
ok(full.payload.target_period.indexOf('地址:台北市大安區復興南路一段1號') >= 0, 'target_period 含地址');
ok(full.payload.target_period.indexOf('7-11:松山門市／123456') >= 0, 'target_period 含門市與店號');
ok(full.payload.target_period.indexOf('備註:希望家中平安') >= 0, 'target_period 含備註');
ok(full.payload.bazi.indexOf('松山門市／123456') >= 0, '八字欄備份門市');
ok(full.payload.xi_yong.indexOf('希望家中平安') >= 0, '喜用欄備份備註');
ok(full.payload.passphrase_ok === '', '不再送暗號通過');
ok(full.summary.indexOf('預約成功') < 0 && full.summary.indexOf('阿斌') >= 0 && full.summary.indexOf('NT$2,736') >= 0, '摘要含姓名與金額');
ok(full.summary.indexOf('財神幻湮宮-今彩539聚地') >= 0, '摘要指向粉專');
['7×12', '7x12', '3×9', '3x9', '二合', '盈虧', '下注'].forEach(function (w) {
  ok(full.summary.indexOf(w) < 0 && full.payload.numbers.indexOf(w) < 0, '摘要與欄位沒有「' + w + '」');
});

var allIds = B.SERVICES.map(function (s) { return s.id; });
var heavy = B.build(baseInput({
  flags: flags(allIds), pre: 'addon', incenseQty: 10,
  storeName: '一二三四五六七八九十一二三四五六七八九十十二', storeCode: '12345678',
  address: new Array(101).join('街'), note: new Array(121).join('事')
}));
['numbers', 'draw_date', 'target_period', 'bazi', 'day_master', 'xi_yong', 'shichen'].forEach(function (k) {
  ok(heavy.payload[k].length <= B.LEGACY_MAX, k + ' 長度 ' + heavy.payload[k].length + ' <= 190');
});
ok(heavy.payload.numbers.indexOf('合計') >= 0, '全選時 numbers 仍看得到合計');
ok(heavy.payload.address.length === 100 && heavy.payload.note.length === 120, '專用欄保留完整地址與備註（此案例先通過長度檢核才會送出）');

var legacyKeys = ['ts', 'name', 'email', 'line', 'optin', 'consent', 'birth_date', 'birth_time', 'gender', 'bazi', 'day_master', 'xi_yong', 'numbers', 'draw_date', 'shichen', 'source', 'ua', 'passphrase_ok'];
legacyKeys.forEach(function (k) { ok(Object.prototype.hasOwnProperty.call(full.payload, k), '相容鍵 ' + k); });

var page = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
['基礎清理淨化', 'NT$300', '團體祈福', 'NT$600', '深層強力清理淨化', 'NT$1,200', '強力補運', 'NT$2,400', '五路財神補財庫', 'NT$3,600', '三日持咒秘儀加持', 'NT$12,000', '七日持咒秘儀加持', 'NT$36,000', 'NT$888', 'NT$60', '首批限量', '綠褀楠沉香', '不含陶香球', '任何專項開始前必備項目，不可繞過', '近半年內', '近一個月內', '綠界', 'assets/incense_ingredients.jpg', 'assets/incense_censer.jpg'].forEach(function (w) {
  ok(page.indexOf(w) >= 0, '頁面有「' + w + '」');
});
['7×12', '3×9', '二合號碼', '盈虧', '今日暗號', '恭迎虎爺', 'tiger.js', 'lunar.js'].forEach(function (w) {
  ok(page.indexOf(w) < 0, '頁面沒有「' + w + '」');
});
ok(page.indexOf('id="gate"') < 0 && page.indexOf('passphrase') < 0, '沒有暗號鎖');

var cfg = fs.readFileSync(path.join(__dirname, '..', 'config.js'), 'utf8');
ok(cfg.indexOf('AKfycbz3W3VirPgn9d8YGVa31Kzfox8TUXrS0_VGBQoOmfP_3i_IWvs9YAcLjvGi20A9MDO6Dg/exec') >= 0, 'ENDPOINT 維持原網址');

process.exit(fail ? 1 : 0);
