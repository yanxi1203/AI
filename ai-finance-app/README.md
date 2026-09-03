# AI 財務管家

手機直式 Web App MVP。前端使用 React/Vite，後端使用 Node.js HTTP 模組；可使用 Supabase 雲端資料庫，未設定時則保存為本機 JSON 檔。

## 開啟方式

在專案資料夾執行：

```powershell
pnpm run dev
```

這個指令會同時啟動前端與後端；修改後端程式時也會自動重啟：

- 前端：`http://127.0.0.1:5173/`
- 後端：`http://127.0.0.1:8787/`
- 健康檢查：`http://127.0.0.1:8787/api/health`
- 自然語言記帳：前端會透過 `/api/assistant/message` 交由後端判斷與保存。
- 夢想費用估算：前端會透過 `/api/goals/estimate` 取得內建參考區間；後端離線時會明確標示為離線參考估算。

也可以直接雙擊 `開啟網站.cmd`。關閉啟動視窗後，前後端都會停止。

## 資料保存

- 設定 Supabase 後，帳目、目標、固定支出、預算、載具號碼與管家設定會依瀏覽器裝置識別保存至 `app_states` 資料表。
- 尚未設定 Supabase 時，後端會繼續保存至 `server/data/users/`，不影響本機展示。
- 首次啟用 Supabase 時，若雲端尚無該裝置的資料，後端會將既有本機資料移轉至雲端。
- 瀏覽器 `localStorage` 仍保留一份備援；後端離線時畫面仍可操作。
- 目前仍是免登入、依裝置隔離的 MVP；真正跨裝置同步需要再加入 Supabase Auth。
- `server/data/` 已排除版本控制，避免把個人財務資料提交到程式碼倉庫。

## Supabase 設定

1. 在 Supabase SQL Editor 執行 `supabase/migrations/20260827_create_app_states.sql`。
2. 將 `.env.example` 複製為 `.env.local`。
3. 填入 Supabase 專案的 `SUPABASE_URL` 與伺服器專用 `SUPABASE_SECRET_KEY`。
4. 重新執行 `pnpm run dev`；後端會顯示目前使用 Supabase 或本機 JSON。

`SUPABASE_SECRET_KEY` 只能存在後端的 `.env.local`，不能加上 `VITE_` 前綴，也不要放進簡報、截圖或前端程式碼。

## 夢想目標估算

- 已知金額可直接選擇儲蓄速度，不會呼叫估算接口。
- 不知道金額時，Fin 會依旅行、商品、活動、課程或自訂目標逐步詢問必要條件。
- 旅行人數只用於住宿分攤；建立的目標金額是目前使用者個人要準備的金額。
- 內建參考價格集中在 `server/data/goalEstimateReferences.js`，不是即時機票或購物報價。
- 使用者最後按下「建立夢想目標」後，才會沿用既有 `goals` 與 App 狀態保存流程寫入資料。

## 驗證

```powershell
pnpm run verify
```

`verify` 會依序執行完整測試、程式檢查與正式建置。

前後端已透過 `pnpm run dev` 啟動時，也可以執行：

```powershell
pnpm run smoke
```

這會用獨立的測試裝置資料確認首頁、健康檢查、AI 記帳與後端保存，完成後自動清除測試資料。

# Vite 範本說明

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
