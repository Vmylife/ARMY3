《國軍當兵模擬器》高塔狙擊 v1.31 修復包
日期：2026-10-30

只包含 5 個需要覆蓋的檔案（不覆蓋場景 JSON、士兵、成就、手榴彈及棉被）：
  shooting-range.html
  shooting-range.css
  shooting-range.js
  shooting-range-world.js
  assets/shooting/watchtower.glb

v1.31 修復：
1. 3D 槍枝渲染 gl.drawElements() 補齊第四參數 offset=0，修復電腦 Console 的 TypeError。
   槍枝的可選繪製另外加 try/catch，避免錯誤再次讓整個 3D 場景永久停格。
2. 手機／電腦拖曳改為全視窗接收 move/up，保留從透明畫布開始拖曳。
   上滑槍口抬高，下滑下降；提高拖曳靈敏度，開鏡後降低靈敏度。
3. 高塔 GLB 重建為開放式四角支柱平台，取消原本正中央和視線前方的巨柱／橫杆。
4. NPC 的模擬移動原本正常，但 3D 渲染器因第一項錯誤停格，造成 NPC 看起來完全不動；
   v1.31 讓 3D 場景繼續刷新、與 NPC 的即時座標同步。

測試：
- JavaScript node --check 靜態語法檢查通過。
- headless Chromium (模擬控制器／載入單獨 JSON、替代 3D 橋接)：200 名 NPC 建立，
  42 紅桶，20/20 抽查人物位移，手機 pointer drag 變更 yaw/pitch，2.4x zoom、結算正常，沒有 pageerror。
- watchtower.glb 結構驗證：單一 mesh / 單一 primitive，與原版渲染器的 glTF 讀取方式相容。

限制：未用完整原版 GLB 軍營在 iPhone Safari 實機測試，尚未確認真機效能／鏡頭、動作與碰撞完全正常。

安裝：解壓縮後把上述 5 個檔案依同一路徑上傳至 Vmylife/ARMY3 根目錄並覆蓋。
（建議先保留原版，沒有其他功能需要上傳，不要把整個資料夾作為子資料夾。）
更新後請以 https://vmylife.github.io/ARMY3/shooting-range.html?v=131 驗證。
