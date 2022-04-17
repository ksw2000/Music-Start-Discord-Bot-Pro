import {
    Intents,
    Client,
    Interaction,
    Guild,
    MessageComponent,
    MessageComponentInteraction,
} from 'discord.js';

import ytdl from 'ytdl-core';
import { MusicInfo } from './musicInfo';
import { Util } from './util';
import { Bucket } from './bucket';
import 'process';
import { messages } from './language.json';

let token = process.env.DiscordToken || require('./token.json').token;
interface langMap {
    [key: string]: string;
}

process.argv.forEach(function (val, index) {
    if (val == 'beta') {
        token = require('./token.json').betaToken;
    }
});

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
    try {
        if (interaction.commandName === 'attach') {
            Util.registerCommand(interaction.guild, bucket?.lang);
            if (bucket.connect(interaction)) {
                await interaction.reply(`☆${(messages.hello as langMap)[bucket.lang]} ${Util.randomHappy()} ☆`);
            } else {
                await interaction.reply(`${(messages.attach_fail as langMap)[bucket.lang]} ${Util.randomCry()}`);
            }
        } else if (interaction.commandName === 'bye') {
            bucket.player.pause();
            bucket.disconnect();
            await interaction.reply(`${(messages.bye as langMap)[bucket.lang]} ${Util.randomHappy()}`);
        } else if (interaction.commandName === 'play') {
            await interaction.deferReply();
            const url = interaction.options.get('url')?.value as string;
            if (!ytdl.validateURL(url) && !ytdl.validateID(url)) {
                interaction.editReply(Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                    `${(messages.song_is_not_found as langMap)[bucket.lang]} ${Util.randomCry()}`, true));
                return;
            }
            const res = await ytdl.getInfo(url);
            const info = MusicInfo.fromDetails(res);

            // 1. enQueue
            if (info !== null) {
                bucket.queue.add(info);
                interaction.editReply(Util.createEmbedMessage((messages.appended_to_the_playlist as langMap)[bucket.lang], info.title));
            } else {
                interaction.editReply(Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                    `${(messages.song_is_not_found as langMap)[bucket.lang]} ${Util.randomCry()}`, true));
            }

            // 2. play if the player is not playing
            if (!bucket.playing) {
                await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
            }
        } else if (interaction.commandName === 'pause') {
            if (bucket.player.pause()) {
                await interaction.reply((messages.paused as langMap)[bucket.lang]);
            } else {
                await interaction.reply(Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                    `${(messages.pause_error as langMap)[bucket.lang]} ${Util.randomCry()}`, true));
            }
        } else if (interaction.commandName === 'resume') {
            if (bucket.player.unpause()) {
                await interaction.reply((messages.resume as langMap)[bucket.lang]);
            } else {
                await interaction.reply(Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                    `${(messages.resume_error as langMap)[bucket.lang]} ${Util.randomCry()}`, true));
            }
        } else if (interaction.commandName === 'stop') {
            bucket.player.pause();
            bucket.queue.jump(0);
            await interaction.reply((messages.stopped as langMap)[bucket.lang]);
        } else if (interaction.commandName === 'list') {
            await interaction.reply(bucket.queue.showList(bucket.lang, interaction));
        } else if (interaction.commandName === 'distinct') {
            // remove duplicate songs and show list
            bucket.queue.removeDuplicate();
            await interaction.reply(bucket.queue.showList(bucket.lang, interaction));
        } else if (interaction.commandName === 'jump') {
            await interaction.deferReply();
            const index = interaction.options.get('index')?.value as number;
            bucket.queue.jump(index);
            await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
        } else if (interaction.commandName === 'swap') {
            const index1 = interaction.options.get('index1')?.value as number;
            const index2 = interaction.options.get('index2')?.value as number;
            bucket.queue.swap(index1, index2);
            await interaction.reply("Done!");
        } else if (interaction.commandName === 'remove') {
            const index = interaction.options.get('index')?.value as number;
            // if remove success
            if (bucket.queue.remove(index, bucket.playing)) {
                await interaction.reply(Util.createEmbedMessage('',
                    `${(messages.removed_successfully as langMap)[bucket.lang]} ${Util.randomHappy()}`));
            } else {
                await interaction.reply(Util.createEmbedMessage((messages.error as langMap)[bucket.lang],
                    `${(messages.cannot_remove_the_playing_song as langMap)[bucket.lang]} ${Util.randomCry()}`, true));
            }
        } else if (interaction.commandName === 'clear') {
            if (bucket.playing) {
                bucket.player.stop();
            }
            bucket.queue.removeAll();
            await interaction.reply((messages.playlist_is_reset as langMap)[bucket.lang]);
        } else if (interaction.commandName === 'sort') {
            bucket.queue.sort();
            await interaction.reply(`${(messages.is_sorted as langMap)[bucket.lang]} ${Util.randomHappy()}`);
        } else if (interaction.commandName === 'shuffle') {
            bucket.queue.shuffle();
            await interaction.reply(`${(messages.is_shuffled as langMap)[bucket.lang]} ${Util.randomHappy()}`);
        } else if (interaction.commandName === 'next') {
            await interaction.deferReply();
            bucket.queue.next(1);
            await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
        } else if (interaction.commandName === 'pre') {
            await interaction.deferReply();
            bucket.queue.next(-1);
            await bucket.playAndEditReplyDefault(bucket.queue.current, interaction);
        } else if (interaction.commandName === 'vol') {
            await interaction.deferReply();
            if (interaction.options.get('volume') === null) {
                interaction.editReply(`${(messages.current_volume as langMap)[bucket.lang]}${bucket.volume}  ${Util.randomHappy()}`);
            } else {
                const vol = interaction.options.get('volume')!.value as number;
                if (vol < 0 || vol > 1) {
                    interaction.editReply(`${(messages.volume_format_error as langMap)[bucket.lang]} ${Util.randomCry()}`);
                } else {
                    bucket.volume = vol;
                    interaction.editReply(`${(messages.volume_is_changed_to as langMap)[bucket.lang]} ${vol} ${Util.randomHappy()}`);
                }
            }
        } else if (interaction.commandName === 'json') {
            await interaction.deferReply();
            if (interaction.options.get('json') === null) {
                // read mode
                let url: Array<string> = [];
                bucket.queue.list.forEach((info: MusicInfo) => {
                    url.push(info.url.replace('https://www.youtube.com/watch?v=', ''))
                });
                interaction.editReply('```\n' + JSON.stringify(url, null, '') + '\n```');
            } else {
                // write mode
                interaction.editReply('Adding ... (please wait a second)');
                let list: Array<string> = JSON.parse(interaction.options.get('json')!.value as string);
                let task: Array<Promise<MusicInfo | null>> = [];
                list.forEach(async (urlID: string) => {
                    task.push(new Promise<MusicInfo | null>((resolve, reject) => {
                        ytdl.getInfo(urlID).then(res => {
                            resolve(MusicInfo.fromDetails(res));
                        }).catch(reject);
                    }));
                });
                Promise.all(task).then(infoList => {
                    infoList.forEach(info => {
                        if (info != null) {
                            bucket.queue.add(info);
                        }
                    });
                    interaction.editReply((messages.appended_to_the_playlist as langMap)[bucket.lang]);
                }).catch(e => {
                    interaction.editReply(Util.createEmbedMessage('Error', `${e}`, true));
                });
            }
        } else if (interaction.commandName === 'aqours' || interaction.commandName === 'muse') {
            // fetch recommend music list
            let recommendMusicList = require('../susume-list/' + interaction.commandName + '.json').list;
            
            // set interaction message
            let reply: string = "";
            let deferReply: string = "";
            if (interaction.commandName === 'aqours'){
                reply = 'Aqours... (please wait a second)';
                deferReply = 'Aqours sunshine!';
            }else if(interaction.commandName === 'muse'){
                reply = "μ's... (please wait a second)";
                deferReply = "μ's MUSIC START!";
            }
            
            // interact to the guild and fetch music infos on Youtube
            interaction.reply(reply);
            let task: Array<Promise<MusicInfo | null>> = [];
            recommendMusicList.forEach(async (urlID: string) => {
                task.push(new Promise<MusicInfo | null>((resolve, reject) => {
                    ytdl.getInfo(urlID).then(res => {
                        resolve(MusicInfo.fromDetails(res));
                    }).catch(reject);
                }));
            });
            Promise.all(task).then(infoList => {
                infoList.forEach(info => {
                    if (info != null) {
                        bucket.queue.add(info);
                    }
                });
                interaction.editReply(deferReply);
            }).catch(e => {
                interaction.editReply(Util.createEmbedMessage('Error', `${e}`, true));
            });
        } else if (interaction.commandName === 'lang') {
            let lang: string = interaction.options.get('language')?.value as string
            if (['zh', 'en'].includes(lang)) {
                bucket.lang = lang;
                await interaction.reply((messages.language_changed_successfully as langMap)[bucket.lang]);
            } else {
                await interaction.reply("Should be either zh or en!");
            }
        } else {
            await interaction.reply("Command not found");
        }
    } catch (e) {
        console.error("main.ts big try-catch", e);
    }
})