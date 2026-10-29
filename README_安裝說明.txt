ARMY3 棉被鑑測結算 + 38 項成就 v1.80（包含上一版小遊戲配樂 v1.70）

1. 將本 ZIP 解壓縮到 Vmylife/ARMY3 專案根目錄，保留路徑，覆蓋同名檔案。
2. 只需要覆蓋更新：無需替換 blanket-stack.js、3D 物件或場景 JSON。
3. 此包整合上一版 v1.70 的棉被/手榴彈 BGM、v1.61 棉被碰撞聲+PERFECT叮聲與收拾得分聲。
4. 新增三輪結算深綠報告 UI、分數稱號、班長講評、38 項永久成就圖鑑（含隱藏成就）。
5. 成就只由真實三輪統計觸發，資料保存在 localStorage: ARMY3_blanket_achievements_v1。
6. 原始分數公式、塌塔判定、NPC/建築/地雷及所有物理均未修改。
7. 若 GitHub Pages 快取舊版，請使用 Ctrl+F5 強制重新整理或手機瀏覽器清除該站點快取。

更新清單：
blanket-stack.html
src/systems/blanketAchievements.js （新增）
src/systems/blanketSfx.js
src/systems/minigameBgm.js
src/systems/grenadeWorkshopSfx.js
grenade-score.js
assets/audio/minigames/blanket-parade-loop.mp3
assets/audio/minigames/grenade-ordnance-loop.mp3
assets/audio/blanket/blanket_perfect_ding.mp3

附註：本包為測試後的整合差分檔，不會直接推送 GitHub。重製僅在此 ZIP 覆蓋的檔案。
