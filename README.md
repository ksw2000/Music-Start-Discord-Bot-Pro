# Music Start Pro

![](https://img.shields.io/github/license/liao2000/Music-Start-Discord-Bot-Pro?style=flat-square) ![](https://img.shields.io/github/stars/liao2000/Music-Start-Discord-Bot-Pro?style=flat-square) ![](https://img.shields.io/github/issues/liao2000/Music-Start-Discord-Bot-Pro?color=yellow&style=flat-square) [![](https://img.shields.io/discord/864220336841162756?style=flat-square)](https://discord.gg/qQM9avGy2R)

![](https://i.imgur.com/I1cH4Uc.png)

Music Start Pro is a discord bot that can play YouTube music. Besides, this version supports slash command.

The older version without supporting slash command (Traditional Chinese): [Music Start](https://github.com/liao2000/Music-Start-Discord-Bot)

+ [Click to invite bot to your guild.](https://discord.com/api/oauth2/authorize?client_id=889377515225886800&permissions=8&scope=bot%20applications.commands) Notice that this server is not stable.
+ [Join Discord server.](https://discord.gg/qQM9avGy2R)

## Feature

+ `/attach` 
  + Attach MS Pro to the voice channel where you are. Thus, you must join in the voice cannel first.
  + At the same time, the command fetch the new instructions set if updated.
  + You can detach the MS Pro by `/detach`.
  + If you move the MS Pro to another voice channel, please type `/attach` again after move.
+ `/append [youtube-url]`
  + Append the song into the playlist by given YouTube URL.
  + You can just input the video id. That is, if you want to play `https://www.youtube.com/watch?v=Qj0Dmwxv-KY`, you can just `/append Qj0Dmwxv-KY`
+ `/lang [code]`
  + Now support `en` and `zh`
  + en: English
  + zh: Traditional Chinese
+ Playlist
  + `/list` Show the playlist.
  + `/swap [idx1] [idx2]`Swap 2 song by index number.
  + `/remove [idx]`Remove song by index number.
  + `/clear` Remove all songs.
  + `/sort` Sort the playlist in alphabetical order. 
  + `/shuffle` Shuffle the playlist.
  + `/distinct` Remove duplicate songs.
+ Player control
  + `/jump [idx]` Jump to a song in the playlist by given index.
  + `/pre` Play the previous song.
  + `/next` Play the next song.
  + `/vol` Show the volume.
  + `/vol [number]` Set the volume, where number is in [0, 1]
  + `/pause`, `/resume`, `/stop`
+ Batch Operation
  + `/json` Output the playlist by json format
  + `/json [json-string]` Add a batch of songs by given a json string
  + `/aqours` Append Aqours' songs that author recommends into playlist.
  + `/muse` Append some μ's' songs into playlist.
  + `/nijigasaki` Append some 虹ヶ咲's songs into playlist.
  + `/liella` Append some Liella' songs into playlist.
+ General index number
  + The index is start at 0
  + Negative number -1 stands for the last song
  + Support overflow, e.g., we have 16 songs
    + The first song 0 = 16
    + The second song 1 = 17
    + The last song 15 = 31 = -1 

![](https://i.imgur.com/5B3tNMQ.png)

## Develop

### STEP 1 Set Environment

+ node: 17.5.0
+ npm: 8.4.1

```sh
# initialize by npm
npm install

# install ffmpeg
npm i ffmpeg-static
```

### STEP 2 Create Discord Application ID

https://discord.com/developers/docs/intro

Create a new file at `src/token.js`.

```js
{
    "token": "[Your-Discord-Bot-Token]",
    "betaToken": "[(optional, for debug) Your-Another-Discord-Bot-Token]"
}
```

### STEP 3 Run

```sh
npm start
```

> If you develop your discord bot in Linux, you can run `./build.sh` to build environment. Besides, you can run `./deploy.sh` which kills previous running process and deploys the new one.

### STEP 4 Add Bot to Your Guild.

```
https://discord.com/api/oauth2/authorize?client_id=[YOUR-CLIENT-ID]&permissions=8&scope=bot%20applications.commands
```

### STEP 5 Debug

If you have run the bot on one server, you can run another bot on local for testing.

```sh
npm run beta
```

### Pull Request

Before pull requesting, please use lint to format code.

```sh
npm run lint
``` 