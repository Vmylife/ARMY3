《國軍當兵模擬器》高塔打靶 v1.32｜步槍機械瞄具與左右操作修正
日期：2026-10-30

上傳方式：解壓後只覆蓋以下 4 個檔案到 Vmylife/ARMY3 根目錄：
  shooting-range.html
  shooting-range.css
  shooting-range.js
  shooting-range-world.js

不要上傳 README_v132.txt；不需要重傳 shooting-user-scene.json、高塔 GLB、NPC 模型或其他遊戲檔案。

更新內容：
- 水平滑動方向反轉，修復 v1.31 左右鏡像；垂直滑動方向不變。
- 移除 HTML 十字準心及黃色圓點，改為仿參考圖的機械瞄具：圓形照門、兩側護翼和中央柱狀準星。
- 視野中心柱頂就是實際命中點。呼吸位移與子彈命中位置同步。
- 保留步槍 GLB 並將槍移至接近中心瞄準姿勢，呼吸時同步微晃；開鏡 2.4 倍模式仍可使用。
- 保留 150 友軍、50 紅軍、42 個紅桶、可破壞軍營、結算與原先遊戲流程。
- 新版 CSS / JS 引用已更新為 v=132，避免瀏覽器快取讀到舊版。

自動驗證：
- Node.js --check 語法檢查完成。
- Chromium 模擬 WebGL 橋接測試：右滑 yaw 減少、上滑 pitch 增加、200 NPC、42 barrels、2.4× 縮放、結算與 HUD 顯示通過。
- Chromium 手機尺寸（390×844）截圖檢查瞄具視覺；渲染使用假背景，不是原版完整 GLB 軍營。

尚未完成：完整 GLB 軍營/原版步槍的 3D 實畫面及 iPhone Safari 實機驗證。

測試網址： https://vmylife.github.io/ARMY3/shooting-range.html?v=132
