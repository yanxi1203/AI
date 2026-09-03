@echo off
cd /d "%~dp0"
echo 正在啟動 AI 財務管家...
echo.
echo 網站啟動後，請在瀏覽器開啟： http://localhost:5173
echo 請保持這個視窗開啟，關閉後網站就會停止。
echo.
pnpm run dev
pause
