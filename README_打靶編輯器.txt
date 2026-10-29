ARMY3 打靶場景編輯器 v1.00

這包只有 2 個新增程式檔案，不會覆蓋現有手榴彈編輯器或手榴彈場景：
  shooting-scene-editor.html
  shooting-scene-editor.js

安裝：把檔案上傳到 Vmylife/ARMY3 儲存庫根目錄。

使用網址：
  https://vmylife.github.io/ARMY3/shooting-scene-editor.html

首次打開時：
  從網站現有 grenade-user-scene.json 複製軍營配置，
  移除全部 category=soldier 或 team=friend/enemy 的 NPC。
  現有原始資料共 534 件：12 棟建築 + 230 件道具 + 292 名士兵。
  因此初始打靶場景有 242 件物件、0 名士兵。
  所有原本的座標、旋轉、縮放、畫質、模型和碎裂模型路徑均保留。
  軍營地形使用原版地板產生程式。

編輯：與手榴彈場景編輯器相同，可移動、旋轉、縮放、複製、刪除、
       批次排列、切換高低模型、復原/重做、新增道具及建築。
       士兵模板仍可選擇，但初始場景完全無人物。

保存：修改會自動保存在目前瀏覽器（與手榴彈完全獨立）。
      請定期按「匯出打靶場景 JSON」，下載 shooting-user-scene.json。
      之後可以匯入同一編輯器，繼續設計。
      清除 Safari 網站資料會丟失尚未匯出的進度。

提醒：這是「地圖場景編輯器」，不是射擊遊戲玩法。
      建築的可破壞資料保留在 JSON；遊玩時的碎裂效果要由射擊遊戲連接此場景。
      「還原手榴彈底圖」會還原打靶預設場景（不動手榴彈），使用前請先匯出備份。

依賴：倚賴現有 grenade-scene-editor.js、grenade-scene-editor.css、
      grenade-user-scene.json、grenade-live-camp.js、3D GLB 與原軍營地形模組。
      不須重新上傳模型，亦不會複製大型資產。
