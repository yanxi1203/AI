# AI 財務管家正式前端架構

## 頁面

- `src/pages/HomePage.jsx`：財務摘要、快速記帳、Fin 回覆、待辦、最近紀錄與夢想預覽。
- `src/pages/LedgerPage.jsx`：總覽、月曆、流水帳、搜尋、篩選、編輯、刪除與 CSV 匯出。
- `src/pages/AnalysisPage.jsx`：本月與上月比較、分類橫向長條圖與 Fin 建議。
- `src/pages/SettingsPage.jsx`：主題、預算、管家、載具、匯出與資料設定。
- `src/pages/GoalsPage.jsx`：多個夢想目標子頁。
- `src/pages/CarrierPage.jsx`：載具條碼顯示與編號管理子頁。

固定底部導覽只有首頁、帳本、分析、設定。夢想與載具透過子頁進入並返回原頁。

## 核心模組

- `src/modules/transactions/transactionAssistant.js`
  - 唯一介面：`processFinanceMessage`。
  - 負責自然語言記帳、管家修正、歧義追問與一般聊天分流。
  - 不直接操作 React 或 localStorage。
- `src/modules/finance/financeSummary.js`
  - 介面：`createFinanceSummary` 與 `createMonthFinanceSummary`。
  - 負責首頁、帳本、分析共用的金額與分類計算；帳本切換月份時所有區塊共用同一份月份投影。
  - 頁面不可各自重複計算同一個財務指標。
- `src/modules/finance/monthlyPlan.js`
  - `createFinancialSetup` 統一首次設定與設定頁的收入、固定支出、儲蓄、日常預算及待估算狀態。
  - 收入未知時不以 0 元誤判超支；補上收入後再重新計算。
- `src/modules/goals/goalPlanner.js`
  - 負責夢想類型與金額辨識、儲蓄速度方案、確認後建立，以及進行中／完成／封存狀態轉換。
- `src/modules/persistence/goalEstimateClient.js`
  - 前端夢想估算接口；優先呼叫 `/api/goals/estimate`，後端離線時使用同一套純函式規則並標示為離線參考估算。
- `server/services/goalEstimator.js`
  - 依 `travel`、`product`、`event`、`education`、`custom` 分派估算器，所有估算器回傳同一資料契約。
- `server/data/goalEstimateReferences.js`
  - 唯一的內建價格參考資料；React 頁面不保存另一套價格規則。

## App 組合與資料流

`src/app/FinanceApp.jsx` 負責組合頁面、保存狀態與呼叫持久化模組：

```text
使用者輸入
  → transactionAssistant
  → 收支紀錄狀態
  → financeSummary
  → 首頁／帳本／分析同步重算
  → latestSnapshotSaver 依序合併快速變更
  → appStateClient 同步本機後端
  → storage 寫入 localStorage 備援
```

## 後端與持久化

- `src/modules/persistence/appStateClient.js`
  - 前端唯一持久化接口：載入、保存、清除整份 App 狀態。
  - 頁面不直接呼叫 HTTP，也不需要知道資料檔位置。
- `src/modules/persistence/latestSnapshotSaver.js`
  - 快速連續操作時依序保存，排隊中的舊快照會合併成最新快照，避免舊請求晚回來覆蓋新資料。
- `server/appServer.js`
  - 提供 `/api/health`、`/api/state`、`/api/assistant/message` 與 `/api/goals/estimate` 的 HTTP 接口。
  - 自然語言訊息由後端呼叫既有 `processFinanceMessage`，新增或修正成功時一併保存帳本。
- `server/stateStore.js`
  - 驗證並依匿名裝置識別保存狀態至 `server/data/users/`。
  - 同一裝置的寫入會依序完成，並以暫存檔替換，避免同時寫入造成不完整 JSON。
  - 儲存格式異常時先正規化，不直接把錯誤資料交給前端。
- `src/utils/storage.js`
  - 保留瀏覽器本機備援；後端暫時離線時不阻斷操作。

目前是免登入、匿名裝置隔離的本機資料 MVP。登入、雲端資料庫與跨裝置同步是後續擴充；換成雲端時，優先替換持久化接口後方的實作，不改動頁面與財務計算模組。

自然語言判斷目前仍是可測試的規則式模組，尚未呼叫外部大型語言模型。前端透過 `financeAssistantClient.js` 使用後端；後端離線時才使用相同的前端模組作為備援。

夢想建立資料流：

```text
夢想名稱
  → 已知金額：直接選擇儲蓄速度
  → 未知金額：類型辨識／使用者選擇 → 逐題蒐集條件
  → goalEstimateClient → POST /api/goals/estimate
  → goalEstimator 與各類估算器 → 統一費用區間
  → 使用者選費用方案 → 選儲蓄速度 → 最後確認
  → FinanceApp 既有 goals → appStateClient → Supabase／JSON／localStorage
```

開發時使用 `pnpm run dev` 同時啟動前後端，後端程式修改後會自動重啟；`pnpm run verify` 執行完整測試、lint 與正式建置，`pnpm run smoke` 驗證實際 HTTP 記帳與保存流程。

## 本期載具範圍

- 本期：手機條碼顯示、編號管理與首頁快速入口。
- 後續：財政部歸戶 API、發票自動匯入與原生 iOS 小工具。
- 不以模擬資料冒充真實載具同步。
