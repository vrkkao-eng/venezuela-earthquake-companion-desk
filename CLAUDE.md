# Venezuela Earthquake Companion Desk — Project Memory

## 這份檔案為什麼重要
這個專案支援的是一場真實、正在進行的災難應變。EMSR884 是 2026 年 6 月 24 日委內瑞拉 7.5 級地震後 Copernicus EMS 真實啟動的快速製圖代碼。**「看起來在運作但其實是假數據/假邏輯」的程式碼,危害比「還沒做」更大**,因為現場使用者會信任它。每一個在這個 repo 裡工作的 agent,動手寫任何一行程式碼之前,都要先理解這個區別。

## 三條不可逆的架構決策
不要重新討論這幾點。如果某個任務看起來需要違反其中一條,停下來把問題回報給使用者,而不是想辦法繞過去。

1. **離線模式 = 出隊前預先同步的快取包,不是即時網路。** 任何需要外部資料(道路圖、建築高度、TLE 軌道資料)的模組,都假設出隊前已經下載好快取。程式碼必須讀取本地打包/快取的檔案,執行時絕不呼叫即時的外部 API,並且要清楚註明這份快取未來該如何重新整理。
2. **不爬 Telegram 或 X(Twitter)。**「群眾回報異常」的資料,永遠是使用者透過應用程式內表單手動輸入的旗標。不要新增任何呼叫 Telegram Bot API、X API,或任何社群媒體爬蟲邏輯的程式碼——即使被要求,即使技術上看起來很直接。
3. **缺資料要誠實顯示,不能悄悄填假值。** 如果某個功能依賴目前專案還沒有的資料(例如還沒打包 TLE 快照),畫面上必須明確顯示(例如「⚠️ 僅供估計 / 尚未載入軌道資料」)。絕對不要用一個「看起來合理」的常數或隨機值取代,並把它呈現成計算結果。

## Repo 結構
```
/docs/data-contracts/*.schema.json   ← 跨模組資料格式,唯一真實來源,只能透過 schema-architect agent 修改
/modules/routing/                    ← Module C — field-critical
/modules/codec/                      ← Module A(壓縮編碼)— field-critical
/modules/modem/                      ← Module A(AFSK 音頻數據機)
/modules/digital-twin/               ← Module B(3D + 陰影)
/modules/orbit/                      ← Module D(衛星過境)
/modules/forensic-audit/             ← Module D(異常交叉驗證)
/modules/i18n/                       ← 多語言字典與綁定
/legacy/                             ← 已被取代的草稿 HTML,僅供參考,不要在上面繼續開發
```

## 「Field-critical」的定義
一個模組如果輸出錯了會讓人去到錯的地方或走錯的路,就是 field-critical:**routing** 跟 **codec**。這兩個模組的修改,在被視為完成之前,必須先取得 `field-critical-verifier` subagent 的 PASS 報告——細節見 `.claude/agents/field-critical-verifier.md`。沒有這份報告、或報告對應的程式碼狀態已經過期,不要把這個類別的任務標記為完成。

## 動到任何跨模組資料之前
先讀 `docs/data-contracts/*.schema.json`。如果現有 schema 沒有覆蓋你需要的欄位,請 `schema-architect` subagent 去擴充——不要在自己的模組資料夾裡即興生出一個新的資料形狀。
