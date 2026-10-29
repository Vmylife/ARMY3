ARMY3 v3.22 — 手榴彈成就圖鑑觸控修正
================================

直接把 src 資料夾內檔案照原本路徑覆蓋至 Vmylife/ARMY3 根目錄。
此更新不會更動成就解鎖紀錄、手榴彈製作規則、投擲物理、NPC、背景音樂或音量設定。

修復：
1. 手榴彈製作頁面的 18 張成就卡可點擊並開啟詳細說明（已解鎖與未解鎖分別顯示）。
2. 圖鑑在 iPhone 上恢復正常的上下滑動；不會被提前載入的 3D iframe 遮擋或截走觸控。
3. 圖鑑上方新增「✕ 關閉」按鈕，不用滑到底才能離開。
4. 詳細成就彈窗支援「返回成就圖鑑」、點背景關閉與鍵盤 Escape。
5. 更新模組版本參數，避免部分舊程式持續被瀏覽器快取。
6. 一併補入前一版 v3.21 的「確認敵方位置」模組（當前 GitHub 分支缺少該檔）。

檔案：
 src/systems/grenadeGalleryFix.js         新增，圖鑑互動修正主程式
 src/systems/grenadeEarlyAudio.js          從製作頁背景預熱時立即安裝圖鑑修正
 src/systems/grenadeArenaSfx.js            投擲場載入時也安裝圖鑑修正
 src/systems/grenadeWorkshopSfx.js         更新投擲場音效引用版本
 src/systems/campGameWarmup.js             更新預載模組版本
 src/systems/grenadeEnemyReview.js         補上前次確認敵方位置的必要檔案

已檢查 JavaScript 語法與依賴檔案，使用 Chromium 模擬手機觸控實測滑動和開關成就詳情。
仍未在使用者實際 iPhone 上驗證。
