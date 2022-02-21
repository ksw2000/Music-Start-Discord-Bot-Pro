## 斜線指令集

1. `/attach` 將 Music Start Pro 加入您目前所在的語音房中，另外，當 Music Start Pro 更新新的指令時，可刷新指令集
2. `/bye` 將 Music Start 踢出語音房
3. `/play [url]` 播放音樂，若音樂正在播放，則會加入播放清單。若 Music Start Pro 不在語音房中，則會自動呼叫 `/attach` 加入您目前所在的語音房
4. `/pause` 暫停或播放
5. `/stop` 停止播放，但不會將 Music Start Pro 踢出語音房
6. `/list` 列出播放清單
7. `/jump [index]` 指定跳到播放清單的某一首歌
8. `/remove [index]` 指定刪除播放清單的某一首歌
9. `/clear` 清空播放清單
10. `/sort` 按照名稱排序播放清單
10. `/shuffle` 將播放清單隨機打亂，正在播放的歌位置不會受影響
11. `/next` 播放下一首
12. `/pre` 播放前一首
13. `/vol [num?]` 設定音量 num 介於 [0, 1] 間，若不指定 num 則會顯示目前的音量，預設為 0.64
14. `/seek [time]` 跳到歌曲的某個時間點，time 的單位為秒。該功能仍在實驗階段！
15. `/json [json?]` 以 json 格示批次輸入歌曲，若不指定 json，會將播放清單以 json 格式輸出。

## 參數說明

1. **url** 目前僅支援 youtube 的網址
2. **index** index 為播放清單的編號，由 0 開始，若 index 為負數則由清單最末尾開始計數，也就是說 -1 表示清單最後一首，若數字超過播放清單長度，則系統會啟用溢位
3. **time** 該參數如果指定為 `1` 就代表 1 秒，指定為 `1:1` 就代表 61 秒，指定為 `1:1:1` 就代表 3661 秒。也就是說 `:` 是 60 進位的分割符。

https://github.com/liao2000/Music-Start-Discord-Bot-PRO