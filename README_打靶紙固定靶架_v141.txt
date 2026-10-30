ARMY3 步槍打靶紙 v1.41｜靶紙固定靶架修正版

本 ZIP 僅有 3 個需要覆蓋的程式檔案＋說明。
上傳到 Vmylife/ARMY3 儲存庫根目錄，覆蓋同名檔案：
- shooting-paper-range.html
- shooting-paper.js
- shooting-paper-world.js

既有檔案保持不動：shooting-paper-scene.json、shooting-paper.css、其他小遊戲。

修改內容：
1. 移除用獨立 2D 畫布假裝固定在靶架上的紙張；改為軍營原版 WebGL2 場景中的 3D 紙張平面。
2. 紙張固定於唯一靶架（X=12.30, Z=22.15）前方 Z=21.68，中心高度 Y=0.97，完整貼在靶架的近側邊界內。
3. 靶紙與靶架使用同一個 view-projection 矩陣、深度測試，鏡頭轉動不會相對飄移。
4. 修正原本 2D 投影和遊戲 3D 鏡頭的水平座標手性不一致，使瞄準、命中和彈孔一致。
5. 保留開鏡 2.4×、呼吸晃動、20 發連射、手機拖曳、射偏不顯示彈孔、收靶紙結算與重玩。
6. 靶紙紋理只在彈孔資料改變時更新，不會每一影格重建或上傳。

部署後測試網址：https://vmylife.github.io/ARMY3/shooting-paper-range.html?v=141

驗證範圍：Node.js 語法檢查、鏡頭 2D/3D 投影數學一致性檢查、Chromium 互動模擬（命中、射偏、結算）通過。
限制：目前工具環境無法啟動 WebGL2，因此未完成整張 ARMY3 GLB 場景的視覺及 iPhone Safari 真機驗證。請上傳後檢查靶紙與靶架的實際貼合位置。
