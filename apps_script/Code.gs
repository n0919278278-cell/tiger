/**
 * 財神幻湮宮｜預約登記（Google Apps Script 網頁應用程式）
 * 綁定在原「名單」試算表：擴充功能 → Apps Script → 貼上本檔 → 部署為新版本。
 *
 * 舊部署（尚未更新前）仍只寫入前 19 欄，且每格約 200 字。
 * 官網因此把新資料一併編碼進既有欄位：
 *   numbers       號碼欄     → 服務項目、香粉、運費、合計
 *   draw_date     適用期別欄 → 地址、7-11、備註（與 target_period 相同）
 *   bazi          八字欄     → 7-11 門市名稱／店號
 *   xi_yong       喜用欄     → 備註
 *   day_master    日主欄     → 手機與前置清理
 *   shichen       時辰欄     → 出生時辰
 *   passphrase_ok 暗號欄     → 空白（暗號鎖已取消）
 * 重新部署本檔後，會在原欄位右側另開專用欄，並把單格字數放寬到 800。
 */
var SHEET_NAME = '名單';
var HEADERS = ['收到時間', '送出時間', '暱稱', 'Email', 'LINE ID', '願收消息', '同意個資', '出生日期', '出生時間', '性別',
  '八字', '日主', '喜用', '號碼', '適用期別', '時辰', '來源', '裝置', '暗號通過',
  '服務明細', '居住地址', '7-11門市', '7-11店號', '備註需求', '手機', '香粉數量', '運費', '合計金額', '前置淨化', '行銷同意', '預約打包'];
var KEYS = ['ts', 'name', 'email', 'line', 'optin', 'consent', 'birth_date', 'birth_time', 'gender',
  'bazi', 'day_master', 'xi_yong', 'numbers', 'draw_date', 'shichen', 'source', 'ua', 'passphrase_ok',
  'services_text', 'address', 'store_name', 'store_code', 'note', 'phone', 'incense_qty', 'shipping_fee', 'total', 'pre_clean', 'marketing_opt_in', 'target_period'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  else {
    var last = Math.max(sh.getLastColumn(), HEADERS.length);
    var existing = sh.getRange(1, 1, 1, last).getValues()[0];
    for (var i = 0; i < HEADERS.length; i++) {
      if (existing[i] !== HEADERS[i]) sh.getRange(1, i + 1).setValue(HEADERS[i]);
    }
  }
  return sh;
}

function clean_(v) {
  v = (v === undefined || v === null) ? '' : String(v).slice(0, 800);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = JSON.parse(e.postData.contents || '{}');
    if (!d.line && d.line_id) d.line = d.line_id;
    if (!d.optin && d.marketing_opt_in) d.optin = d.marketing_opt_in;
    if (!d.marketing_opt_in && d.optin) d.marketing_opt_in = d.optin;
    if (!d.target_period && d.draw_date) d.target_period = d.draw_date;
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
  doPost({ postData: { contents: JSON.stringify({
    ts: new Date().toISOString(), name: '測試', email: 'test@example.com', consent: 'Y',
    marketing_opt_in: 'N', numbers: '服務:基礎清理淨化NT$300、合計NT$300',
    target_period: '地址:台北市中正區測試路1號｜7-11:無｜備註:無'
  }) } });
}
