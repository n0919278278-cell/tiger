# 財神幻湮宮｜官方服務網站

手機優先的單頁官網。訪客打開首頁就能看服務與報價，並登記遠端解事或開運香粉。沒有暗號鎖，也不在頁面上選號。

此地 539 推選僅供娛樂參考。本宮正式提供的是遠端解事、清理淨化與親製開運香粉結緣。原先的賜號登記已停止。

## 現在的檔案

| 檔案 | 用途 |
|---|---|
| index.html / style.css / app.js | 官網門面、大字排版、表單互動 |
| booking.js | 報價、防呆、試算表欄位打包（瀏覽器與 Node 共用） |
| config.js | **唯一要改的設定**：名單網址 `ENDPOINT`、FB／IG／YouTube／Portaly |
| assets/incense_*.jpg | 香粉實拍（由上傳原圖縮小，已去掉定位資訊） |
| apps_script/Code.gs | 寫入 Google 試算表。重新部署後會多出專用欄 |
| publish_data.sh | 預設不再發布舊選號統計，避免例行作業把舊資料推上網站 |
| tests/booking_check.js | 金額、防呆、欄位長度 |
| tests/browser_check.js | 無頭 Chrome：手機排版、必填、防呆、成功與失敗畫面 |

`tiger.js`、`data.json`、`vendor/lunar.js`、`build_data.py`、`passphrase.py` 是舊版計算留下的檔案，首頁不再載入。不要把它們加回頁面。

## 服務與價格（新台幣）

非專屬遠端解事（當日可處理完，請留意近半年內的感受）：

- 基礎清理淨化 NT$300（任何專項開始前必備，不可繞過）
- 團體祈福 NT$600（運勢穩定上升，成效較慢）
- 深層強力清理淨化 NT$1,200
- 強力補運 NT$2,400
- 五路財神補財庫 NT$3,600

專屬個人專項（事業、感情、催財、改運；請留意近一個月）：

- 三日持咒秘儀加持 NT$12,000
- 七日持咒秘儀加持 NT$36,000

持咒開運香粉 NT$888／包（約 30g，香包或袋裝，不含陶香球），7-11 店到店運費 NT$60，首批限量 100 包。成分與用法寫在頁面上。香粉是祈福用品，不是藥品，也不保證結果。

若勾了團體祈福、深層淨化、補運、補財庫、三日或七日，必須再勾「加購基礎清理淨化」或「我近期已在本宮完成過基礎清理淨化」，否則不能送出。

## 名單怎麼寫進舊試算表

現正上線的 Apps Script 仍檢查：`consent` 有值，且 `email` 或 `line` 至少一個。同時會收下 `name`、`birth_date`、`birth_time`、`gender`、`optin`。

頁面另外送出 `line_id`（與 `line` 相同）和 `marketing_opt_in`（與 `optin` 相同，Y/N）。只填手機、沒填 LINE 也沒填 Email 時，手機會寫進 `line`，格式是 `手機:09xxxxxxxx`，這樣舊腳本才收得下來。

新的服務、地址、門市、備註編碼進舊欄位（每格控制在 190 字以內，避免被舊腳本的 200 字上限截斷）：

| 試算表欄 | 鍵 | 內容 |
|---|---|---|
| 號碼 | `numbers` | `服務:` 項目、香粉數量、運費、合計 |
| 適用期別 | `draw_date` 與 `target_period` | `地址:…｜7-11:…｜備註:…` |
| 八字 | `bazi` | `7-11:` 門市名稱／店號 |
| 喜用 | `xi_yong` | `備註:` |
| 日主 | `day_master` | 手機與前置清理（本次加購，或聲明近期已做過） |
| 時辰 | `shichen` | 出生時辰；不確定則為「不確定」 |
| 暗號通過 | `passphrase_ok` | 空白 |

只有回應本文是 `{"ok":true}` 才會顯示「預約成功！」，並給完整摘要與複製按鈕，方便貼到粉專「財神幻湮宮-今彩539聚地」或 LINE。綠界刷卡尚未在本頁開通。

把 `apps_script/Code.gs` 貼回 Apps Script 並以**新版本**部署後，原欄位右側會多出服務明細、地址、門市、店號、備註、手機、數量、運費、合計、前置、行銷同意、預約打包。網址不用改。部署前，上面的舊欄位已經夠讀。

## 本機測試

```bash
python3 -m http.server 8080
node tests/booking_check.js
NODE_PATH=/tmp/pt/node_modules node tests/browser_check.js http://127.0.0.1:8080/
bash publish_data.sh    # 應印出已轉型並以代碼 0 結束
```

瀏覽器測試會把畫面存到 `screenshots/`。請用手機寬度看：字要大、按鈕要好按、總金額含香粉運費 NT$60。

## 發佈

網站仍是 `n0919278278-cell/tiger` 的 GitHub Pages。更新 `main` 後約一分鐘生效。`config.js` 的 `ENDPOINT` 維持原本的 `/exec` 網址。Portaly 若之後有網址，填進 `PORTALY_URL` 即可，空白時頁尾不顯示。

社群：FB 粉專「財神幻湮宮-今彩539聚地」、IG @aura_lightning_zaomu、YouTube @weipin-8278。
