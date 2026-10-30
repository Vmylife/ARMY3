ARMY3 步槍紙靶 v1.44＋主遊戲試玩按鈕移除

修改內容：
1. 首頁及軍營右側的「試玩打靶」按鈕移除：src/systems/shootingRangeLauncher.js 改成停用舊測試入口。
2. 打靶紙遊戲固定呼吸 70%，取消呼吸設定 UI 與 localStorage 調整。
3. 子彈 10 發，按一次只打一槍；按住不連射，空白鍵長按不連射。
4. 靶前跑動的 20 位綠色士兵：使用既有 cadet GLB 高畫質共用跑步骨架動畫與 GPU instancing。NPC 在原射擊位置和靶架之間移動。
5. NPC 會擋住彈道：若射到 NPC，該發不能穿透在紙靶留下彈孔；結算顯示誤傷友軍數。未改動原場景 JSON。

安裝：解壓縮後依資料夾結構將 5 個檔案覆蓋到 Vmylife/ARMY3，無需覆蓋場景 JSON、其他小遊戲檔案。
入口：shooting-paper-range.html?v=144
注意：網頁可能快取舊版 shootingRangeLauncher.js?v=100，重開分頁或清除網站快取即可。
測試：Node --check、遊戲邏輯單元模擬、素材載入依正式 ARMY3 現有環境，iPhone Safari 尚未實際跑 3D 真機。
