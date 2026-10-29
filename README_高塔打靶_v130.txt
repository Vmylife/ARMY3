《國軍當兵模擬器》高塔狙擊 v1.30
--------------------------------
使用方式：將 ZIP 解壓後，將以下檔案保持原有資料夾結構，上傳至 Vmylife/ARMY3 的儲存庫根目錄：

  shooting-range.html
  shooting-range.css
  shooting-range.js
  shooting-range-world.js
  shooting-user-scene.json
  assets/shooting/watchtower.glb

注意：不用覆蓋／修改 grenade-user-play-3d.js、棉被遊戲或手榴彈原始遊戲檔。
本版依賴 ARMY3/main 已有的：
  grenade-user-play-3d.js
  src/core/glb111.js
  src/characters/rigAnimator.js
  src/training/rifleRenderer.js
  assets/weapons/rifle.glb
  assets/characters/cadet/cadet-green.glb
  既有場景建築、道具、碎裂 GLB、地面、槍聲與爆炸聲。

網站頁面：
https://vmylife.github.io/ARMY3/shooting-range.html

場景：
  原使用者 272 個場景物件保留，42 個原桶子仍在原座標，新增 3D GLB 高塔 1 座。
  塔位置 X=41.76, Z=33.36；塔頂平台高度約 11.75m，眼位高度 13.42m。
  開始後 150 綠軍 + 50 紅軍在軍營內跑動，簡化路徑避障、跑步動畫 GPU 批次化。

控制：
  左右／上下滑動移動視角，上滑抬槍、下滑壓槍；開鏡 2.4 倍；按住射擊連發。
  20 發彈匣；換彈；45 秒結算；紅桶中彈爆炸、連鎖爆炸、友軍誤傷。
  射擊和計分用遊戲獨立判定，破壞／爆炸畫面使用原本 ARMY3 WebGL 模型管線。

驗證狀態：
  1. 已通過 node --check 的兩份 JS 語法檢查。
  2. 已在 Chromium 模擬行動裝置執行獨立遊戲邏輯與 UI：可開始、NPC=200、桶=42、換鏡、射擊扣彈、引爆與結算，無 JS page errors。
  3. 已檢查與 GitHub 原版 grenade-user-play-3d.js 的關鍵程式碼替換點相符，並對高塔 GLB 進行幾何／材質結構檢查。
  4. 尚未在真實 GitHub Pages 中載入完整軍營 GLB，也尚未以 iPhone Safari 測幀率、記憶體或動畫實際畫面；切勿將這些項目宣稱已通過。
  5. 如果 GitHub 的原版 WebGL 檔更新後不相容，載入頁會明確顯示相容性錯誤，不會假裝轉成 2D 軍營。

尚待實機關注：
  200 人同時跑動是否掉幀、狙擊槍實體手持位置是否符合視角、建築遮擋、
  爆炸鏈式破壞與原版物理兼容性，手機長時間重新遊玩是否發熱。
