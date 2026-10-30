ARMY3 步槍紙靶 v1.43 — 等速不規則呼吸更新

本次僅修改兩個檔案，將這兩個檔案放到 Vmylife/ARMY3 根目錄覆蓋：
  shooting-paper-range.html
  shooting-paper.js

修正內容：
- 呼吸持續以固定速率移動，取消原先隨機加速、減速與停止等待。
- 運動方向持續以平滑、非週期性方式改變；靠近活動範圍邊緣會轉回，避免卡在邊界停住。
- 保留 0~100% 呼吸強度滑桿與設定儲存。0% 完全靜止，100% 仍然非常誇張。
- 不改靶紙 3D 固定方式、彈孔座標、槍口準星頂部命中判定、射擊或結算流程。
- 保留 shooting-paper-world.js 和 shooting-paper.css v1.42，不需覆蓋。

測試：node --check 通過；離線模擬連續 15,000 個影格（60fps 約 250 秒）證實在 100% 強度下每影格位移相同，方向隨機轉變，0% 靜止，恢復後繼續運動。
尚未做 iPhone Safari 真機測試。

更新後網址：https://vmylife.github.io/ARMY3/shooting-paper-range.html?v=143
