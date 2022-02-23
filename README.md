# Music Start Pro

![](https://img.shields.io/github/license/liao2000/Music-Start-Discord-Bot-Pro?style=flat-square) ![](https://img.shields.io/github/stars/liao2000/Music-Start-Discord-Bot-Pro?style=flat-square) ![](https://img.shields.io/github/issues/liao2000/Music-Start-Discord-Bot-Pro?color=yellow&style=flat-square)

![](https://i.imgur.com/I1cH4Uc.png)

Music Start Pro is a discord bot that can play YouTube music. Besides, this version supports slash command.

[Click to invite bot to your guild.](https://discord.com/api/oauth2/authorize?client_id=889377515225886800&permissions=8&scope=bot%20applications.commands)

The older version without supporting slash command (Traditional Chinese): [Music Start](https://github.com/liao2000/Music-Start-Discord-Bot)

## How to develop?

### STEP1 Set environment

+ node: 17.5.0
+ npm: 8.4.1

```sh
# initialize by npm
npm install

# install ffmpeg
npm i ffmpeg-static
```

### STEP2 Create Discord Application ID

https://discord.com/developers/docs/intro

Create a new file at `src/token.js`.

```js
{
    "token": "[Your-discord-bot-token]"
}
```

### STEP3 Run

```sh
npm start
```

> If you develop your discord bot in Linux, you can run `./build.sh` to build environment. Besides, you can run `./deploy.sh` which kills previous running process and deploys the new one.

### STEP 4 Add bot to your guild.

```
https://discord.com/api/oauth2/authorize?client_id=[YOUR-CLIENT-ID]&permissions=8&scope=bot%20applications.commands
```