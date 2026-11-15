# 幻湮宮｜虎爺賜號（靜態網頁）

手機優先的單頁網站：留言「恭迎虎爺」的人收到連結 → 填生辰與聯絡方式 → 瀏覽器內排八字 → 給兩個「虎爺專屬二合號碼」。
全部在瀏覽器計算，無 CDN 依賴（lunar-javascript 已放在 `vendor/`）。

## 檔案
| 檔案 | 用途 |
|---|---|
| index.html / style.css / app.js | 頁面、樣式、互動 |
| tiger.js | 計算核心（排盤、五行、喜用、選號；瀏覽器與 Node 共用） |
| config.js | **唯一需要改的設定**：名單網址 ENDPOINT、IG/FB/YT 連結 |
| data.json | 號碼統計，由 `build_data.py` 從 `../draws.csv` 產生 |
| build_data.py | `python3 build_data.py` 重建 data.json（每日開獎後跑，含下一期暗號雜湊） |
| passphrase.py | 依開獎日＋本機鹽決定兩個字暗號；`python3 passphrase.py YYYY-MM-DD` |
| .secret_salt | 私密鹽（已 gitignore，不可上傳） |
| vendor/lunar.js | lunar-javascript v1.7.8（MIT，授權檔同目錄） |
| tiger.jpg / favicon.svg | 虎爺圖（取自 video/assets/tiger_keyart.jpg，480px，約 50KB） |
| apps_script/Code.gs | Google Apps Script：把名單寫入 Google 試算表 |
| tests/check_bazi.js | Node 測試：排盤交叉驗證、號碼合法、決定性 |
| tests/browser_check.js | 無頭 Chrome 測試＋截圖（需 puppeteer-core） |

## 號碼怎麼算（簡單規則）
1. **排盤**：lunar-javascript 以國曆生日時間排四柱（節氣換月、立春換年）。台灣夏令時間年份（1945–51、52、53–54、55–59、60–61、74–75、79 的夏季）自動減 1 小時。不確定時辰 → 只排年月日三柱。
2. **五行計分**：每個天干 1 分、每個地支本氣 1 分，月支（月令）再加 1 分。四柱共 9 分（三柱 7 分）。
3. **身強／身弱**：日主同類（比劫）＋生我者（印）分數 ≥ 總分一半 → 身強，否則身弱。
4. **喜用五行**：身強 → 從「我生（食傷）、我剋（財）、剋我（官殺）」中取分數最低的兩個（同分依此順序）；身弱 → 從「印、比劫」取，分數低者為喜（同分印優先）。第一個叫「喜」、第二個叫「用」。
5. **五行→號碼池**（河圖數尾數）：1、6 水；2、7 火；3、8 木；4、9 金；5、0 土。例：木 → 3、8、13、18、23、28、33、38。
6. **池內排序**：分數 = 0.4×歷史出現次數（正規化 0–1）＋ 0.6×近 100 期出現次數（正規化）＋ 0.5×個人亂數。個人亂數由「出生年月日時分＋性別＋送出當下時辰（台北時間）＋適用期別」雜湊而來，所以同一人在同一時辰、同一期別結果固定；換時辰或換期別會變。
7. 喜神池第一名＝第一碼，用神池第一名＝第二碼（兩池尾數不同，必不重複）。
8. **適用期別**：台北時間週一至週六 20:00 前 → 當天；20:00 後或週日 → 下一個開獎日（跳過週日；若 ≤ data.json 最後開獎日則往後推）。春節停開未處理。

範例 1988/07/15 10:30 男 → 戊辰 己未 辛未 癸巳，日主辛金，土 6 分身強，喜木、用水 → 11/15 酉時送出、11/16 期別：**23、31**。


## 每日暗號（簡單版，前端核對）
開獎後更新的 `data.json` 會帶下一期（最新開獎日的下一個週一至週六）的暗號雜湊，**不含明文**。頁面先問「今日暗號」，對了才進入排盤；輸入會去掉空白，並接受詞庫裡常見的簡體寫法。答對後以 `localStorage` 記住「這一個開獎日」已通過。名單送出時多一個欄位 `passphrase_ok=Y`（不傳送暗號本身）。

- 產生：`python3 passphrase.py 2026-11-16`（只在本機印明文，給影片用）。鹽檔是 `.secret_salt`，備用複本在 Cursor store。
- 雜湊：`SHA-256(pepper|日期|暗號)`，pepper 公開寫在 data.json 的 `passphrase.pepper`（目前 `hyy539-passphrase-v1`）。
- 錯或空白時顯示「請到幻湮宮今日影片，聽虎爺說出今日暗號」，並附 IG／YT／FB 連結。
- **限制（已告知、採簡單版）：** 詞庫約 50 個詞，雜湊在頁面上，懂程式的人仍可窮舉。若以後要擋這個，改由試算表後端核對即可。

## 本機測試
```bash
python3 -m http.server 8080          # 在本資料夾
node tests/check_bazi.js             # 排盤/號碼測試
NODE_PATH=/tmp/pt/node_modules node tests/browser_check.js   # 截圖到 screenshots/
```

## 發佈步驟（給楊維斌）
### A. Google 試算表名單（免費，約 5 分鐘）
1. 到 sheets.google.com 新建試算表，命名「虎爺名單」。
2. 上方選單 **擴充功能 → Apps Script**。刪掉預設內容，貼上 `apps_script/Code.gs` 全部內容，按儲存。
3. 函式選單選 `testAppend` → 執行 → 依指示授權（會出現「Google 尚未驗證」→ 進階 → 前往（不安全）→ 允許；這是你自己的腳本）。回試算表應看到「名單」工作表多一列測試資料。
4. 右上 **部署 → 新增部署作業** → 類型選「網頁應用程式」→ 執行身分：**我**；存取權：**所有人** → 部署。
5. 複製「網頁應用程式網址」（`https://script.google.com/macros/s/…/exec`），貼給 Gray，或填進 `config.js` 的 `ENDPOINT`。
6. 之後若修改 Code.gs，要用「管理部署作業 → 編輯 → 新版本」才會生效（網址不變）。

### B. GitHub Pages 網站（免費）
1. 到 github.com 註冊帳號（帳號名會出現在網址，例如 `n0919278278-cell` → `https://n0919278278-cell.github.io/tiger/`）。
2. 右上 **+ → New repository**，名稱 `tiger`，選 **Public**，建立。
3. 「uploading an existing file」→ 把本資料夾所有檔案（含 vendor、data.json、.nojekyll）拖進去 → Commit。（或給 Gray 一個 GitHub 登入/權杖，由 Gray 推送與每日更新 data.json。）
4. Repo 的 **Settings → Pages** → Source 選「Deploy from a branch」，Branch 選 `main` / `(root)` → Save。約 1 分鐘後網址生效。
5. 把網址放進 ManyChat 自動私訊，以及 IG/FB/YT 簡介。可加 `?src=ig` 之類參數，名單「來源」欄會記錄。

### 每日更新
開獎後跑 `bash publish_data.sh`（或先 `python3 build_data.py` 再推送）：會重建號碼統計，並寫入下一期暗號雜湊。本機必須有 `.secret_salt`。

## 合規
- 頁面頂部、結果區、頁尾都顯示「僅供娛樂參考，不保證中獎。未滿18歲不得購買彩券。」
- 個資告知：目的、保存與利用者、不提供第三方、可請求查詢/更正/刪除；必勾同意，行銷訊息另外選填。
- 刪除請求：在試算表刪除該列即可。
