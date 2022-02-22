import {
    Intents,
    Client,
    Interaction,
    Guild,
} from 'discord.js';

import ytdl from 'ytdl-core';
import fs from 'fs';

import { MusicInfo } from './musicInfo';
import { Util } from './util';
import { Bucket } from './bucket';

const token = require('process').env.DiscordToken || require('./token.json').token;

const client: Client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
});

client.login(token);

client.once('ready', (client: any) => {
    console.log(`Logged in as ${client.user?.tag}!`);
});

// 游庭瑋：guild 就是指 discord 裡的一個群組(伺服器)
client.on('guildCreate', async (guild: Guild) => {
    console.log(`guild crated! ${guild.id}`);
    Util.registerCommand(guild);
});

client.on('error', (e: any) => {
    console.log('client on error', e);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    // 不是所有 interaction 都是 slash command
    if (!interaction.isCommand() || !interaction.guildId) return;
    let bucket = Bucket.find(interaction.guildId);
    
    if (interaction.commandName === 'attach') {
        Util.registerCommand(interaction.guild);
        if (bucket.connect(interaction)) {
            await interaction.reply(`☆歡迎使用 Music Start Pro! ${Util.randomHappy()} ☆`);
        } else {
            await interaction.reply(`attach 失敗${Util.randomCry()}，Music Start Pro 無法加入語音群。請確定您已經進入語音頻道。`);
        }
    } else if (interaction.commandName === 'bye') {
        bucket.player.pause();
        bucket.destroyConnection();
        await interaction.reply(`ㄅㄅ ${Util.randomHappy()}`);
    } else if (interaction.commandName === 'play') {
        await interaction.deferReply();
        const url = interaction.options.get('url')?.value as string;
        if (!ytdl.validateURL(url) && !ytdl.validateID(url)) {
            interaction.editReply(Util.createEmbedMessage('錯誤', `無該歌曲 ${Util.randomCry()}`, true));
            return;
        }
        const res = await ytdl.getInfo(url);
        const info = MusicInfo.fromDetails(res);

        // 1. enQueue
        if (info !== null) {
            bucket.queue.add(info);
            interaction.editReply(Util.createEmbedMessage('加入播放清單', info.title));
        } else {
            interaction.editReply(Util.createEmbedMessage('錯誤', `無該歌曲 ${Util.randomCry()}`, true));
        }

        // 2. play if the player is not playing
        if (!bucket.playing) {
            bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
        }
    } else if (interaction.commandName === 'pause') {
        if (bucket.player.pause()) {
            await interaction.reply('音樂已暫停 /resume 已繼續');
        } else {
            await interaction.reply(Util.createEmbedMessage('錯誤', '音樂暫停失敗，再試一次', true));
        }
    } else if (interaction.commandName === 'resume') {
        if (bucket.player.unpause()) {
            await interaction.reply('繼續播放');
        } else {
            await interaction.reply(Util.createEmbedMessage('錯誤', '繼續播放失敗，可使用 /jump 來重新播放', true));
        }
    } else if (interaction.commandName === 'stop') {
        bucket.player.pause();
        bucket.queue.jump(0);
        await interaction.reply('播放器已停止');
    } else if (interaction.commandName === 'list') {
        const list = bucket.queue.showList();
        await interaction.reply(Util.createEmbedMessage('播放清單', list));
    } else if (interaction.commandName === 'jump') {
        await interaction.deferReply();
        const index = interaction.options.get('index')?.value as number;
        bucket.queue.jump(index);
        bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
    } else if (interaction.commandName === 'remove') {
        const index = interaction.options.get('index')?.value as number;
        // if remove success
        if (bucket.queue.remove(index, bucket.playing)) {
            await interaction.reply(Util.createEmbedMessage('', `該曲移除成功 ${Util.randomHappy()}`));
        } else {
            await interaction.reply(Util.createEmbedMessage('錯誤', '正在播放不可移除 <(_ _)>', true));
        }
    } else if (interaction.commandName === 'clear') {
        if(bucket.playing){
            bucket.player.stop();
        }
        bucket.queue.removeAll();
        interaction.reply(`已清空播放清單!`);
    } else if (interaction.commandName === 'sort') {
        bucket.queue.sort();
        const list = bucket.queue.showList();
        await interaction.reply(Util.createEmbedMessage('播放清單', list));
    }else if (interaction.commandName === 'shuffle') {
        bucket.queue.shuffle();
        await interaction.reply(`已將播放清單打亂 ${Util.randomHappy()}`);
    } else if (interaction.commandName === 'next') {
        await interaction.deferReply();
        bucket.queue.next(1);
        bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
    } else if (interaction.commandName === 'pre') {
        await interaction.deferReply();
        bucket.queue.next(-1);
        bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
    } else if (interaction.commandName === 'vol') {
        await interaction.deferReply();
        if (interaction.options.get('num') === null) {
            interaction.editReply(`目前音量為：${bucket.volume}  ${Util.randomHappy()}`);
        } else {
            const vol = interaction.options.get('num')!.value as number;
            if (vol < 0 || vol > 1) {
                interaction.editReply('音量必需介於閉區間 [0, 1] <(_ _)>');
            } else {
                bucket.volume = vol;
                interaction.editReply(`音量已調整至：${vol} ${Util.randomHappy()}`);
            }
        }
    } else if (interaction.commandName === 'seek') {
        await interaction.deferReply();
        const time = interaction.options.get('time')?.value as string;
        let timePart = time.split(':');
        let secs = 0;
        for (let i = timePart.length - 1, j = 0; i >= 0; i--, j++) {
            secs += Number(timePart[i]) * (60 ** j);
        }

        bucket.play(bucket.queue.current, interaction, secs * 1000).then(() => {
            interaction.editReply('SEEK! (實驗功能)');
        }).catch(e => {
            interaction.editReply(Util.createEmbedMessage('錯誤', `${e}`, true));
        });
    } else if (interaction.commandName === 'help') {
        let content = fs.readFileSync('./help.md', {encoding:'utf-8', flag:'r'});
        await interaction.reply(Util.createEmbedMessage('Music Start Pro 小助手', content));
    } else if(interaction.commandName === 'json'){
        await interaction.deferReply();
        if (interaction.options.get('json') === null) {
            // output
            let url: Array<string> = [];
            bucket.queue.list.forEach((info: MusicInfo) => {
                url.push(info.url.replace('https://www.youtube.com/watch?v=', ''))
            });
            interaction.editReply('```\n' + JSON.stringify(url, null, '') + '\n```');
        }else{
            // input
            try {
                let list: Array<string> = JSON.parse(interaction.options.get('json')!.value as string);
                list.forEach(url => {
                    ytdl.getInfo(url).then(res => {
                        const info = MusicInfo.fromDetails(res);
                        if (info != null) {
                            bucket.queue.add(info);
                        }
                    });
                });
                interaction.editReply('新增至播放清單！');
            } catch (e) {
                interaction.editReply(Util.createEmbedMessage('錯誤', `${e}`, true));
            }
        }
    } else if (interaction.commandName === 'aqours') {
        let aqoursMusicList = require('../susume-list/aqours.json').list;
        aqoursMusicList.forEach((urlID: string)=>{
            ytdl.getInfo(urlID).then(res => {
                const info = MusicInfo.fromDetails(res);
                if (info != null) {
                    bucket.queue.add(info);
                }
            });
        })
        interaction.reply('Aqours sunshine!');
    }
})