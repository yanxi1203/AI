# FinMate 財伴

手機優先的 AI 財務管家與記帳 Web App。前端使用 React/Vite，Node.js API 負責驗證 Supabase session 並透過 Row Level Security（RLS）存取使用者自己的資料。

## 本機啟動

1. 將 `.env.example` 複製為 `.env.local`。
2. 填入同一個 Supabase 專案的 URL 與 Publishable Key。
3. 先在 Supabase SQL Editor 執行 `supabase/migrations/20260907_create_app_states_v2.sql`。
4. 確認 Supabase Dashboard 已開啟 Allow anonymous sign-ins。
5. 執行：

```powershell
pnpm run dev
```

- 前端：`http://127.0.0.1:5173/`
- 後端：`http://127.0.0.1:8787/`
- 健康檢查：`http://127.0.0.1:8787/api/health`

若缺少 Supabase 設定，登入頁與 Node API 會顯示明確的設定錯誤，不會退回未受保護的共用 JSON 儲存。

## 登入與資料歸屬

- 第一版只提供「先以訪客身分體驗」，使用 Supabase Anonymous Sign-In 建立匿名使用者。
- 每份 App 狀態以 `auth.users.id` 對應的 `user_id` 保存於 `app_states_v2`。
- 前端 API 請求附帶使用者 access token；Node 驗證 token 後才建立 request-scoped Supabase client。
- `app_states_v2` 的 RLS 限制每位使用者只能讀寫自己的資料。
- 瀏覽器離線快取也以 `user_id` 分區，不會在 session 或遠端資料尚未完成載入時顯示上一位使用者的畫面。
- 舊 `app_states` 表與其中資料不會自動認領、搬移或刪除。

訪客 session 若仍保留在同一瀏覽器，可在重新開啟後恢復。清除瀏覽器資料、改用其他裝置或自行移除 session 後，可能無法回到同一個匿名帳號。

## 金鑰安全

瀏覽器與一般 Node 使用者路由只使用 Supabase Publishable Key：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

不得在前端、Git、簡報或截圖中放入 `secret`／`service_role` key。一般 `/api/state` 與 `/api/assistant/message` 路由也不使用它們。

## 資料版本衝突

`app_states_v2.revision` 使用 compare-and-swap 更新。舊版本寫入會收到 HTTP 409；前端停止自動重試並要求使用者重新載入最新資料，避免另一個分頁或裝置的更新被覆蓋。

## 驗證

```powershell
pnpm run verify
```

`verify` 會依序執行全部 Node 測試、lint 與 production build。

已套用 migration 且前後端正在執行時，可另跑：

```powershell
pnpm run smoke
```

冒煙測試會建立一次匿名測試帳號，驗證首頁、健康檢查、授權狀態保存、AI 記帳與讀回結果，最後清除該帳號的 App 狀態。
