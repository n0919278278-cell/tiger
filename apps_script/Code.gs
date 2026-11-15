/**
 * 幻湮宮｜虎爺賜號 — 名單收集（Google Apps Script 網頁應用程式）
 * 綁定在一份 Google 試算表上：擴充功能 → Apps Script → 貼上本檔 → 部署為網頁應用程式。
 * 每次有人在頁面送出，會在「名單」工作表新增一列。
 */
var SHEET_NAME = '名單';
var HEADERS = ['收到時間', '送出時間', '暱稱', 'Email', 'LINE ID', '願收消息', '同意個資', '出生日期', '出生時間', '性別',
  '八字', '日主', '喜用', '號碼', '適用期別', '時辰', '來源', '裝置'];
var KEYS = ['ts', 'name', 'email', 'line', 'optin', 'consent', 'birth_date', 'birth_time', 'gender',
  'bazi', 'day_master', 'xi_yong', 'numbers', 'draw_date', 'shichen', 'source', 'ua'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function clean_(v) {
  v = (v === undefined || v === null) ? '' : String(v).slice(0, 200);
  return /^[=+\-@]/.test(v) ? "'" + v : v; // 防止試算表公式注入
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = JSON.parse(e.postData.contents || '{}');
    if (!d.consent || (!d.email && !d.line)) return out_({ ok: false, error: 'missing consent/contact' });
    var row = [new Date()].concat(KEYS.map(function (k) { return clean_(d[k]); }));
    getSheet_().appendRow(row);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return out_({ ok: true, service: 'tiger-leads' }); }

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** 在編輯器中手動執行一次，確認能寫入（會新增一列測試資料，可刪） */
function testAppend() {
  doPost({ postData: { contents: JSON.stringify({ ts: new Date().toISOString(), name: '測試', email: 'test@example.com', consent: 'Y', numbers: '01,02' }) } });
}
