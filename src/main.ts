import {
    Intents,
    Client,
    Interaction,
    Guild,
} from 'discord.js';

import ytdl from 'ytdl-core';
import { MusicInfo } from './musicInfo';
import { Util } from './util';
import { Bucket } from './bucket';

const { messages } = require('./language.json');
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
    // not all interactions are slash command
    if (!interaction.isCommand() || !interaction.guildId) return;
    let bucket = Bucket.find(interaction.guildId);
    
    if (interaction.commandName === 'attach') {
        Util.registerCommand(interaction.guild);
        if (bucket.connect(interaction)) {
            await interaction.reply(`☆${messages.hello[bucket.lang]} ${Util.randomHappy()} ☆`);
        } else {
            await interaction.reply(`${messages.attach_fail[bucket.lang]} ${Util.randomCry()}`);
        }
    } else if (interaction.commandName === 'bye') {
        bucket.player.pause();
        bucket.disconnect();
        await interaction.reply(`${messages.bye[bucket.lang]} ${Util.randomHappy()}`);
    } else if (interaction.commandName === 'play') {
        await interaction.deferReply();
        const url = interaction.options.get('url')?.value as string;
        if (!ytdl.validateURL(url) && !ytdl.validateID(url)) {
            interaction.editReply(Util.createEmbedMessage(messages.error[bucket.lang], 
                `${messages.song_is_not_found[bucket.lang]} ${Util.randomCry()}`, true));
            return;
        }
        const res = await ytdl.getInfo(url);
        const info = MusicInfo.fromDetails(res);

        // 1. enQueue
        if (info !== null) {
            bucket.queue.add(info);
            interaction.editReply(Util.createEmbedMessage(messages.appended_to_the_playlist[bucket.lang], info.title));
        } else {
            interaction.editReply(Util.createEmbedMessage(messages.error[bucket.lang], 
                `${messages.song_is_not_found[bucket.lang]} ${Util.randomCry()}`, true));
        }

        // 2. play if the player is not playing
        if (!bucket.playing) {
            bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
        }
    } else if (interaction.commandName === 'pause') {
        if (bucket.player.pause()) {
            await interaction.reply(messages.paused[bucket.lang]);
        } else {
            await interaction.reply(Util.createEmbedMessage(messages.error[bucket.lang], 
                `${messages.pause_error[bucket.lang]} ${Util.randomCry()}`, true));
        }
    } else if (interaction.commandName === 'resume') {
        if (bucket.player.unpause()) {
            await interaction.reply(messages.resume[bucket.lang]);
        } else {
            await interaction.reply(Util.createEmbedMessage(messages.error[bucket.lang],
                `${messages.resume_error[bucket.lang]} ${Util.randomCry()}`, true));
        }
    } else if (interaction.commandName === 'stop') {
        bucket.player.pause();
        bucket.queue.jump(0);
        await interaction.reply(messages.stopped[bucket.lang]);
    } else if (interaction.commandName === 'list') {
        const list = bucket.queue.showList(bucket.lang);
        await interaction.reply(Util.createEmbedMessage(messages.playlist[bucket.lang], list));
    } else if (interaction.commandName === 'jump') {
        await interaction.deferReply();
        const index = interaction.options.get('index')?.value as number;
        bucket.queue.jump(index);
        bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
    } else if (interaction.commandName === 'remove') {
        const index = interaction.options.get('index')?.value as number;
        // if remove success
        if (bucket.queue.remove(index, bucket.playing)) {
            await interaction.reply(Util.createEmbedMessage('', 
                `${messages.removed_successfully[bucket.lang]} ${Util.randomHappy()}`));
        } else {
            await interaction.reply(Util.createEmbedMessage(messages.error[bucket.lang], 
                `${messages.cannot_remove_the_playing_song[bucket.lang]} ${Util.randomCry()}`, true));
        }
    } else if (interaction.commandName === 'clear') {
        if(bucket.playing){
            bucket.player.stop();
        }
        bucket.queue.removeAll();
        await interaction.reply(messages.playlist_is_reset[bucket.lang]);
    } else if (interaction.commandName === 'sort') {
        bucket.queue.sort();
        const list = bucket.queue.showList(bucket.lang);
        await interaction.reply(Util.createEmbedMessage(messages.playlist[bucket.lang], list));
    }else if (interaction.commandName === 'shuffle') {
        bucket.queue.shuffle();
        await interaction.reply(`${messages.is_shuffled[bucket.lang]} ${Util.randomHappy()}`);
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
        if (interaction.options.get('volume') === null) {
            interaction.editReply(`${messages.current_volume[bucket.lang]}${bucket.volume}  ${Util.randomHappy()}`);
        } else {
            const vol = interaction.options.get('volume')!.value as number;
            if (vol < 0 || vol > 1) {
                interaction.editReply(`${messages.volume_format_error[bucket.lang]} ${Util.randomCry()}`);
            } else {
                bucket.volume = vol;
                interaction.editReply(`${messages.volume_is_changed_to[bucket.lang]} ${vol} ${Util.randomHappy()}`);
            }
        }
    } else if (interaction.commandName === 'seek') {
        await interaction.reply('deprecated command');
        /*await interaction.deferReply();
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
        */
    } else if (interaction.commandName === 'help') {
        await interaction.reply('deprecated command');
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
                interaction.editReply(messages.appended_to_the_playlist[bucket.lang]);
            } catch (e) {
                interaction.editReply(Util.createEmbedMessage('Error', `${e}`, true));
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
    } else if (interaction.commandName === 'lang') {
        let lang : string = interaction.options.get('language')?.value as string
        if (['zh', 'en'].includes(lang)){
            bucket.lang = lang;
            await interaction.reply(messages.language_changed_successfully[bucket.lang]);
        }
        await interaction.reply("Should be either zh or en!");
    }
})