# Music-Start-PRO

Music Start Pro 是一個可以於 Discord 語音頻道播放 YouTube 音樂的 Discord 機器人，並且支援 slash command

## 將機器人加入至 Discord 群組

https://discord.com/api/oauth2/authorize?client_id=889377515225886800&permissions=8&scope=bot%20applications.commands

## 開發方法

### STEP1 安裝相關軟體

+ node: 17.5.0
+ npm: 8.4.1

```sh
# 使用 npm install 做初始化
npm install

# 安裝 ffmpeg
npm i ffmpeg-static
```

### STEP2 申請 Discord Application

申請 Application 後複製 APP 的 Token，並於根目錄新增 `src/token.js`

```js
{
    "token": "你的TOKEN"
}
```

+ /
  + node_modules/
  + src/
    + main.ts
    + **token.json**
    + ...其他
  + ... 其他

### STEP3 啟動

```sh
npm start
```

### 其他實用腳本

如果你在 Linux 環境開發，可以直接呼叫 `build.sh` 做環境建置。另外，開發完成後可以呼叫 `deploy.sh` 這個腳本會自動於背景運行 `discord.ts`，若前一次的程式仍在運行，`deploy.sh`會先 kill 掉先前的程式，才做佈署

## 為什麼叫 Music Start Pro?

因為 µ's 上台前都會喊 "Music ~ start"，pro 的來源在於該版本提供 slash command 來操作，相較於舊版的 [Music Start](https://github.com/liao2000/Music-Start-Discord-Bot) 操作上更為簡單！