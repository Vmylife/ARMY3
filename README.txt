ARMY3 補丁：手榴彈 B 版咻聲／脫手同步／音量調整

差分更新：只上傳 ZIP 內的 6 個程式/音效檔案（請保留目錄）。
從 Github 當前正式版本製作，無需重傳以前的背景音樂或模型。

變更：
1. 手榴彈投擲音效使用 B_Long_Slide_Whistle 卡通滑音；飛行聲音量 .73 -> .38（約 -5.7 dB，原始音樂不重新混音）。
2. 按下投擲鍵後先等待角色轉身和揮臂；只有 world.flight 存在且 world.camPhase==='flight' (launchFlight/右手真正脫手) 才播放。
3. 不改角色揮臂動畫、手榴彈物理、鏡頭或落地／爆炸事件。
4. 主軍營 BGM 音量 .27 -> .15（約 -5.1 dB）；主頁音樂模組版本改 v002 避免舊快取。
5. 只更新手榴彈音效模組的載入版本，不改充填、壓實、轉輪、計分、NPC 打靶槍聲。

覆蓋路徑：
index.html
src/systems/campBgm.js
src/systems/grenadeArenaSfx.js
src/systems/grenadeWorkshopSfx.js
grenade-score.js
assets/audio/grenade/flight_cartoon_B_long.mp3

提示：若 GitHub Pages 在手機仍播放舊聲音，請重新整理或清除網頁快取。瀏覽器不允許自動音訊時，首次點擊畫面解鎖音效。
